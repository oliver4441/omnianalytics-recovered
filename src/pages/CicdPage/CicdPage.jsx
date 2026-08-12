import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { loadRepositoryDataset } from '../../modules/repositories';
import { buildCicdOverview, buildRollbackContext, RUN_STATUS_LABELS } from '../../modules/cicd';
import '../ModulePages.css';
import './CicdPage.css';

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const formatDuration = (durationMs) => {
  if (!Number.isFinite(durationMs)) return null;
  if (durationMs < 1000) return `${durationMs} ms`;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const runBadge = (status) => {
  if (status === 'success') return 'module-badge module-badge--success';
  if (status === 'failure' || status === 'error') return 'module-badge module-badge--danger';
  if (status === 'degraded') return 'module-badge module-badge--warning';
  return 'module-badge module-badge--neutral';
};

export default function CicdPage() {
  const { showError, showSuccess } = useToast();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async (signal, { announce = false } = {}) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await loadRepositoryDataset({ signal });
      setDataset(result);
      if (announce) showSuccess('Pipeline data refreshed', `Snapshot from ${formatDateTime(result.generatedAt)}.`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setLoadError(error.message || 'Pipeline metadata could not be loaded.');
        showError('CI/CD unavailable', error.message || 'Pipeline metadata could not be loaded.');
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

  const overview = useMemo(() => (dataset ? buildCicdOverview(dataset) : null), [dataset]);
  const rollback = useMemo(() => (dataset ? buildRollbackContext(dataset) : null), [dataset]);

  if (loading && !dataset) {
    return (
      <div className="module-page">
        <div className="module-loading" role="status">
          <span className="projects-loading__spinner" aria-hidden="true" />
          <p>Loading pipeline data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span className="module-hero__eyebrow"><Icon name="pipeline" size={13} /> Ship</span>
          <h1>CI/CD</h1>
          <p>
            Deployment environments, pipeline runs, and release history for this workspace. Runs are
            shown exactly as delivery providers record them — unattended providers simply have no
            runs yet.
          </p>
        </div>
        <div className="module-hero__actions">
          <FreshnessIndicator timestamp={dataset?.generatedAt} failed={Boolean(loadError)} />
          <button type="button" className="module-btn" onClick={() => load(undefined, { announce: true })} disabled={loading}>
            <Icon name="refresh" size={15} /> Refresh
          </button>
          <Link className="module-btn module-btn--primary" to="/integrations">
            <Icon name="plus" size={15} /> Add provider
          </Link>
        </div>
      </header>

      {loadError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p><strong>Metadata unavailable.</strong>{loadError}</p>
        </div>
      )}

      {overview && (
        <>
          <section className="module-summary" aria-label="Pipeline totals">
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="activity" size={18} /></span>
              <p><strong>{overview.totals.runs}</strong><small>Runs recorded</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="checkCircle" size={18} /></span>
              <p><strong>{overview.totals.successfulRuns}</strong><small>Successful runs</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="server" size={18} /></span>
              <p><strong>{overview.totals.environments}</strong><small>Environments</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="rocket" size={18} /></span>
              <p><strong>{overview.totals.releases}</strong><small>Releases shipped</small></p>
            </div>
          </section>

          <div className="module-grid-2">
            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>Pipeline runs &amp; checks</h2>
                  <p>Deployment and workflow events from connected providers</p>
                </div>
              </div>
              {overview.hasAnyPipelineData ? (
                <table className="module-table">
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Resource</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actor</th>
                      <th scope="col">Duration</th>
                      <th scope="col">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.runs.map((run) => {
                      const duration = formatDuration(run.durationMs);
                      return (
                        <tr key={run.id}>
                          <td>
                            <strong>{run.eventType.replace(/_/g, ' ')}</strong>
                            <small>{run.provider}</small>
                          </td>
                          <td>{run.resource}</td>
                          <td><span className={runBadge(run.status)}>{RUN_STATUS_LABELS[run.status] || run.status}</span></td>
                          <td>{run.actor}</td>
                          <td>{duration || '—'}</td>
                          <td>{formatDateTime(run.timestamp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="module-empty">
                  <span><Icon name="pipeline" size={22} /></span>
                  <h3>No pipeline runs recorded yet</h3>
                  <p>
                    This workspace has a {overview.latestCommit ? 'deployable commit ' : 'repository '}
                    {overview.latestCommit ? `(${overview.latestCommit.metadata?.shortHash || 'latest'}) ` : ''}
                    but no delivery provider has recorded a run. Add GitHub Actions, Firebase
                    deployments, or another provider through the integration explorer; their events
                    then appear here with check results and durations.
                  </p>
                  <Link className="module-btn module-btn--primary" to="/integrations">
                    <Icon name="graph" size={15} /> Open integration explorer
                  </Link>
                </div>
              )}
            </section>

            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>Environments</h2>
                  <p>Parsed from committed hosting &amp; build configuration</p>
                </div>
              </div>
              {overview.environments.length ? (
                <ul className="cicd-environments">
                  {overview.environments.map((environment) => (
                    <li key={environment.id}>
                      <span className="cicd-environments__icon"><Icon name="server" size={15} /></span>
                      <div>
                        <strong>{environment.label}</strong>
                        <small>Declared in {environment.source}</small>
                      </div>
                      <span className="module-badge module-badge--info">Configured</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="module-empty">
                  <span><Icon name="server" size={22} /></span>
                  <h3>No environments detected</h3>
                  <p>
                    Hosting, database, and build targets are read from committed configuration such
                    as firebase.json or electron-builder.json. None were found in this snapshot.
                  </p>
                </div>
              )}
            </section>
          </div>

          <section className="module-card cicd-deployment-card">
            <div className="module-card__header">
              <div>
                <h2>Deployment history &amp; rollback context</h2>
                <p>Tagged releases powering rollbacks, newest first</p>
              </div>
            </div>
            {rollback?.available ? (
              <div className="cicd-rollback">
                <div className="cicd-rollback__lane">
                  <span className="module-badge module-badge--success">Current</span>
                  <strong>{rollback.current.version}</strong>
                  <small>commit {rollback.current.commit || 'unrecorded'} · {formatDateTime(rollback.current.createdAt)}</small>
                </div>
                <span className="cicd-rollback__arrow" aria-hidden="true"><Icon name="chevronLeft" size={16} /></span>
                <div className="cicd-rollback__lane">
                  <span className="module-badge module-badge--neutral">Rollback target</span>
                  <strong>{rollback.previous.version}</strong>
                  <small>commit {rollback.previous.commit || 'unrecorded'} · {formatDateTime(rollback.previous.createdAt)}</small>
                </div>
              </div>
            ) : (
              <div className="module-empty">
                <span><Icon name="clock" size={22} /></span>
                <h3>
                  {rollback?.current
                    ? 'One tagged release — no rollback target yet'
                    : 'No tagged releases yet'}
                </h3>
                <p>
                  Rollback context compares the two most recent git tags so an operator can see
                  exactly what a rollback would restore. {rollback?.current
                    ? `Tag another release and ${rollback.current.version} becomes restorable.`
                    : 'Plan the first release in the Release center, tag it, and rollback context starts here.'}
                </p>
                <Link className="module-btn" to="/releases">
                  <Icon name="rocket" size={15} /> Open release center
                </Link>
              </div>
            )}
          </section>

          <div className="module-note">
            <span><Icon name="zap" size={16} /></span>
            <p>
              <strong>How runs get here.</strong>
              CI/CD events land in the integration metadata snapshot when a delivery provider is
              connected and generating activity. The “Add provider” flow in the integration explorer
              walks through linking GitHub and recording Firebase deployments — OmniAnalytics never
              invents run or check records to fill this dashboard.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
