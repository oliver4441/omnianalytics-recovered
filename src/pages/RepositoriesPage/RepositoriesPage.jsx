import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from '../../components/Chart';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import {
  buildCommitActivitySeries,
  buildRepositorySummaries,
  eventTypeLabel,
  filterRepositories,
  loadRepositoryDataset,
  REPOSITORY_SORT_OPTIONS,
  sortRepositories,
} from '../../modules/repositories';
import '../ModulePages.css';
import './RepositoriesPage.css';

const formatDate = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function RepositoriesPage() {
  const { showError, showSuccess } = useToast();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('activity');
  const [selectedId, setSelectedId] = useState('');

  const load = useCallback(async (signal, { announce = false } = {}) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await loadRepositoryDataset({ signal });
      setDataset(result);
      if (announce) showSuccess('Repository metadata refreshed', `Snapshot from ${formatDateTime(result.generatedAt)}.`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setLoadError(error.message || 'Repository metadata could not be loaded.');
        showError('Repositories unavailable', error.message || 'Repository metadata could not be loaded.');
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

  const repositories = useMemo(
    () => (dataset ? sortRepositories(filterRepositories(buildRepositorySummaries(dataset), search), sortId) : []),
    [dataset, search, sortId],
  );

  const selected = repositories.find((repository) => repository.id === selectedId)
    || repositories[0]
    || null;

  const totals = useMemo(() => {
    if (!dataset) return { commits: 0, branches: 0, contributors: 0, releases: 0, pullRequests: 0 };
    const all = buildRepositorySummaries(dataset);
    return {
      commits: all.reduce((sum, repository) => sum + repository.commitCount, 0),
      branches: all.reduce((sum, repository) => sum + repository.branches.length, 0),
      contributors: new Set(all.flatMap((repository) => repository.contributors)).size,
      releases: all.reduce((sum, repository) => sum + repository.releases.length, 0),
      pullRequests: dataset.events.filter((event) => event.eventType.startsWith('pull_request')).length,
    };
  }, [dataset]);

  const activitySeries = useMemo(
    () => (dataset ? buildCommitActivitySeries(dataset.events, 8) : []),
    [dataset],
  );

  const activityConfig = useMemo(() => ({
    type: 'bar',
    data: {
      labels: activitySeries.map((bucket) => bucket.label),
      datasets: [{
        label: 'Commits per week',
        data: activitySeries.map((bucket) => bucket.count),
        backgroundColor: 'rgba(99, 91, 255, 0.55)',
        borderColor: 'rgba(99, 91, 255, 1)',
        borderWidth: 1,
        borderRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  }), [activitySeries]);

  const gitAccounts = useMemo(
    () => (dataset?.accounts || []).filter((account) => account.provider === 'github'),
    [dataset],
  );

  if (loading && !dataset) {
    return (
      <div className="module-page">
        <div className="module-loading" role="status">
          <span className="projects-loading__spinner" aria-hidden="true" />
          <p>Loading repository metadata…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span className="module-hero__eyebrow"><Icon name="branch" size={13} /> Source control</span>
          <h1>Repositories</h1>
          <p>
            Branches, commits, contributors, and release history derived from your workspace git
            metadata. Everything shown here is recorded activity — nothing is sampled.
          </p>
        </div>
        <div className="module-hero__actions">
          <FreshnessIndicator timestamp={dataset?.generatedAt} failed={Boolean(loadError)} />
          <button type="button" className="module-btn" onClick={() => load(undefined, { announce: true })} disabled={loading}>
            <Icon name="refresh" size={15} /> Refresh
          </button>
          <Link className="module-btn module-btn--primary" to="/integrations/repositories">
            <Icon name="graph" size={15} /> Integration explorer
          </Link>
        </div>
      </header>

      {loadError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p><strong>Metadata unavailable.</strong>{loadError}</p>
        </div>
      )}

      <section className="module-summary" aria-label="Repository totals">
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="branch" size={18} /></span>
          <p><strong>{repositories.length}</strong><small>Repositories</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="gitCommit" size={18} /></span>
          <p><strong>{totals.commits}</strong><small>Commits recorded</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="layers" size={18} /></span>
          <p><strong>{totals.branches}</strong><small>Branches</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="users" size={18} /></span>
          <p><strong>{totals.contributors}</strong><small>Contributors</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="rocket" size={18} /></span>
          <p><strong>{totals.releases}</strong><small>Tagged releases</small></p>
        </div>
      </section>

      <div className="module-grid-2">
        <section className="module-card">
          <div className="module-card__header">
            <div>
              <h2>Commit activity</h2>
              <p>Weekly commits across all tracked repositories</p>
            </div>
          </div>
          {activitySeries.some((bucket) => bucket.count > 0) ? (
            <div className="repositories-chart">
              <Chart config={activityConfig} height={220} ariaLabel="Weekly commit activity bar chart" />
            </div>
          ) : (
            <div className="module-empty">
              <span><Icon name="gitCommit" size={22} /></span>
              <h3>No commits in the last 8 weeks</h3>
              <p>Commit events appear here as they are recorded in the integration metadata snapshot.</p>
            </div>
          )}
        </section>

        <section className="module-card">
          <div className="module-card__header">
            <div>
              <h2>GitHub connection</h2>
              <p>Source-control accounts linked to this workspace</p>
            </div>
          </div>
          {gitAccounts.length ? (
            <ul className="repositories-accounts">
              {gitAccounts.map((account) => (
                <li key={account.id}>
                  <span className="repositories-accounts__avatar" aria-hidden="true">
                    <Icon name="users" size={16} />
                  </span>
                  <div>
                    <strong>{account.name}</strong>
                    <small>
                      GitHub · detected from local git remote ·
                      {' '}snapshot {formatDate(dataset?.generatedAt)}
                    </small>
                  </div>
                  <span className="module-badge module-badge--success">Linked</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="module-empty">
              <span><Icon name="link" size={22} /></span>
              <h3>Connect GitHub</h3>
              <p>
                No GitHub account is linked yet. Link one through the integration explorer and the
                next metadata snapshot will pick up its repositories.
              </p>
              <Link className="module-btn module-btn--primary" to="/integrations/accounts">
                <Icon name="plus" size={15} /> Connect GitHub
              </Link>
            </div>
          )}
          {gitAccounts.length > 0 && (
            <div className="module-note repositories-accounts__note">
              <span><Icon name="clock" size={16} /></span>
              <p>
                <strong>Refresh cadence.</strong>
                Account data is read from the local git remote each time the integration metadata is
                regenerated (on dev start and build). Use Refresh above after regeneration to pull
                the latest snapshot.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="module-toolbar">
        <label className="module-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search repositories, branches, contributors…"
            aria-label="Search repositories"
          />
        </label>
        <select
          className="module-select"
          value={sortId}
          onChange={(event) => setSortId(event.target.value)}
          aria-label="Sort repositories"
        >
          {REPOSITORY_SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>

      {!repositories.length ? (
        <section className="module-card">
          <div className="module-empty">
            <span><Icon name="branch" size={22} /></span>
            <h3>{search ? 'No repositories match your search' : 'No repositories recorded yet'}</h3>
            <p>
              {search
                ? 'Try a different name, branch, or contributor.'
                : 'Repository resources appear here once they are recorded in the integration metadata snapshot.'}
            </p>
          </div>
        </section>
      ) : (
        <div className="module-grid-2">
          <section className="module-card">
            <div className="module-card__header">
              <div>
                <h2>Tracked repositories</h2>
                <p>{repositories.length} recorded in the latest snapshot</p>
              </div>
            </div>
            <div className="repositories-list" role="list">
              {repositories.map((repository) => (
                <button
                  type="button"
                  role="listitem"
                  key={repository.id}
                  className={`repositories-row${selected?.id === repository.id ? ' repositories-row--active' : ''}`}
                  onClick={() => setSelectedId(repository.id)}
                >
                  <span className="repositories-row__icon"><Icon name="branch" size={17} /></span>
                  <span className="repositories-row__body">
                    <strong>{repository.fullName}</strong>
                    <small>
                      {repository.provider} · {repository.branches.length} branch{repository.branches.length === 1 ? '' : 'es'} ·
                      {' '}{repository.commitCount} commit{repository.commitCount === 1 ? '' : 's'}
                    </small>
                  </span>
                  <span className="repositories-row__meta">
                    {repository.readmePresent && <span className="module-badge module-badge--info">README</span>}
                    <small>{formatDate(repository.lastActivityAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>{selected.name}</h2>
                  <p>Default branch {selected.defaultBranch || 'unknown'} · latest commit {selected.latestCommit || 'unrecorded'}</p>
                </div>
              </div>
              <div className="repositories-detail">
                <div className="repositories-detail__group">
                  <h3><Icon name="layers" size={14} /> Branches ({selected.branches.length})</h3>
                  {selected.branches.length ? (
                    <div className="repositories-tags">
                      {selected.branches.map((branch) => (
                        <span key={branch} className={`module-badge ${branch === selected.defaultBranch ? 'module-badge--success' : 'module-badge--neutral'}`}>
                          {branch}
                        </span>
                      ))}
                    </div>
                  ) : <p className="repositories-detail__empty">No branches recorded.</p>}
                </div>

                <div className="repositories-detail__group">
                  <h3><Icon name="users" size={14} /> Contributors ({selected.contributors.length})</h3>
                  {selected.contributors.length ? (
                    <ul className="repositories-contributors">
                      {selected.contributors.map((contributor) => (
                        <li key={contributor}><Icon name="checkCircle" size={13} /> {contributor}</li>
                      ))}
                    </ul>
                  ) : <p className="repositories-detail__empty">No contributors recorded.</p>}
                </div>

                <div className="repositories-detail__group">
                  <h3><Icon name="pullRequest" size={14} /> Pull requests</h3>
                  {selected.pullRequestEvents.length ? (
                    <ul className="repositories-events">
                      {selected.pullRequestEvents.slice(0, 6).map((event) => (
                        <li key={event.id}>
                          <strong>{eventTypeLabel(event.eventType)}</strong>
                          <small>{event.metadata?.summary || ''} · {formatDateTime(event.timestamp)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="repositories-detail__empty">
                      No pull request events recorded yet. Once a GitHub provider syncs pull requests
                      into the metadata snapshot, they appear here with review status.
                    </p>
                  )}
                </div>

                <div className="repositories-detail__group">
                  <h3><Icon name="activity" size={14} /> Recent activity</h3>
                  {selected.events.length ? (
                    <ul className="repositories-events">
                      {selected.events.slice(0, 6).map((event) => (
                        <li key={event.id}>
                          <strong>{eventTypeLabel(event.eventType)}</strong>
                          <small>{event.metadata?.summary || event.actor?.name || ''} · {formatDateTime(event.timestamp)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="repositories-detail__empty">No activity recorded for this repository yet.</p>}
                </div>

                <div className="repositories-detail__group">
                  <h3><Icon name="rocket" size={14} /> Tagged releases ({selected.releases.length})</h3>
                  {selected.releases.length ? (
                    <div className="repositories-tags">
                      {selected.releases.map((release) => (
                        <span key={release.id} className="module-badge module-badge--success">
                          {release.metadata?.version || release.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="repositories-detail__empty">
                      No git tags yet. Plan the first release from the{' '}
                      <Link to="/releases">Release center</Link>.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
