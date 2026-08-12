import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Chart from '../../components/Chart';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { buildAnalyticsOverview } from '../../modules/analytics';
import { loadRepositoryDataset } from '../../modules/repositories';
import { getAllUserProjects } from '../../services/projectService';
import { setProjects } from '../../store/slices/projectSlice';
import '../ModulePages.css';
import './AnalyticsPage.css';

const chartPalette = [
  'rgba(99, 91, 255, 0.75)',
  'rgba(23, 166, 115, 0.75)',
  'rgba(35, 131, 217, 0.75)',
  'rgba(217, 145, 0, 0.75)',
  'rgba(229, 72, 77, 0.75)',
  'rgba(134, 88, 255, 0.75)',
];

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const formatRelativeDays = (days) => {
  if (days === null) return 'No activity recorded';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

export default function AnalyticsPage() {
  const dispatch = useDispatch();
  const { showError, showSuccess } = useToast();
  const { projects } = useSelector((state) => state.projects);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async (signal, { announce = false } = {}) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await loadRepositoryDataset({ signal });
      setDataset(result);
      if (announce) showSuccess('Analytics refreshed', 'Charts rebuilt from the latest event snapshot.');
    } catch (error) {
      if (error.name !== 'AbortError') {
        setLoadError(error.message || 'Analytics data could not be loaded.');
        showError('Analytics unavailable', error.message || 'Analytics data could not be loaded.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [showError, showSuccess]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Project health uses workspace projects; reuse the store cache when present.
  useEffect(() => {
    if (projects.length) return undefined;
    let cancelled = false;
    getAllUserProjects()
      .then((records) => { if (!cancelled) dispatch(setProjects(records)); })
      .catch(() => { /* Health card reports "no projects" instead of failing the page. */ });
    return () => { cancelled = true; };
  }, [dispatch, projects.length]);

  const overview = useMemo(
    () => (dataset ? buildAnalyticsOverview(dataset, projects) : null),
    [dataset, projects],
  );

  const velocityConfig = useMemo(() => (overview?.commitVelocity.available ? {
    type: 'bar',
    data: {
      labels: overview.commitVelocity.labels,
      datasets: [{
        label: 'Commits',
        data: overview.commitVelocity.values,
        backgroundColor: 'rgba(99, 91, 255, 0.55)',
        borderColor: 'rgba(99, 91, 255, 1)',
        borderWidth: 1,
        borderRadius: 5,
      }],
    },
    options: baseOptions,
  } : null), [overview]);

  const eventTypeConfig = useMemo(() => (overview?.eventTypes.available ? {
    type: 'doughnut',
    data: {
      labels: overview.eventTypes.labels,
      datasets: [{
        data: overview.eventTypes.values,
        backgroundColor: chartPalette,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } },
    },
  } : null), [overview]);

  const contributorConfig = useMemo(() => (overview?.contributors.available ? {
    type: 'bar',
    data: {
      labels: overview.contributors.labels,
      datasets: [{
        label: 'Commits',
        data: overview.contributors.values,
        backgroundColor: 'rgba(35, 131, 217, 0.55)',
        borderColor: 'rgba(35, 131, 217, 1)',
        borderWidth: 1,
        borderRadius: 5,
      }],
    },
    options: { ...baseOptions, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } },
  } : null), [overview]);

  if (loading && !dataset) {
    return (
      <div className="module-page">
        <div className="module-loading" role="status">
          <span className="projects-loading__spinner" aria-hidden="true" />
          <p>Computing analytics from workspace events…</p>
        </div>
      </div>
    );
  }

  const health = overview?.projectHealth;

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span className="module-hero__eyebrow"><Icon name="chart" size={13} /> Operate</span>
          <h1>Engineering analytics</h1>
          <p>
            Delivery velocity, release cadence, review signal, and project health — every chart is
            computed from recorded workspace events, never from sampled placeholder data.
          </p>
        </div>
        <div className="module-hero__actions">
          <FreshnessIndicator timestamp={dataset?.generatedAt} failed={Boolean(loadError)} />
          <button type="button" className="module-btn" onClick={() => load(undefined, { announce: true })} disabled={loading}>
            <Icon name="refresh" size={15} /> Refresh
          </button>
          <Link className="module-btn module-btn--primary" to="/integrations">
            <Icon name="graph" size={15} /> Data sources
          </Link>
        </div>
      </header>

      {loadError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p><strong>Analytics unavailable.</strong>{loadError}</p>
        </div>
      )}

      {overview && overview.eventCount === 0 && (
        <section className="module-card">
          <div className="module-empty">
            <span><Icon name="chart" size={22} /></span>
            <h3>No activity to analyze yet</h3>
            <p>
              Analytics appears as soon as events exist. Connect a data source in the integration
              explorer or generate workspace activity (commits, releases, deployments) and refresh.
            </p>
            <Link className="module-btn module-btn--primary" to="/integrations">
              <Icon name="link" size={15} /> Connect a data source
            </Link>
          </div>
        </section>
      )}

      {overview && overview.eventCount > 0 && (
        <>
          <section className="module-summary" aria-label="Analytics highlights">
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="activity" size={18} /></span>
              <p><strong>{overview.eventCount}</strong><small>Events analyzed</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="gitCommit" size={18} /></span>
              <p>
                <strong>{overview.commitVelocity.available ? overview.commitVelocity.averagePerWeek.toFixed(1) : '—'}</strong>
                <small>Avg commits / active week</small>
              </p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="rocket" size={18} /></span>
              <p>
                <strong>{overview.releaseCadence.available ? overview.releaseCadence.perMonth.toFixed(1) : '—'}</strong>
                <small>Releases / month</small>
              </p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="projects" size={18} /></span>
              <p><strong>{health?.available ? health.projectCount : '—'}</strong><small>Workspace projects</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="clock" size={18} /></span>
              <p><strong>{formatRelativeDays(health?.daysSinceActivity ?? null)}</strong><small>Last recorded activity</small></p>
            </div>
          </section>

          <div className="module-grid-2">
            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>Commit velocity</h2>
                  <p>
                    {overview.commitVelocity.available
                      ? `${overview.commitVelocity.total} commits across ${overview.commitVelocity.activeWeeks} active week${overview.commitVelocity.activeWeeks === 1 ? '' : 's'}`
                      : 'Needs commit events'}
                  </p>
                </div>
              </div>
              {velocityConfig ? (
                <div className="analytics-chart">
                  <Chart config={velocityConfig} height={230} ariaLabel="Commit velocity bar chart" />
                </div>
              ) : (
                <div className="module-empty">
                  <span><Icon name="gitCommit" size={22} /></span>
                  <h3>No commit events yet</h3>
                  <p>Commit activity appears once the metadata snapshot records commits.</p>
                </div>
              )}
            </section>

            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>Pull requests &amp; reviews</h2>
                  <p>Cycle-time signal from PR and review events</p>
                </div>
              </div>
              {overview.reviewMetrics.available ? (
                <div className="analytics-metrics">
                  <div className="analytics-metric">
                    <strong>{overview.reviewMetrics.pullRequestCount}</strong>
                    <small>Pull request events</small>
                  </div>
                  <div className="analytics-metric">
                    <strong>{overview.reviewMetrics.reviewCount}</strong>
                    <small>Reviews submitted</small>
                  </div>
                </div>
              ) : (
                <div className="module-empty">
                  <span><Icon name="pullRequest" size={22} /></span>
                  <h3>No PR or review events recorded</h3>
                  <p>
                    Cycle time and review latency are computed from pull_request and review events.
                    Connect a source-control provider that syncs them and this panel activates.
                  </p>
                  <Link className="module-btn" to="/integrations">
                    <Icon name="link" size={15} /> Connect a data source
                  </Link>
                </div>
              )}
            </section>
          </div>

          <div className="module-grid-2 analytics-row">
            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>Event breakdown</h2>
                  <p>Distribution of recorded event types</p>
                </div>
              </div>
              {eventTypeConfig ? (
                <div className="analytics-chart analytics-chart--doughnut">
                  <Chart config={eventTypeConfig} height={220} ariaLabel="Event type breakdown doughnut chart" />
                </div>
              ) : (
                <div className="module-empty">
                  <span><Icon name="chart" size={22} /></span>
                  <h3>No events recorded</h3>
                  <p>Event distribution appears once activity exists.</p>
                </div>
              )}
            </section>

            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>Contributors</h2>
                  <p>
                    {overview.contributors.available
                      ? `${overview.contributors.actorCount} contributor${overview.contributors.actorCount === 1 ? '' : 's'} by recorded commits`
                      : 'Needs commit events'}
                  </p>
                </div>
              </div>
              {contributorConfig ? (
                <div className="analytics-chart">
                  <Chart config={contributorConfig} height={220} ariaLabel="Contributor commits bar chart" />
                </div>
              ) : (
                <div className="module-empty">
                  <span><Icon name="users" size={22} /></span>
                  <h3>No contributor signal yet</h3>
                  <p>Contributor rankings appear once commits carry author attribution.</p>
                </div>
              )}
            </section>
          </div>

          <section className="module-card analytics-row">
            <div className="module-card__header">
              <div>
                <h2>Project health</h2>
                <p>Workspace projects alongside event-stream recency</p>
              </div>
            </div>
            {health?.available ? (
              <div className="analytics-metrics analytics-metrics--row">
                <div className="analytics-metric">
                  <strong>{health.projectCount}</strong>
                  <small>Total projects</small>
                </div>
                <div className="analytics-metric">
                  <strong>{health.activeProjectCount}</strong>
                  <small>Active projects</small>
                </div>
                <div className="analytics-metric">
                  <strong>{health.totalTasks}</strong>
                  <small>Tracked tasks</small>
                </div>
                <div className="analytics-metric">
                  <strong>{overview.releaseCadence.available ? overview.releaseCadence.total : 0}</strong>
                  <small>Releases shipped</small>
                </div>
              </div>
            ) : (
              <div className="module-empty">
                <span><Icon name="health" size={22} /></span>
                <h3>No projects or events yet</h3>
                <p>Create a project or record activity and health signals start reporting here.</p>
                <Link className="module-btn module-btn--primary" to="/projects">
                  <Icon name="plus" size={15} /> Create a project
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
