import Icon from '../../components/Icon';
import {
  buildRelationshipIndex,
  getSafeProviderUrl,
  RESOURCE_LABELS,
  sanitizeIntegrationMetadata,
  SOURCE_LABELS,
} from '../../modules/integrations';

const formatKey = (value) => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None recorded';
  if (typeof value === 'object') return 'Structured metadata';
  return String(value);
};

const actionLabelsByType = {
  account: { graph: 'View account graph', activity: 'Account activity' },
  repository: { graph: 'Trace ownership', activity: 'Repository activity' },
  project: { graph: 'View project graph', activity: 'Project activity' },
  deployment: { graph: 'Trace deployment origin', activity: 'Deployment activity' },
  domain: { graph: 'Trace domain routing', activity: 'Domain activity' },
  database: { graph: 'Trace data dependencies', activity: 'Database activity' },
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function Attribution({ source, verificationState }) {
  return (
    <div className="detail-attribution">
      <span className={`verification-mark verification-${verificationState}`}><Icon name={verificationState === 'verified' ? 'checkCircle' : verificationState === 'inferred' ? 'issue' : 'download'} size={15} /></span>
      <div>
        <strong>{formatKey(verificationState || 'unknown')}</strong>
        <small>Source: {SOURCE_LABELS[source] || formatKey(source || 'unknown')}</small>
      </div>
    </div>
  );
}

export default function IntegrationDetailPanel({
  dataset,
  onClose,
  onSelectResource,
  onViewActivity,
  onViewGraph,
  selection,
}) {
  if (!selection) {
    return (
      <aside className="integration-detail integration-detail--empty" aria-label="Resource details">
        <span className="integration-detail__empty-icon"><Icon name="panel" size={24} /></span>
        <h2>Inspect a relationship</h2>
        <p>Select a graph node, connection, table row, or timeline event to inspect its attributed metadata here.</p>
        <ul>
          <li><Icon name="check" size={13} /> Source and verification state</li>
          <li><Icon name="check" size={13} /> Connected resources</li>
          <li><Icon name="check" size={13} /> Health and timestamps</li>
        </ul>
      </aside>
    );
  }

  const resourcesById = new Map(dataset.resources.map((resource) => [resource.id, resource]));
  const connectionsById = new Map(dataset.connections.map((connection) => [connection.id, connection]));
  const eventsById = new Map(dataset.events.map((event) => [event.id, event]));

  if (selection.kind === 'connection') {
    const connection = connectionsById.get(selection.id);
    if (!connection) return null;
    const source = resourcesById.get(connection.sourceResourceId);
    const target = resourcesById.get(connection.targetResourceId);
    return (
      <PanelShell eyebrow="Connection" icon="link" onClose={onClose} title={formatKey(connection.relationshipType)}>
        <Attribution source={connection.source} verificationState={connection.verificationState} />
        <dl className="integration-detail__facts">
          <div><dt>Source resource</dt><dd><button onClick={() => onSelectResource(source.id)}>{source.name}</button></dd></div>
          <div><dt>Target resource</dt><dd><button onClick={() => onSelectResource(target.id)}>{target.name}</button></dd></div>
          <div><dt>Provider</dt><dd>{formatKey(connection.provider)}</dd></div>
          <div><dt>Origin</dt><dd>{formatKey(connection.origin || 'unknown')}</dd></div>
          <div><dt>Health</dt><dd><span className={`health-label status-${connection.status}`}><i />{connection.status}</span></dd></div>
          <div><dt>Created</dt><dd>{formatDateTime(connection.createdAt)}</dd></div>
          <div><dt>Last verified</dt><dd>{formatDateTime(connection.lastVerifiedAt)}</dd></div>
          <div><dt>Last updated</dt><dd>{formatDateTime(connection.updatedAt)}</dd></div>
        </dl>
        {connection.metadata?.evidence && <div className="integration-detail__evidence"><strong>Relationship evidence</strong><p>{connection.metadata.evidence}</p></div>}
        <div className="integration-detail__actions">
          <button className="primary" onClick={() => onViewGraph(source.id)}><Icon name="graph" size={15} /> View in graph</button>
        </div>
      </PanelShell>
    );
  }

  if (selection.kind === 'event') {
    const event = eventsById.get(selection.id);
    if (!event) return null;
    const resource = resourcesById.get(event.resourceId);
    const sourceUrl = getSafeProviderUrl(event.provider, event.providerUrl);
    return (
      <PanelShell eyebrow="Timeline event" icon="activity" onClose={onClose} title={formatKey(event.eventType)}>
        <Attribution source={event.source} verificationState={event.verificationState} />
        <dl className="integration-detail__facts">
          <div><dt>Resource</dt><dd><button onClick={() => onSelectResource(resource.id)}>{resource.name}</button></dd></div>
          <div><dt>Provider</dt><dd>{formatKey(event.provider)}</dd></div>
          <div><dt>Actor</dt><dd>{event.actor?.name || 'Unknown actor'}</dd></div>
          <div><dt>Status</dt><dd>{formatKey(event.status)}</dd></div>
          <div><dt>Timestamp</dt><dd>{formatDateTime(event.timestamp)}</dd></div>
        </dl>
        <MetadataList metadata={event.metadata} />
        <div className="integration-detail__actions">
          <button className="primary" onClick={() => onViewGraph(resource.id)}><Icon name="graph" size={15} /> View resource</button>
          {sourceUrl && <a href={sourceUrl} rel="noreferrer" target="_blank">Open source <Icon name="arrowUpRight" size={14} /></a>}
        </div>
      </PanelShell>
    );
  }

  const resource = resourcesById.get(selection.id);
  if (!resource) return null;
  const { adjacency } = buildRelationshipIndex(dataset);
  const edges = adjacency.get(resource.id) || [];
  const accountRecord = dataset.accounts.find((account) => account.id === resource.accountId);
  const selectedAccount = resource.type === 'account'
    ? dataset.accounts.find((account) => account.resourceId === resource.id || account.id === resource.id)
    : null;
  const owningAccount = resourcesById.get(accountRecord?.resourceId || resource.accountId);
  const externalUrl = getSafeProviderUrl(resource.provider, resource.providerUrl);
  const actionLabels = actionLabelsByType[resource.type] || { graph: 'View resource graph', activity: 'View activity' };

  return (
    <PanelShell eyebrow={RESOURCE_LABELS[resource.type] || formatKey(resource.type)} icon={resource.type === 'repository' ? 'branch' : resource.type === 'account' ? 'users' : 'cube'} onClose={onClose} title={resource.name}>
      <Attribution source={resource.source} verificationState={resource.verificationState} />
      <dl className="integration-detail__facts">
        <div><dt>Provider</dt><dd>{formatKey(resource.provider)}</dd></div>
        {owningAccount && owningAccount.id !== resource.id && (
          <div><dt>Provider account</dt><dd><button onClick={() => onSelectResource(owningAccount.id)}>{owningAccount.name}</button></dd></div>
        )}
        <div><dt>Health</dt><dd><span className={`health-label status-${resource.status}`}><i />{resource.status}</span></dd></div>
        <div><dt>External identifier</dt><dd>{resource.externalId || 'Not available'}</dd></div>
        {selectedAccount && <div><dt>Permissions</dt><dd>{formatValue(selectedAccount.permissions)}</dd></div>}
        {selectedAccount && <div><dt>Connected</dt><dd>{formatDateTime(selectedAccount.createdAt)}</dd></div>}
        {selectedAccount && <div><dt>Last verified</dt><dd>{formatDateTime(selectedAccount.lastVerifiedAt)}</dd></div>}
        <div><dt>Last updated</dt><dd>{formatDateTime(resource.updatedAt)}</dd></div>
      </dl>
      <MetadataList metadata={resource.metadata} />
      <section className="integration-detail__connections">
        <header><strong>Connected resources</strong><span>{edges.length}</span></header>
        {edges.length ? edges.map((edge) => (
          <button key={`${edge.connection.id}:${edge.resource.id}`} onClick={() => onSelectResource(edge.resource.id)}>
            <span className={`resource-cell__icon provider-${edge.resource.provider}`}><Icon name={edge.resource.type === 'repository' ? 'branch' : 'cube'} size={15} /></span>
            <span><strong>{edge.resource.name}</strong><small>{edge.direction === 'outgoing' ? '→' : '←'} {formatKey(edge.connection.relationshipType)}</small></span>
            <Icon name="chevronRight" size={14} />
          </button>
        )) : <p>No attributed connections are recorded.</p>}
      </section>
      <div className="integration-detail__actions">
        <button className="primary" onClick={() => onViewGraph(resource.id)}><Icon name="graph" size={15} /> {actionLabels.graph}</button>
        <button onClick={() => onViewActivity(resource.id)}><Icon name="activity" size={15} /> {actionLabels.activity}</button>
        {externalUrl && <a href={externalUrl} rel="noreferrer" target="_blank">Open provider <Icon name="arrowUpRight" size={14} /></a>}
      </div>
      <div className="integration-detail__safety"><Icon name="shield" size={14} /> Secret values are never included in this panel.</div>
    </PanelShell>
  );
}

function MetadataList({ metadata }) {
  const entries = Object.entries(sanitizeIntegrationMetadata(metadata));
  if (!entries.length) return null;
  return (
    <section className="integration-detail__metadata">
      <h3>Recorded metadata</h3>
      <dl>
        {entries.map(([key, value]) => (
          <div key={key}><dt>{formatKey(key)}</dt><dd>{formatValue(value)}</dd></div>
        ))}
      </dl>
    </section>
  );
}

function PanelShell({ children, eyebrow, icon, onClose, title }) {
  return (
    <aside className="integration-detail" aria-label={`${title} details`}>
      <header className="integration-detail__header">
        <span className="integration-detail__icon"><Icon name={icon} size={18} /></span>
        <div><span>{eyebrow}</span><h2>{title}</h2></div>
        <button aria-label="Close details" onClick={onClose}><Icon name="close" size={17} /></button>
      </header>
      <div className="integration-detail__body">{children}</div>
    </aside>
  );
}
