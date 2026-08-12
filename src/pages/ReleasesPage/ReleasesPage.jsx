import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import {
  buildReadinessChecklist,
  buildReleaseMilestones,
  buildUnreleasedChangelog,
  createReleaseRecord,
  listPlannedReleases,
  loadReleaseDataset,
  RELEASE_STATUS_LABELS,
  validateReleaseDraft,
} from '../../modules/releases';
import '../ModulePages.css';
import './ReleasesPage.css';

const emptyDraft = { version: '', title: '', notes: '' };

const formatDate = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusBadge = (status) => {
  if (status === 'published') return 'module-badge module-badge--success';
  if (status === 'ready') return 'module-badge module-badge--info';
  return 'module-badge module-badge--neutral';
};

export default function ReleasesPage() {
  const { showSuccess, showWarning } = useToast();
  const { user } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const [dataset, setDataset] = useState(null);
  const [planned, setPlanned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [plannedError, setPlannedError] = useState('');
  const [plannerOpen, setPlannerOpen] = useState(() => searchParams.get('create') === '1');
  const [draft, setDraft] = useState(emptyDraft);
  const [draftErrors, setDraftErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedMilestone, setExpandedMilestone] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await loadReleaseDataset({ signal });
      setDataset(result);
    } catch (error) {
      if (error.name !== 'AbortError') setLoadError(error.message || 'Release metadata could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const refreshPlanned = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const records = await listPlannedReleases(user.uid);
      setPlanned(records);
      setPlannedError('');
    } catch (error) {
      setPlannedError(error.message || 'Planned releases could not be loaded.');
    }
  }, [user?.uid]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    refreshPlanned();
  }, [refreshPlanned]);

  useEffect(() => {
    if (searchParams.get('create') === '1') setPlannerOpen(true);
  }, [searchParams]);

  const milestones = useMemo(() => (dataset ? buildReleaseMilestones(dataset) : []), [dataset]);
  const unreleased = useMemo(() => (dataset ? buildUnreleasedChangelog(dataset) : []), [dataset]);
  const checklist = useMemo(
    () => (dataset ? buildReadinessChecklist(dataset, plannerOpen ? draft : {}) : []),
    [dataset, draft, plannerOpen],
  );
  const passedChecks = checklist.filter((check) => check.passed).length;

  const closePlanner = () => {
    setPlannerOpen(false);
    setDraft(emptyDraft);
    setDraftErrors({});
    setFormError('');
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  };

  const planRelease = async (event) => {
    event.preventDefault();
    const validation = validateReleaseDraft(draft);
    setDraftErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    setFormError('');
    try {
      await createReleaseRecord({
        version: draft.version.trim(),
        title: draft.title.trim(),
        notes: draft.notes.trim(),
        changelog: unreleased,
      });
      showSuccess('Release planned', `${draft.version.trim()} is tracked as a draft release.`);
      closePlanner();
      await refreshPlanned();
    } catch (error) {
      setFormError(error.message || 'The release could not be saved.');
      if (/network|offline|unavailable/i.test(error.message || '')) {
        showWarning('Storage unavailable', 'The release draft stays on screen — reconnect and save again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !dataset) {
    return (
      <div className="module-page">
        <div className="module-loading" role="status">
          <span className="projects-loading__spinner" aria-hidden="true" />
          <p>Loading release data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span className="module-hero__eyebrow"><Icon name="rocket" size={13} /> Ship</span>
          <h1>Release center</h1>
          <p>
            Versions and milestones from git tags, changelogs assembled from the commits between
            them, and a readiness checklist built from real workspace signals.
          </p>
        </div>
        <div className="module-hero__actions">
          <FreshnessIndicator timestamp={dataset?.generatedAt} failed={Boolean(loadError)} />
          <button type="button" className="module-btn" onClick={() => load(undefined)} disabled={loading}>
            <Icon name="refresh" size={15} /> Refresh
          </button>
          <button type="button" className="module-btn module-btn--primary" onClick={() => setPlannerOpen(true)}>
            <Icon name="plus" size={15} /> Plan a release
          </button>
        </div>
      </header>

      {loadError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p><strong>Metadata unavailable.</strong>{loadError}</p>
        </div>
      )}

      <section className="module-summary" aria-label="Release totals">
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="rocket" size={18} /></span>
          <p><strong>{milestones.length}</strong><small>Tagged milestones</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="gitCommit" size={18} /></span>
          <p><strong>{unreleased.length}</strong><small>Unreleased commits</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="calendar" size={18} /></span>
          <p><strong>{planned.length}</strong><small>Planned releases</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="checkCircle" size={18} /></span>
          <p><strong>{passedChecks}/{checklist.length}</strong><small>Readiness checks passing</small></p>
        </div>
      </section>

      <div className="module-grid-2">
        <div className="releases-column">
          <section className="module-card">
            <div className="module-card__header">
              <div>
                <h2>Milestones</h2>
                <p>Git tags recorded in the metadata snapshot, newest first</p>
              </div>
            </div>
            {milestones.length ? (
              <div className="releases-milestones">
                {milestones.map((milestone) => {
                  const expanded = expandedMilestone === milestone.id;
                  return (
                    <article key={milestone.id} className="releases-milestone">
                      <button
                        type="button"
                        className="releases-milestone__head"
                        onClick={() => setExpandedMilestone(expanded ? '' : milestone.id)}
                        aria-expanded={expanded}
                      >
                        <span className="releases-milestone__tag"><Icon name="rocket" size={15} /></span>
                        <span className="releases-milestone__title">
                          <strong>{milestone.version}</strong>
                          <small>tagged {formatDate(milestone.createdAt)} · commit {milestone.commit || 'unrecorded'}</small>
                        </span>
                        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={15} />
                      </button>
                      {expanded && (
                        <div className="releases-milestone__body">
                          {milestone.previousTag && (
                            <p className="releases-milestone__range">Changes since {milestone.previousTag}</p>
                          )}
                          {milestone.changelog.length ? (
                            <ul>
                              {milestone.changelog.map((entry) => <li key={entry}>{entry}</li>)}
                            </ul>
                          ) : (
                            <p className="releases-milestone__range">No commits recorded between this tag and the previous one.</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="module-empty">
                <span><Icon name="rocket" size={22} /></span>
                <h3>No tagged releases yet</h3>
                <p>
                  Milestones come from git tags in this repository. Plan a release below, tag it
                  (<code>git tag v1.0.0</code>), regenerate the metadata snapshot, and it lands here
                  with a changelog built from real commits.
                </p>
              </div>
            )}
          </section>

          <section className="module-card">
            <div className="module-card__header">
              <div>
                <h2>Unreleased changelog</h2>
                <p>Commits beyond the latest tag — the candidate notes for the next release</p>
              </div>
            </div>
            {unreleased.length ? (
              <ul className="releases-changelog">
                {unreleased.map((entry) => (
                  <li key={entry}><Icon name="gitCommit" size={13} /> <code>{entry}</code></li>
                ))}
              </ul>
            ) : (
              <div className="module-empty">
                <span><Icon name="check" size={22} /></span>
                <h3>Everything committed is already tagged</h3>
                <p>No new commits were recorded after the latest tag in this snapshot.</p>
              </div>
            )}
          </section>

          <section className="module-card">
            <div className="module-card__header">
              <div>
                <h2>Planned releases</h2>
                <p>Workspace release records you create here</p>
              </div>
            </div>
            {plannedError ? (
              <div className="module-empty">
                <span><Icon name="shield" size={22} /></span>
                <h3>Planned releases unavailable</h3>
                <p>{plannedError} Reconnect and refresh to load your release records.</p>
              </div>
            ) : planned.length ? (
              <div className="releases-milestones">
                {planned.map((release) => (
                  <article key={release.id} className="releases-milestone">
                    <div className="releases-milestone__head releases-milestone__head--static">
                      <span className="releases-milestone__tag"><Icon name="calendar" size={15} /></span>
                      <span className="releases-milestone__title">
                        <strong>{release.version} — {release.title}</strong>
                        <small>planned {formatDate(release.createdAt)}{release.notes ? ` · ${release.notes}` : ''}</small>
                      </span>
                      <span className={statusBadge(release.status)}>{RELEASE_STATUS_LABELS[release.status] || release.status}</span>
                    </div>
                    {release.changelog.length > 0 && (
                      <div className="releases-milestone__body">
                        <ul>
                          {release.changelog.slice(0, 12).map((entry) => <li key={entry}>{entry}</li>)}
                        </ul>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="module-empty">
                <span><Icon name="calendar" size={22} /></span>
                <h3>No planned releases</h3>
                <p>Draft a release to capture its version, notes, and the current unreleased changelog.</p>
                <button type="button" className="module-btn module-btn--primary" onClick={() => setPlannerOpen(true)}>
                  <Icon name="plus" size={15} /> Plan a release
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="module-card">
          <div className="module-card__header">
            <div>
              <h2>Readiness checklist</h2>
              <p>Each check reads a real workspace signal — open the planner to validate a version</p>
            </div>
          </div>
          <ul className="releases-checklist">
            {checklist.map((check) => (
              <li key={check.id}>
                <span className={`releases-checklist__mark releases-checklist__mark--${check.passed ? 'pass' : 'fail'}`} aria-hidden="true">
                  <Icon name={check.passed ? 'check' : 'close'} size={13} />
                </span>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {plannerOpen && (
        <div className="module-modal-overlay" role="presentation" onMouseDown={closePlanner}>
          <div
            className="module-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Plan a release"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="module-modal__header">
              <div>
                <span>Plan a release</span>
                <h2>Capture the next version</h2>
              </div>
              <button type="button" onClick={closePlanner} aria-label="Close release planner">
                <Icon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={planRelease} noValidate>
              {formError && <p className="module-form-error" role="alert">{formError}</p>}
              <div className="module-modal__row">
                <label>
                  Version
                  <input
                    type="text"
                    value={draft.version}
                    onChange={(event) => setDraft((current) => ({ ...current, version: event.target.value }))}
                    placeholder="v1.0.0"
                    autoFocus
                  />
                  {draftErrors.version && <span className="module-form-error">{draftErrors.version}</span>}
                </label>
                <label>
                  Title
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="What ships in this release"
                  />
                  {draftErrors.title && <span className="module-form-error">{draftErrors.title}</span>}
                </label>
              </div>
              <label>
                Release notes
                <textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Highlights, migration notes, anything the changelog does not say…"
                />
              </label>
              <div className="module-note">
                <span><Icon name="gitCommit" size={16} /></span>
                <p>
                  <strong>Changelog attached automatically.</strong>
                  The {unreleased.length} unreleased commit{unreleased.length === 1 ? '' : 's'} from the
                  current snapshot will be saved with this release record.
                </p>
              </div>
              <div className="module-modal__actions">
                <button type="button" className="module-btn" onClick={closePlanner} disabled={saving}>Cancel</button>
                <button type="submit" className="module-btn module-btn--primary" disabled={saving}>
                  <Icon name="check" size={15} /> {saving ? 'Saving…' : 'Save release draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
