import Icon from '../Icon';
import ProviderBadge from '../ProviderBadge';
import StatusBadge from '../StatusBadge';
import { formatKey } from '../../modules/objects/index.js';
import './ObjectDetail.css';

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None recorded';
  if (typeof value === 'object') return 'Structured metadata';
  return String(value);
};

function MetaRow({ label, value }) {
  return (
    <div className="object-detail__meta-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Attribution({ descriptor }) {
  return (
    <div className="object-detail__attribution">
      <span className={`object-detail__verify object-detail__verify--${descriptor.verificationState}`}>
        <Icon name={descriptor.verificationState === 'verified' ? 'checkCircle' : 'download'} size={14} />
      </span>
      <div>
        <strong>{formatKey(descriptor.verificationState)}</strong>
        <small>Source: {descriptor.discoveredVia}</small>
      </div>
    </div>
  );
}

function ResourceBody({ descriptor, onOpenConnection, onOpenEvent }) {
  return (
    <>
      <Attribution descriptor={descriptor} />
      <dl className="object-detail__meta">
        <MetaRow label="Type" value={descriptor.typeLabel} />
        <MetaRow label="Owned by" value={descriptor.owner ? descriptor.owner.name : 'Not attributed'} />
        {descriptor.environment && <MetaRow label="Environment" value={formatKey(descriptor.environment)} />}
        {descriptor.externalId && <MetaRow label="External ID" value={descriptor.externalId} />}
        <MetaRow label="Last activity" value={formatDateTime(descriptor.lastEventAt)} />
        {descriptor.lastEventActor && <MetaRow label="Last changed by" value={descriptor.lastEventActor} />}
        <MetaRow label="Updated" value={formatDateTime(descriptor.updatedAt)} />
        <MetaRow label="Verified" value={formatDateTime(descriptor.lastVerifiedAt)} />
      </dl>

      {Object.entries(descriptor.metadata || {}).length > 0 && (
        <section className="object-detail__section">
          <h3>Metadata</h3>
          <dl className="object-detail__meta">
            {Object.entries(descriptor.metadata).slice(0, 10).map(([key, value]) => (
              <MetaRow key={key} label={formatKey(key)} value={formatValue(value)} />
            ))}
          </dl>
        </section>
      )}

      <section className="object-detail__section">
        <h3>Connections ({descriptor.connections.length})</h3>
        {descriptor.connections.length ? (
          <ul className="object-detail__list">
            {descriptor.connections.slice(0, 8).map((connection) => (
              <li key={connection.id}>
                <button type="button" onClick={() => onOpenConnection?.(connection.id)}>
                  <span className="object-detail__list-main">
                    <strong>
                      {connection.direction === 'outgoing' ? '→' : '←'} {connection.counterpart?.name || 'Unknown resource'}
                    </strong>
                    <small>{connection.relationshipLabel} · {connection.method}</small>
                  </span>
                  <StatusBadge status={connection.status.raw} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="object-detail__empty">No connections recorded for this resource yet.</p>}
      </section>

      <section className="object-detail__section">
        <h3>History ({descriptor.eventCount})</h3>
        {descriptor.events.length ? (
          <ul className="object-detail__list">
            {descriptor.events.map((event) => (
              <li key={event.id}>
                <button type="button" onClick={() => onOpenEvent?.(event.id)}>
                  <span className="object-detail__list-main">
                    <strong>{event.label}</strong>
                    <small>{event.actor} · {formatDateTime(event.timestamp)}</small>
                  </span>
                  <StatusBadge status={event.status.raw} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="object-detail__empty">No recorded events for this resource yet.</p>}
      </section>

      {descriptor.impact.length > 0 && (
        <section className="object-detail__section">
          <h3>Affected by this resource</h3>
          <ul className="object-detail__impact">
            {descriptor.impact.map((resource) => (
              <li key={resource.id}>
                <Icon name={resource.type === 'deployment' ? 'rocket' : 'layers'} size={13} />
                <span>{resource.name}</span>
                <small>{resource.typeLabel}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ConnectionBody({ descriptor, onOpenResource }) {
  return (
    <>
      <Attribution descriptor={descriptor} />
      <dl className="object-detail__meta">
        <MetaRow label="Relationship" value={descriptor.relationshipLabel} />
        <MetaRow label="Method" value={descriptor.method} />
        <MetaRow label="Created" value={formatDateTime(descriptor.createdAt)} />
        <MetaRow label="Last verified" value={formatDateTime(descriptor.lastVerifiedAt)} />
        <MetaRow label="Updated" value={formatDateTime(descriptor.updatedAt)} />
      </dl>

      <section className="object-detail__section">
        <h3>Source</h3>
        {descriptor.source ? (
          <button type="button" className="object-detail__endpoint" onClick={() => onOpenResource?.(descriptor.source.id)}>
            <Icon name="cube" size={14} />
            <span className="object-detail__list-main">
              <strong>{descriptor.source.name}</strong>
              <small>{descriptor.source.typeLabel} · {descriptor.source.provider}</small>
            </span>
            <Icon name="chevronRight" size={14} />
          </button>
        ) : <p className="object-detail__empty">Source resource not recorded.</p>}
      </section>

      <section className="object-detail__section">
        <h3>Target</h3>
        {descriptor.target ? (
          <button type="button" className="object-detail__endpoint" onClick={() => onOpenResource?.(descriptor.target.id)}>
            <Icon name="cube" size={14} />
            <span className="object-detail__list-main">
              <strong>{descriptor.target.name}</strong>
              <small>{descriptor.target.typeLabel} · {descriptor.target.provider}</small>
            </span>
            <Icon name="chevronRight" size={14} />
          </button>
        ) : <p className="object-detail__empty">Target resource not recorded.</p>}
      </section>
    </>
  );
}

function EventBody({ descriptor, onOpenResource }) {
  return (
    <>
      <Attribution descriptor={descriptor} />
      <dl className="object-detail__meta">
        <MetaRow label="Event" value={formatKey(descriptor.eventType)} />
        <MetaRow label="Actor" value={descriptor.actor} />
        {descriptor.account && <MetaRow label="Account" value={descriptor.account.name} />}
        <MetaRow label="Recorded" value={formatDateTime(descriptor.timestamp)} />
      </dl>

      {descriptor.resource && (
        <section className="object-detail__section">
          <h3>Resource</h3>
          <button type="button" className="object-detail__endpoint" onClick={() => onOpenResource?.(descriptor.resource.id)}>
            <Icon name="cube" size={14} />
            <span className="object-detail__list-main">
              <strong>{descriptor.resource.name}</strong>
              <small>{descriptor.resource.typeLabel} · {descriptor.resource.provider}</small>
            </span>
            <Icon name="chevronRight" size={14} />
          </button>
        </section>
      )}

      {Object.entries(descriptor.metadata || {}).length > 0 && (
        <section className="object-detail__section">
          <h3>Event metadata</h3>
          <dl className="object-detail__meta">
            {Object.entries(descriptor.metadata).slice(0, 10).map(([key, value]) => (
              <MetaRow key={key} label={formatKey(key)} value={formatValue(value)} />
            ))}
          </dl>
        </section>
      )}
    </>
  );
}

/**
 * Renders a canonical object descriptor (resource / connection / event).
 * One representation — the graph, timeline, and tables all open this panel.
 */
export default function ObjectDetail({ descriptor, onOpenConnection, onOpenEvent, onOpenResource }) {
  if (!descriptor) return null;
  return (
    <div className="object-detail">
      {descriptor.kind === 'resource' && (
        <ResourceBody
          descriptor={descriptor}
          onOpenConnection={onOpenConnection}
          onOpenEvent={onOpenEvent}
        />
      )}
      {descriptor.kind === 'connection' && (
        <ConnectionBody descriptor={descriptor} onOpenResource={onOpenResource} />
      )}
      {descriptor.kind === 'event' && (
        <EventBody descriptor={descriptor} onOpenResource={onOpenResource} />
      )}
    </div>
  );
}

export function ObjectDetailBadges({ descriptor }) {
  if (!descriptor) return null;
  return (
    <>
      <ProviderBadge provider={descriptor.provider} size="sm" />
      <StatusBadge status={descriptor.status.raw} size="sm" />
    </>
  );
}
