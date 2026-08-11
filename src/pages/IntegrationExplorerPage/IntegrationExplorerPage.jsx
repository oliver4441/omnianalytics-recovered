import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import {
  filterIntegrationDataset,
  findConnectionPath,
  getDatasetFacets,
  getIntegrationDataset,
  normalizeIntegrationDataset,
  RESOURCE_LABELS,
} from '../../modules/integrations';
import ActivityTimeline from './ActivityTimeline';
import IntegrationDetailPanel from './IntegrationDetailPanel';
import RelationshipGraph from './RelationshipGraph';
import ResourceTable from './ResourceTable';
import './IntegrationExplorerPage.css';

const sections = [
  { id: 'overview', label: 'Overview', icon: 'overview', path: '/integrations', view: 'graph' },
  { id: 'graph', label: 'Graph', icon: 'graph', path: '/integrations/graph', view: 'graph' },
  { id: 'accounts', label: 'Accounts', icon: 'users', path: '/integrations/accounts', view: 'table', type: 'account' },
  { id: 'repositories', label: 'Repositories', icon: 'branch', path: '/integrations/repositories', view: 'table', type: 'repository' },
  { id: 'deployments', label: 'Deployments', icon: 'rocket', path: '/integrations/deployments', view: 'table', type: 'deployment' },
  { id: 'connections', label: 'Connections', icon: 'link', path: '/integrations/connections', view: 'graph' },
  { id: 'activity', label: 'Activity', icon: 'activity', path: '/integrations/activity', view: 'timeline' },
  { id: 'health', label: 'Health', icon: 'health', path: '/integrations/health', view: 'table' },
];

const emptyDataset = {
  accounts: [],
  connections: [],
  events: [],
  integrations: [],
  notices: [],
  resources: [],
};

const getSection = (pathname) => sections.find((section) => section.path === pathname) || sections[0];

export default function IntegrationExplorerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = getSection(location.pathname);
  const requestedView = new URLSearchParams(location.search).get('view');
  const activeView = ['graph', 'table', 'timeline'].includes(requestedView)
    ? requestedView
    : activeSection.view;
  const [dataset, setDataset] = useState(emptyDataset);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selection, setSelection] = useState(null);
  const [focusedResourceId, setFocusedResourceId] = useState('');
  const [focusNotice, setFocusNotice] = useState('');
  const [timelineResourceId, setTimelineResourceId] = useState('');
  const [groupByProvider, setGroupByProvider] = useState(true);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [trace, setTrace] = useState({ sourceId: '', targetId: '' });
  const [filters, setFilters] = useState({
    search: '',
    provider: '',
    resourceType: activeSection.type || '',
    status: '',
  });

  const loadDataset = async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getIntegrationDataset({ signal });
      setDataset(normalizeIntegrationDataset(result));
    } catch (error) {
      if (error.name !== 'AbortError') setLoadError(error.message || 'Integration metadata could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDataset(controller.signal);
    return () => controller.abort();
  // Load the generated repository snapshot once for all synchronized views.
  }, []);

  useEffect(() => {
    setFilters((current) => ({ ...current, resourceType: activeSection.type || '' }));
  }, [activeSection.type]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const identifier = params.get('resource') || params.get('project');
    if (!identifier) {
      setFocusNotice('');
      return;
    }
    if (!dataset.resources.length) return;

    const resource = dataset.resources.find((candidate) => (
      candidate.id === identifier
      || candidate.externalId === identifier
      || candidate.metadata?.projectId === identifier
      || candidate.metadata?.project === identifier
    ));
    if (resource) {
      setFocusedResourceId(resource.id);
      setTimelineResourceId(resource.id);
      setSelection({ kind: 'resource', id: resource.id });
      setFocusNotice('');
    } else {
      setFocusedResourceId('');
      setTimelineResourceId('');
      setSelection(null);
      setFocusNotice('No attributed integration resources are connected to this project yet. The complete relationship graph is shown instead.');
    }
  }, [dataset.resources, location.search]);

  useEffect(() => {
    if (!selection) return;
    const collection = selection.kind === 'resource'
      ? dataset.resources
      : selection.kind === 'connection'
        ? dataset.connections
        : dataset.events;
    if (!collection.some((record) => record.id === selection.id)) setSelection(null);
  }, [dataset, selection]);

  const facets = useMemo(() => getDatasetFacets(dataset), [dataset]);
  const filteredDataset = useMemo(
    () => filterIntegrationDataset(dataset, filters),
    [dataset, filters],
  );
  const resourcesById = useMemo(() => new Map(dataset.resources.map((resource) => [resource.id, resource])), [dataset.resources]);
  const connectionsById = useMemo(() => new Map(dataset.connections.map((connection) => [connection.id, connection])), [dataset.connections]);
  const selectedEvent = selection?.kind === 'event'
    ? dataset.events.find((event) => event.id === selection.id)
    : null;
  const selectedResourceId = selection?.kind === 'resource' ? selection.id : selectedEvent?.resourceId || '';
  const connectionPath = useMemo(() => (
    trace.sourceId && trace.targetId
      ? findConnectionPath(dataset, trace.sourceId, trace.targetId)
      : null
  ), [dataset, trace]);
  const unhealthyCount = dataset.resources.filter((resource) => ['degraded', 'expired', 'error', 'disconnected'].includes(resource.status)).length;
  const verifiedCount = dataset.connections.filter((connection) => connection.verificationState === 'verified').length;

  const selectResource = (resourceId) => {
    setSelection({ kind: 'resource', id: resourceId });
    setFocusedResourceId(resourceId);
  };

  const selectEvent = (eventId) => {
    const event = dataset.events.find((candidate) => candidate.id === eventId);
    setSelection({ kind: 'event', id: eventId });
    if (event?.resourceId) setFocusedResourceId(event.resourceId);
  };

  const viewGraph = (resourceId) => {
    setFocusedResourceId(resourceId);
    setSelection({ kind: 'resource', id: resourceId });
    navigate(`/integrations/graph?resource=${encodeURIComponent(resourceId)}`);
  };

  const viewActivity = (resourceId) => {
    setTimelineResourceId(resourceId);
    navigate(`/integrations/activity?resource=${encodeURIComponent(resourceId)}`);
  };

  const switchView = (view) => {
    const params = new URLSearchParams(location.search);
    params.set('view', view);
    navigate(`${activeSection.path}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="integration-page integration-page--state" role="status">
        <span className="projects-loading__spinner" />
        <h1>Loading integration relationships…</h1>
        <p>Reading attributed repository metadata for this workspace.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="integration-page integration-page--state">
        <span className="integration-state-icon"><Icon name="issue" size={25} /></span>
        <h1>Integration metadata unavailable</h1>
        <p>{loadError}</p>
        <button onClick={() => loadDataset()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="integration-page">
      <header className="integration-hero">
        <div>
          <span className="integration-hero__eyebrow"><Icon name="graph" size={14} /> Unified integration explorer <i>Preview</i></span>
          <h1>Understand how your systems connect.</h1>
          <p>Graph, table, timeline, and detail views share one attributed relationship dataset. Imported records remain clearly distinct from provider-verified connections.</p>
        </div>
        <div className="integration-hero__actions">
          <button onClick={() => setDiscoveryOpen(!discoveryOpen)}><Icon name="search" size={15} /> Trace relationship</button>
          <button disabled title="Provider synchronization requires a configured integration"><Icon name="refresh" size={15} /> Synchronize</button>
        </div>
      </header>

      {focusNotice && (
        <div className="integration-focus-note" role="status">
          <Icon name="issue" size={17} />
          <p><strong>Project focus unavailable</strong>{focusNotice}</p>
          <button aria-label="Dismiss project focus notice" onClick={() => setFocusNotice('')}><Icon name="close" size={15} /></button>
        </div>
      )}

      <section aria-label="Integration dataset summary" className="integration-summary">
        <div><span className="provider-glyph"><Icon name="layers" size={17} /></span><p><strong>{dataset.resources.length}</strong><small>Resources</small></p></div>
        <div><span className="provider-glyph"><Icon name="link" size={17} /></span><p><strong>{dataset.connections.length}</strong><small>Connections</small></p></div>
        <div><span className="provider-glyph"><Icon name="checkCircle" size={17} /></span><p><strong>{verifiedCount}</strong><small>Provider verified</small></p></div>
        <div><span className={`provider-glyph ${unhealthyCount ? 'has-warning' : ''}`}><Icon name="health" size={17} /></span><p><strong>{unhealthyCount}</strong><small>Need attention</small></p></div>
        <div className="integration-summary__source"><Icon name="download" size={15} /><p><strong>Repository metadata</strong><small>Generated {dataset.generatedAt ? new Date(dataset.generatedAt).toLocaleString() : 'time unavailable'}</small></p></div>
      </section>

      {discoveryOpen && (
        <section className="relationship-discovery" aria-labelledby="relationship-discovery-title">
          <div className="relationship-discovery__heading">
            <span><Icon name="route" size={19} /></span>
            <div><h2 id="relationship-discovery-title">Deterministic connection discovery</h2><p>Select two resources to trace the shortest recorded path. No AI or inferred edges are added.</p></div>
            <button aria-label="Close relationship discovery" onClick={() => setDiscoveryOpen(false)}><Icon name="close" size={17} /></button>
          </div>
          <div className="relationship-discovery__query">
            <label>From resource
              <select onChange={(event) => setTrace({ ...trace, sourceId: event.target.value })} value={trace.sourceId}>
                <option value="">Select a resource</option>
                {dataset.resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.provider} / {resource.name}</option>)}
              </select>
            </label>
            <span><Icon name="arrowRight" size={18} /></span>
            <label>To resource
              <select onChange={(event) => setTrace({ ...trace, targetId: event.target.value })} value={trace.targetId}>
                <option value="">Select a resource</option>
                {dataset.resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.provider} / {resource.name}</option>)}
              </select>
            </label>
          </div>
          {trace.sourceId && trace.targetId && (
            <div className={`relationship-discovery__result ${connectionPath ? '' : 'is-empty'}`}>
              {connectionPath ? connectionPath.resources.map((resourceId, index) => {
                const resource = resourcesById.get(resourceId);
                const connection = index < connectionPath.connections.length ? connectionsById.get(connectionPath.connections[index]) : null;
                return (
                  <span className="discovery-path-segment" key={resourceId}>
                    <button onClick={() => selectResource(resourceId)}><strong>{resource.name}</strong><small>{resource.provider} · {RESOURCE_LABELS[resource.type]}</small></button>
                    {connection && <i><Icon name="arrowRight" size={14} />{connection.relationshipType.replaceAll('_', ' ')}</i>}
                  </span>
                );
              }) : <p><Icon name="issue" size={15} /> No recorded relationship path connects these resources.</p>}
            </div>
          )}
        </section>
      )}

      <nav aria-label="Integration explorer sections" className="integration-section-nav">
        {sections.map((section) => (
          <button className={activeSection.id === section.id ? 'is-active' : ''} key={section.id} onClick={() => navigate(section.path)}>
            <Icon name={section.icon} size={15} />{section.label}
          </button>
        ))}
      </nav>

      <section className="integration-filterbar" aria-label="Resource filters">
        <label className="integration-search"><Icon name="search" size={16} /><input aria-label="Search resources" onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search resources, providers, and metadata…" value={filters.search} /></label>
        <label><span>Provider</span><select onChange={(event) => setFilters({ ...filters, provider: event.target.value })} value={filters.provider}><option value="">All providers</option>{facets.providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></label>
        <label><span>Resource type</span><select disabled={Boolean(activeSection.type)} onChange={(event) => setFilters({ ...filters, resourceType: event.target.value })} value={filters.resourceType}><option value="">All types</option>{facets.resourceTypes.map((type) => <option key={type} value={type}>{RESOURCE_LABELS[type] || type}</option>)}</select></label>
        <label><span>Health</span><select onChange={(event) => setFilters({ ...filters, status: event.target.value })} value={filters.status}><option value="">All states</option>{facets.statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        {activeView === 'graph' && <label className="integration-group-toggle"><input checked={groupByProvider} onChange={(event) => setGroupByProvider(event.target.checked)} type="checkbox" /><span>Group providers</span></label>}
        {Object.values(filters).some(Boolean) && !activeSection.type && <button className="integration-clear-filters" onClick={() => setFilters({ search: '', provider: '', resourceType: '', status: '' })}>Clear</button>}
      </section>

      <div className={`integration-workbench ${selection ? 'has-selection' : ''}`}>
        <section className="integration-canvas" aria-label={`${activeSection.label} view`}>
          <header className="integration-canvas__header">
            <div><h2>{activeSection.label}</h2><p>{filteredDataset.resources.length} visible resources · {filteredDataset.connections.length} visible connections</p></div>
            <div className="integration-view-switcher" aria-label="View mode">
              <button className={activeView === 'graph' ? 'is-active' : ''} onClick={() => switchView('graph')}><Icon name="graph" size={14} /> Graph</button>
              <button className={activeView === 'table' ? 'is-active' : ''} onClick={() => switchView('table')}><Icon name="table" size={14} /> Table</button>
              <button className={activeView === 'timeline' ? 'is-active' : ''} onClick={() => switchView('timeline')}><Icon name="activity" size={14} /> Timeline</button>
            </div>
          </header>

          {activeView === 'graph' && (
            <RelationshipGraph
              dataset={filteredDataset}
              focusedResourceId={focusedResourceId}
              groupByProvider={groupByProvider}
              onSelectConnection={(connectionId) => setSelection({ kind: 'connection', id: connectionId })}
              onSelectResource={selectResource}
              selectedConnectionId={selection?.kind === 'connection' ? selection.id : ''}
            />
          )}
          {activeView === 'table' && (
            <ResourceTable
              dataset={filteredDataset}
              onSelectResource={selectResource}
              selectedResourceId={selectedResourceId}
            />
          )}
          {activeView === 'timeline' && (
            <ActivityTimeline
              dataset={filteredDataset}
              initialResourceId={timelineResourceId}
              onSelectEvent={selectEvent}
              selectedEventId={selection?.kind === 'event' ? selection.id : ''}
            />
          )}
        </section>

        <IntegrationDetailPanel
          dataset={dataset}
          onClose={() => setSelection(null)}
          onSelectResource={selectResource}
          onViewActivity={viewActivity}
          onViewGraph={viewGraph}
          selection={selection}
        />
      </div>

      <footer className="integration-provenance-note">
        <Icon name="shield" size={17} />
        <p><strong>Attribution boundary</strong>{dataset.notices?.join(' ') || 'Relationship data is shown only with a recorded source.'}</p>
      </footer>
    </div>
  );
}
