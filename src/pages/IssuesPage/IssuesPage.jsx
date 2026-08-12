import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import {
  createIssueRecord,
  deleteIssueRecord,
  filterIssues,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  listWorkspaceIssues,
  sortIssues,
  summarizeIssues,
  updateIssueRecord,
  validateIssueDraft,
} from '../../modules/issues';
import { getAllUserProjects } from '../../services/projectService';
import {
  removeIssue,
  setIssues,
  setIssuesError,
  setIssuesLoading,
} from '../../store/slices/issuesSlice';
import { setProjects } from '../../store/slices/projectSlice';
import '../ModulePages.css';
import './IssuesPage.css';

const emptyDraft = {
  title: '',
  description: '',
  priority: 'medium',
  severity: 'none',
  assignee: '',
  projectId: '',
};

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const statusBadge = (status) => {
  if (status === 'closed') return 'module-badge module-badge--neutral';
  if (status === 'in_progress') return 'module-badge module-badge--info';
  return 'module-badge module-badge--success';
};

const priorityBadge = (priority) => {
  if (priority === 'urgent') return 'module-badge module-badge--danger';
  if (priority === 'high') return 'module-badge module-badge--warning';
  if (priority === 'low') return 'module-badge module-badge--neutral';
  return 'module-badge module-badge--info';
};

export default function IssuesPage() {
  const dispatch = useDispatch();
  const { showError, showSuccess } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { issues, loading } = useSelector((state) => state.issues);
  const { projects } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth);
  const selectedProjectId = useSelector((state) => state.context.selectedProjectId);

  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', projectId: '', search: '' });
  const [sortId, setSortId] = useState('updated');
  const [editorOpen, setEditorOpen] = useState(() => searchParams.get('create') === '1');
  const [editingIssue, setEditingIssue] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftErrors, setDraftErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailIssue, setDetailIssue] = useState(null);

  const refreshIssues = useCallback(async () => {
    if (!user?.uid) return;
    dispatch(setIssuesLoading(true));
    setLoadError('');
    try {
      const records = await listWorkspaceIssues(user.uid);
      dispatch(setIssues(records));
    } catch (error) {
      setLoadError(error.message || 'Issues could not be loaded.');
      dispatch(setIssuesError(error.message || 'Issues could not be loaded.'));
    } finally {
      dispatch(setIssuesLoading(false));
    }
  }, [dispatch, user?.uid]);

  useEffect(() => {
    refreshIssues();
  }, [refreshIssues]);

  // Projects power the "link to project" picker; reuse the store cache first.
  useEffect(() => {
    if (projects.length) return undefined;
    let cancelled = false;
    getAllUserProjects()
      .then((records) => { if (!cancelled) dispatch(setProjects(records)); })
      .catch(() => { /* Project picker degrades to "no project" when unavailable. */ });
    return () => { cancelled = true; };
  }, [dispatch, projects.length]);

  useEffect(() => {
    if (searchParams.get('create') === '1') setEditorOpen(true);
  }, [searchParams]);

  // A selected workspace context scopes the issue list automatically.
  useEffect(() => {
    if (selectedProjectId) {
      setFilters((current) => ({ ...current, projectId: selectedProjectId }));
    }
  }, [selectedProjectId]);

  const visibleIssues = useMemo(
    () => sortIssues(filterIssues(issues, filters), sortId),
    [issues, filters, sortId],
  );
  const summary = useMemo(() => summarizeIssues(issues), [issues]);

  const openCreate = () => {
    setEditingIssue(null);
    setDraft(emptyDraft);
    setDraftErrors({});
    setFormError('');
    setEditorOpen(true);
  };

  const openEdit = (issue) => {
    setEditingIssue(issue);
    setDraft({
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      severity: issue.severity,
      assignee: issue.assignee,
      projectId: issue.projectId || '',
      status: issue.status,
    });
    setDraftErrors({});
    setFormError('');
    setDetailIssue(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingIssue(null);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  };

  const saveIssue = async (event) => {
    event.preventDefault();
    const validation = validateIssueDraft(draft);
    setDraftErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    setFormError('');
    const project = projects.find((candidate) => candidate.id === draft.projectId) || null;
    try {
      if (editingIssue) {
        await updateIssueRecord(editingIssue.id, {
          title: draft.title.trim(),
          description: draft.description.trim(),
          priority: draft.priority,
          severity: draft.severity,
          assignee: draft.assignee.trim(),
          projectId: project?.id || null,
          projectName: project?.name || '',
          status: draft.status || editingIssue.status,
        });
        showSuccess('Issue updated', `"${draft.title.trim()}" was saved.`);
      } else {
        await createIssueRecord({
          title: draft.title.trim(),
          description: draft.description.trim(),
          priority: draft.priority,
          severity: draft.severity,
          assignee: draft.assignee.trim(),
          projectId: project?.id || null,
          projectName: project?.name || '',
        });
        showSuccess('Issue created', `"${draft.title.trim()}" is now tracked.`);
      }
      closeEditor();
      await refreshIssues();
    } catch (error) {
      setFormError(error.message || 'The issue could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (issue, status) => {
    try {
      await updateIssueRecord(issue.id, { status });
      showSuccess(
        status === 'closed' ? 'Issue closed' : 'Issue reopened',
        `"${issue.title}" is now ${ISSUE_STATUS_LABELS[status] || status}.`,
      );
      setDetailIssue(null);
      await refreshIssues();
    } catch (error) {
      showError('Status update failed', error.message || 'The issue status could not be changed.');
    }
  };

  const removeIssueRecord = async (issue) => {
    try {
      await deleteIssueRecord(issue.id);
      dispatch(removeIssue(issue.id));
      showSuccess('Issue deleted', `"${issue.title}" was removed from the workspace.`);
      setDetailIssue(null);
    } catch (error) {
      showError('Delete failed', error.message || 'The issue could not be deleted.');
    }
  };

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span className="module-hero__eyebrow"><Icon name="issue" size={13} /> Plan</span>
          <h1>Issues</h1>
          <p>
            Track workspace issues end to end — priority, severity, ownership, and the project each
            one belongs to. Issues live in your workspace and persist across sessions.
          </p>
        </div>
        <div className="module-hero__actions">
          <button type="button" className="module-btn" onClick={refreshIssues} disabled={loading}>
            <Icon name="refresh" size={15} /> Refresh
          </button>
          <button type="button" className="module-btn module-btn--primary" onClick={openCreate}>
            <Icon name="plus" size={15} /> New issue
          </button>
        </div>
      </header>

      {loadError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p>
            <strong>Issue storage unavailable.</strong>
            {loadError} Your existing issues remain safe — reconnect and refresh.
          </p>
        </div>
      )}

      <section className="module-summary" aria-label="Issue totals">
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="issue" size={18} /></span>
          <p><strong>{summary.open}</strong><small>Open issues</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="zap" size={18} /></span>
          <p><strong>{summary.urgentOpen}</strong><small>Urgent &amp; open</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="checkCircle" size={18} /></span>
          <p><strong>{summary.closed}</strong><small>Closed</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="table" size={18} /></span>
          <p><strong>{summary.total}</strong><small>Total tracked</small></p>
        </div>
      </section>

      <div className="module-toolbar">
        <label className="module-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search title, description, assignee…"
            aria-label="Search issues"
          />
        </label>
        <select
          className="module-select"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {ISSUE_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
        <select
          className="module-select"
          value={filters.priority}
          onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {ISSUE_PRIORITIES.map((priority) => (
            <option key={priority.id} value={priority.id}>{priority.label}</option>
          ))}
        </select>
        <select
          className="module-select"
          value={filters.projectId}
          onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select
          className="module-select"
          value={sortId}
          onChange={(event) => setSortId(event.target.value)}
          aria-label="Sort issues"
        >
          <option value="updated">Recently updated</option>
          <option value="priority">Priority</option>
          <option value="created">Newest</option>
        </select>
      </div>

      <section className="module-card">
        {loading && !issues.length ? (
          <div className="module-loading" role="status">
            <span className="projects-loading__spinner" aria-hidden="true" />
            <p>Loading workspace issues…</p>
          </div>
        ) : !visibleIssues.length ? (
          <div className="module-empty">
            <span><Icon name="issue" size={22} /></span>
            <h3>{issues.length ? 'No issues match these filters' : 'No issues yet'}</h3>
            <p>
              {issues.length
                ? 'Adjust the filters or search to find what you are looking for.'
                : 'Create the first issue to start tracking work with priority, severity, and project context.'}
            </p>
            {!issues.length && (
              <button type="button" className="module-btn module-btn--primary" onClick={openCreate}>
                <Icon name="plus" size={15} /> Create issue
              </button>
            )}
          </div>
        ) : (
          <table className="module-table">
            <thead>
              <tr>
                <th scope="col">Issue</th>
                <th scope="col">Project</th>
                <th scope="col">Priority</th>
                <th scope="col">Severity</th>
                <th scope="col">Status</th>
                <th scope="col">Assignee</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleIssues.map((issue) => (
                <tr key={issue.id} className="issues-row" onClick={() => setDetailIssue(issue)}>
                  <td>
                    <strong>{issue.title}</strong>
                    {issue.description && <small>{issue.description.slice(0, 90)}{issue.description.length > 90 ? '…' : ''}</small>}
                  </td>
                  <td>{issue.projectName || '—'}</td>
                  <td><span className={priorityBadge(issue.priority)}>{ISSUE_PRIORITY_LABELS[issue.priority] || issue.priority}</span></td>
                  <td>{issue.severity === 'none' ? '—' : (ISSUE_SEVERITY_LABELS[issue.severity] || issue.severity)}</td>
                  <td><span className={statusBadge(issue.status)}>{ISSUE_STATUS_LABELS[issue.status] || issue.status}</span></td>
                  <td>{issue.assignee || 'Unassigned'}</td>
                  <td>{formatDateTime(issue.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {detailIssue && (
        <div className="module-modal-overlay" role="presentation" onMouseDown={() => setDetailIssue(null)}>
          <div
            className="module-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Issue ${detailIssue.title}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="module-modal__header">
              <div>
                <span>Issue detail</span>
                <h2>{detailIssue.title}</h2>
              </div>
              <button type="button" onClick={() => setDetailIssue(null)} aria-label="Close issue detail">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="issues-detail">
              <div className="issues-detail__badges">
                <span className={statusBadge(detailIssue.status)}>{ISSUE_STATUS_LABELS[detailIssue.status]}</span>
                <span className={priorityBadge(detailIssue.priority)}>{ISSUE_PRIORITY_LABELS[detailIssue.priority]} priority</span>
                {detailIssue.severity !== 'none' && (
                  <span className="module-badge module-badge--warning">{ISSUE_SEVERITY_LABELS[detailIssue.severity]} severity</span>
                )}
              </div>
              <dl className="issues-detail__meta">
                <div><dt>Project</dt><dd>{detailIssue.projectName || 'Not linked'}</dd></div>
                <div><dt>Assignee</dt><dd>{detailIssue.assignee || 'Unassigned'}</dd></div>
                <div><dt>Created</dt><dd>{formatDateTime(detailIssue.createdAt)}</dd></div>
                <div><dt>Updated</dt><dd>{formatDateTime(detailIssue.updatedAt)}</dd></div>
                {detailIssue.closedAt && <div><dt>Closed</dt><dd>{formatDateTime(detailIssue.closedAt)}</dd></div>}
              </dl>
              {detailIssue.description && <p className="issues-detail__description">{detailIssue.description}</p>}
              <div className="module-modal__actions">
                <button
                  type="button"
                  className="module-btn module-btn--danger module-btn--sm"
                  onClick={() => removeIssueRecord(detailIssue)}
                >
                  <Icon name="close" size={14} /> Delete
                </button>
                {detailIssue.status === 'closed' ? (
                  <button type="button" className="module-btn module-btn--sm" onClick={() => changeStatus(detailIssue, 'open')}>
                    <Icon name="refresh" size={14} /> Reopen
                  </button>
                ) : (
                  <button type="button" className="module-btn module-btn--sm" onClick={() => changeStatus(detailIssue, 'closed')}>
                    <Icon name="check" size={14} /> Close issue
                  </button>
                )}
                <button type="button" className="module-btn module-btn--primary module-btn--sm" onClick={() => openEdit(detailIssue)}>
                  <Icon name="settings" size={14} /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="module-modal-overlay" role="presentation" onMouseDown={closeEditor}>
          <div
            className="module-modal"
            role="dialog"
            aria-modal="true"
            aria-label={editingIssue ? 'Edit issue' : 'Create issue'}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="module-modal__header">
              <div>
                <span>{editingIssue ? 'Edit issue' : 'New issue'}</span>
                <h2>{editingIssue ? editingIssue.title : 'Track new work'}</h2>
              </div>
              <button type="button" onClick={closeEditor} aria-label="Close issue editor">
                <Icon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={saveIssue} noValidate>
              {formError && <p className="module-form-error" role="alert">{formError}</p>}
              <label>
                Title
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Short, action-oriented summary"
                  maxLength={140}
                  autoFocus
                />
                {draftErrors.title && <span className="module-form-error">{draftErrors.title}</span>}
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Reproduction steps, expected behavior, acceptance criteria…"
                />
              </label>
              <div className="module-modal__row">
                <label>
                  Priority
                  <select
                    value={draft.priority}
                    onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}
                  >
                    {ISSUE_PRIORITIES.map((priority) => (
                      <option key={priority.id} value={priority.id}>{priority.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Severity
                  <select
                    value={draft.severity}
                    onChange={(event) => setDraft((current) => ({ ...current, severity: event.target.value }))}
                  >
                    {ISSUE_SEVERITIES.map((severity) => (
                      <option key={severity.id} value={severity.id}>{severity.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="module-modal__row">
                <label>
                  Assignee
                  <input
                    type="text"
                    value={draft.assignee}
                    onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))}
                    placeholder="Teammate name or email"
                  />
                </label>
                <label>
                  Project
                  <select
                    value={draft.projectId}
                    onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {editingIssue && (
                <label>
                  Status
                  <select
                    value={draft.status || editingIssue.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                  >
                    {ISSUE_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>{status.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="module-modal__actions">
                <button type="button" className="module-btn" onClick={closeEditor} disabled={saving}>Cancel</button>
                <button type="submit" className="module-btn module-btn--primary" disabled={saving}>
                  <Icon name="check" size={15} /> {saving ? 'Saving…' : editingIssue ? 'Save changes' : 'Create issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
