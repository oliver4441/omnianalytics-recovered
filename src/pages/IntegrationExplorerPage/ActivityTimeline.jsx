import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import { filterIntegrationEvents, getTimelineFilterOptions, SOURCE_LABELS } from '../../modules/integrations';

const formatEventName = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ActivityTimeline({ dataset, initialResourceId, onSelectEvent, selectedEventId }) {
  const [filters, setFilters] = useState({
    provider: '',
    resourceId: initialResourceId || '',
    accountId: '',
    projectId: '',
    userId: '',
    actor: '',
    eventType: '',
    status: '',
    source: '',
    from: '',
    to: '',
  });

  useEffect(() => {
    setFilters((current) => ({ ...current, resourceId: initialResourceId || '' }));
  }, [initialResourceId]);

  const {
    accounts,
    eventTypes,
    projects,
    providers,
    sources,
    statuses,
    users,
  } = useMemo(() => getTimelineFilterOptions(dataset), [dataset]);
  const resourcesById = useMemo(() => new Map(dataset.resources.map((resource) => [resource.id, resource])), [dataset.resources]);
  const events = useMemo(() => filterIntegrationEvents(dataset.events, filters), [dataset.events, filters]);
  const groupedEvents = useMemo(() => {
    const groups = new Map();
    events.forEach((event) => {
      const date = new Date(event.timestamp);
      const key = Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    return [...groups.entries()];
  }, [events]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="activity-timeline-view">
      <div className="timeline-filter-grid">
        <label>Provider
          <select onChange={(event) => updateFilter('provider', event.target.value)} value={filters.provider}>
            <option value="">All providers</option>
            {providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
        <label>Resource
          <select onChange={(event) => updateFilter('resourceId', event.target.value)} value={filters.resourceId}>
            <option value="">All resources</option>
            {dataset.resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
          </select>
        </label>
        <label>Account
          <select onChange={(event) => updateFilter('accountId', event.target.value)} value={filters.accountId}>
            <option value="">All accounts</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
          </select>
        </label>
        <label>Project
          <select onChange={(event) => updateFilter('projectId', event.target.value)} value={filters.projectId}>
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.label}</option>)}
          </select>
        </label>
        <label>User
          <select onChange={(event) => updateFilter('userId', event.target.value)} value={filters.userId}>
            <option value="">All users</option>
            {users.map((user) => <option key={user} value={user}>{user}</option>)}
          </select>
        </label>
        <label>Actor
          <input onChange={(event) => updateFilter('actor', event.target.value)} placeholder="Search actor…" type="search" value={filters.actor} />
        </label>
        <label>Event type
          <select onChange={(event) => updateFilter('eventType', event.target.value)} value={filters.eventType}>
            <option value="">All events</option>
            {eventTypes.map((eventType) => <option key={eventType} value={eventType}>{formatEventName(eventType)}</option>)}
          </select>
        </label>
        <label>Status
          <select onChange={(event) => updateFilter('status', event.target.value)} value={filters.status}>
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{formatEventName(status)}</option>)}
          </select>
        </label>
        <label>Source
          <select onChange={(event) => updateFilter('source', event.target.value)} value={filters.source}>
            <option value="">All sources</option>
            {sources.map((source) => <option key={source} value={source}>{SOURCE_LABELS[source] || formatEventName(source)}</option>)}
          </select>
        </label>
        <label>From<input onChange={(event) => updateFilter('from', event.target.value)} type="date" value={filters.from} /></label>
        <label>To<input onChange={(event) => updateFilter('to', event.target.value)} type="date" value={filters.to} /></label>
      </div>

      <div className="timeline-filter-summary">
        <span><Icon name="activity" size={14} /> {events.length} recorded {events.length === 1 ? 'event' : 'events'}</span>
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({ provider: '', resourceId: '', accountId: '', projectId: '', userId: '', actor: '', eventType: '', status: '', source: '', from: '', to: '' })}>Clear timeline filters</button>
        )}
      </div>

      {!events.length ? (
        <div className="integration-empty">
          <span><Icon name="activity" size={24} /></span>
          <h3>No activity matches these filters</h3>
          <p>Timeline events appear only when they are recorded by an attributed source.</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {groupedEvents.map(([date, dateEvents]) => (
            <section className="timeline-day" key={date}>
              <h3>{date}</h3>
              <div className="timeline-day__events">
                {dateEvents.map((event) => {
                  const resource = resourcesById.get(event.resourceId);
                  const eventDate = new Date(event.timestamp);
                  return (
                    <button aria-pressed={selectedEventId === event.id} className={`timeline-event ${selectedEventId === event.id ? 'is-selected' : ''}`} key={event.id} onClick={() => onSelectEvent(event.id)}>
                      <time dateTime={event.timestamp}>{Number.isNaN(eventDate.getTime()) ? 'Unknown' : eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      <span className={`timeline-event__provider provider-${event.provider}`}><Icon name={event.provider === 'github' ? 'branch' : 'activity'} size={15} /></span>
                      <span className="timeline-event__copy">
                        <strong>{formatEventName(event.eventType)}</strong>
                        <small>{resource?.name || 'Unknown resource'} · {event.actor?.name || 'Unknown actor'}</small>
                      </span>
                      <span className="timeline-event__source">
                        <strong>{event.status}</strong>
                        <small>{SOURCE_LABELS[event.source] || event.source} · {event.verificationState.replaceAll('_', ' ')}</small>
                      </span>
                      <Icon name="chevronRight" size={15} />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
