import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import DetailPanel from '../../components/DetailPanel/DetailPanel';
import ObjectDetail, { ObjectDetailBadges } from '../../components/DetailPanel/ObjectDetail';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { buildObjectDescriptor } from '../../modules/objects/index.js';
import { loadRepositoryDataset } from '../../modules/repositories';
import {
  filterTimelineEvents,
  groupEventsByDay,
  kindOfEvent,
  summarizeTimeline,
  TIMELINE_KINDS,
} from '../../modules/timeline/index.js';
import '../ModulePages.css';
import './ActivityPage.css';

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ActivityPage() {
  const navigate = useNavigate();
  const { showError } = useToast();
  const selectedProjectId = useSelector((state) => state.context.selectedProjectId);
  const projects = useSelector((state) => state.projects.projects);

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [kind, setKind] = useState('all');
  const [selection, setSelection] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await loadRepositoryDataset({ signal });
      setDataset(result);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setLoadError(error.message || 'Activity could not be loaded.');
        showError('Activity unavailable', error.message || 'Workspace activity could not be loaded.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const contextProject = projects.find((project) => project.id === selectedProjectId) || null;

  const scopedEvents = useMemo(() => {
    if (!dataset) return [];
    // Project scoping applies when events actually carry project attribution.
    const attributable = dataset.events.some((event) => event.projectId);
    if (!contextProject || !attributable) return dataset.events;
    return dataset.events.filter((event) => event.projectId === contextProject.id);
  }, [dataset, contextProject]);

  const counts = useMemo(() => summarizeTimeline(scopedEvents), [scopedEvents]);
  const filtered = useMemo(() => filterTimelineEvents(scopedEvents, kind), [scopedEvents, kind]);
  const days = useMemo(() => groupEventsByDay(filtered), [filtered]);
  const resourcesById = useMemo(
    () => new Map((dataset?.resources || []).map((resource) => [resource.id, resource])),
    [dataset],
  );

  const descriptor = useMemo(
    () => (dataset && selection ? buildObjectDescriptor(dataset, selection) : null),
    [dataset, selection],
  );

  const openInGraph = useCallback((resourceId) => {
    navigate(resourceId ? `/integrations/graph?resource=${encodeURIComponent(resourceId)}` : '/integrations/graph');
  }, [navigate]);

  if (loading && !dataset) {
    return (
      <div className="module-page">
        <div className="module-loading" role="status">
          <span className="projects-loading__spinner" aria-hidden="true" />
          <p>Loading the engineering timeline…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page activity-layout">
      <div className="activity-main">
        <header className="module-hero">
          <div>
            <span className="module-hero__eyebrow"><Icon name="activity" size={13} /> Workspace</span>
            <h1>Activity</h1>
            <p>
              Real engineering events — commits, deploys, issues, releases — recorded against the
              same objects the graph renders. Select any event to inspect it.
            </p>
          </div>
          <div className="module-hero__actions">
            <FreshnessIndicator timestamp={dataset?.generatedAt} failed={Boolean(loadError)} />
            <button type="button" className="module-btn" onClick={() => load(undefined)} disabled={loading}>
              <Icon name="refresh" size={15} /> Refresh
            </button>
          </div>
        </header>

        {loadError && (
          <div className="module-note" role="alert">
            <span><Icon name="shield" size={16} /></span>
            <p><strong>Activity unavailable.</strong>{loadError}</p>
          </div>
        )}

        {contextProject && (
          <div className="module-note">
            <span><Icon name="filter" size={16} /></span>
            <p>
              <strong>Scoped to {contextProject.name}.</strong>
              {dataset?.events.some((event) => event.projectId)
                ? ' Showing events attributed to this project.'
                : ' Recorded events do not carry project attribution yet, so the full workspace stream is shown.'}
            </p>
          </div>
        )}

        <div className="activity-kinds" role="tablist" aria-label="Filter events by kind">
          {TIMELINE_KINDS.map((timelineKind) => (
            <button
              key={timelineKind.id}
              type="button"
              role="tab"
              aria-selected={kind === timelineKind.id}
              className={`activity-kind${kind === timelineKind.id ? ' activity-kind--active' : ''}`}
              onClick={() => setKind(timelineKind.id)}
            >
              <Icon name={timelineKind.icon} size={14} />
              <span>{timelineKind.label}</span>
              <small>{counts[timelineKind.id] ?? 0}</small>
            </button>
          ))}
        </div>

        {!days.length ? (
          <section className="module-card">
            <div className="module-empty">
              <span><Icon name="activity" size={22} /></span>
              <h3>{kind === 'all' ? 'No engineering events recorded yet' : `No ${TIMELINE_KINDS.find((timelineKind) => timelineKind.id === kind)?.label.toLowerCase()} events yet`}</h3>
              <p>
                The timeline only shows events an attributed source has recorded — commits appear as
                they land, deployments as providers report them, releases as tags are published.
              </p>
            </div>
          </section>
        ) : (
          days.map((day) => (
            <section className="activity-day" key={day.day}>
              <h2 className="activity-day__label">{day.label}</h2>
              <div className="activity-day__rail">
                {day.events.map((event) => {
                  const resource = resourcesById.get(event.resourceId);
                  const selected = selection?.kind === 'event' && selection.id === event.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      aria-pressed={selected}
                      className={`activity-event${selected ? ' activity-event--selected' : ''}`}
                      onClick={() => setSelection({ kind: 'event', id: event.id })}
                    >
                      <time dateTime={event.timestamp}>{formatTime(event.timestamp)}</time>
                      <span className={`activity-event__node activity-event__node--${kindOfEvent(event.eventType)}`} aria-hidden="true" />
                      <span className="activity-event__copy">
                        <strong>{event.metadata?.summary || event.eventType.replaceAll('_', ' ')}</strong>
                        <small>
                          {event.eventType.replaceAll('_', ' ')} · {resource?.name || 'workspace'}
                          {' · '}{event.actor?.name || 'recorded activity'}
                        </small>
                      </span>
                      <Icon name="chevronRight" size={15} />
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <DetailPanel
        open={Boolean(descriptor)}
        onClose={() => setSelection(null)}
        eyebrow={descriptor ? (descriptor.kind === 'event' ? 'Timeline event' : descriptor.subtitle) : ''}
        title={descriptor?.title || ''}
        badges={descriptor ? <ObjectDetailBadges descriptor={descriptor} /> : null}
        footer={descriptor?.kind === 'event' && descriptor.resource ? (
          <button type="button" className="module-btn module-btn--sm" onClick={() => openInGraph(descriptor.resource.id)}>
            <Icon name="graph" size={14} /> Open in graph
          </button>
        ) : null}
      >
        {descriptor && (
          <ObjectDetail
            descriptor={descriptor}
            onOpenConnection={(id) => setSelection({ kind: 'connection', id })}
            onOpenEvent={(id) => setSelection({ kind: 'event', id })}
            onOpenResource={(id) => setSelection({ kind: 'resource', id })}
          />
        )}
      </DetailPanel>
    </div>
  );
}
