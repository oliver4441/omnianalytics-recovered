import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import {
  createWorkspaceDocument,
  deleteWorkspaceDocument,
  listRepositoryDocuments,
  listWorkspaceDocuments,
  renderMarkdownLite,
  searchDocuments,
  updateWorkspaceDocument,
  validateDocumentDraft,
} from '../../modules/documentation';
import '../ModulePages.css';
import './DocsPage.css';

const formatDate = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function DocsPage() {
  const { showError, showSuccess } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [repoDocs, setRepoDocs] = useState([]);
  const [workspaceDocs, setWorkspaceDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [draftErrors, setDraftErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const documents = await listRepositoryDocuments({ signal });
      setRepoDocs(documents);
    } catch (error) {
      if (error.name !== 'AbortError') setLoadError(error.message || 'Repository documentation could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const refreshWorkspaceDocs = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const records = await listWorkspaceDocuments(user.uid);
      setWorkspaceDocs(records);
      setWorkspaceError('');
    } catch (error) {
      setWorkspaceError(error.message || 'Workspace documents could not be loaded.');
    }
  }, [user?.uid]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    refreshWorkspaceDocs();
  }, [refreshWorkspaceDocs]);

  const allDocs = useMemo(
    () => [...workspaceDocs, ...repoDocs].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    [workspaceDocs, repoDocs],
  );
  const visibleDocs = useMemo(() => searchDocuments(allDocs, search), [allDocs, search]);

  const selected = visibleDocs.find((document) => document.id === selectedId) || visibleDocs[0] || null;

  const renderedContent = useMemo(
    () => (selected ? renderMarkdownLite(selected.content) : ''),
    [selected],
  );

  const openCreate = () => {
    setEditingDoc(null);
    setDraft({ title: '', content: '' });
    setDraftErrors({});
    setFormError('');
    setEditorOpen(true);
  };

  const openEdit = (document) => {
    setEditingDoc(document);
    setDraft({ title: document.title, content: document.content });
    setDraftErrors({});
    setFormError('');
    setEditorOpen(true);
  };

  const saveDocument = async (event) => {
    event.preventDefault();
    const validation = validateDocumentDraft(draft);
    setDraftErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    setFormError('');
    try {
      if (editingDoc) {
        await updateWorkspaceDocument(editingDoc.id, {
          title: draft.title.trim(),
          content: draft.content,
        });
        showSuccess('Document updated', `"${draft.title.trim()}" was saved.`);
      } else {
        await createWorkspaceDocument({ title: draft.title.trim(), content: draft.content });
        showSuccess('Document created', `"${draft.title.trim()}" joined the workspace.`);
      }
      setEditorOpen(false);
      await refreshWorkspaceDocs();
    } catch (error) {
      setFormError(error.message || 'The document could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const removeDocument = async (document) => {
    try {
      await deleteWorkspaceDocument(document.id);
      showSuccess('Document deleted', `"${document.title}" was removed.`);
      if (selectedId === document.id) setSelectedId('');
      await refreshWorkspaceDocs();
    } catch (error) {
      showError('Delete failed', error.message || 'The document could not be deleted.');
    }
  };

  if (loading && !repoDocs.length) {
    return (
      <div className="module-page">
        <div className="module-loading" role="status">
          <span className="projects-loading__spinner" aria-hidden="true" />
          <p>Loading documentation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span className="module-hero__eyebrow"><Icon name="book" size={13} /> Operate</span>
          <h1>Documentation</h1>
          <p>
            Guides that ship with the repository alongside docs your team authors in the workspace —
            rendered in place with markdown support.
          </p>
        </div>
        <div className="module-hero__actions">
          <button type="button" className="module-btn" onClick={() => load(undefined)} disabled={loading}>
            <Icon name="refresh" size={15} /> Refresh
          </button>
          <button type="button" className="module-btn module-btn--primary" onClick={openCreate}>
            <Icon name="plus" size={15} /> New document
          </button>
        </div>
      </header>

      {loadError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p><strong>Repository docs unavailable.</strong>{loadError}</p>
        </div>
      )}
      {workspaceError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p>
            <strong>Workspace documents unavailable.</strong>
            {workspaceError} Repository documentation below still renders normally.
          </p>
        </div>
      )}

      <section className="module-summary" aria-label="Documentation totals">
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="book" size={18} /></span>
          <p><strong>{repoDocs.length}</strong><small>Repository documents</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="code" size={18} /></span>
          <p><strong>{workspaceDocs.length}</strong><small>Workspace documents</small></p>
        </div>
        <div className="module-stat">
          <span className="module-stat__icon"><Icon name="clock" size={18} /></span>
          <p><strong>{formatDate(allDocs[0]?.updatedAt)}</strong><small>Latest update</small></p>
        </div>
      </section>

      <div className="module-toolbar">
        <label className="module-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, paths, content…"
            aria-label="Search documents"
          />
        </label>
      </div>

      {!visibleDocs.length ? (
        <section className="module-card">
          <div className="module-empty">
            <span><Icon name="book" size={22} /></span>
            <h3>{search ? 'No documents match your search' : 'No documentation yet'}</h3>
            <p>
              {search
                ? 'Try a different phrase from the title, path, or body of a document.'
                : 'Add a README or AGENTS.md to the repository, or author the first workspace document here.'}
            </p>
            {!search && (
              <button type="button" className="module-btn module-btn--primary" onClick={openCreate}>
                <Icon name="plus" size={15} /> New document
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="module-grid-2 docs-layout">
          <section className="module-card">
            <div className="module-card__header">
              <div>
                <h2>Library</h2>
                <p>{visibleDocs.length} document{visibleDocs.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="docs-list" role="list">
              {visibleDocs.map((document) => (
                <div
                  role="listitem"
                  key={document.id}
                  className={`docs-row${selected?.id === document.id ? ' docs-row--active' : ''}`}
                >
                  <button
                    type="button"
                    className="docs-row__open"
                    onClick={() => setSelectedId(document.id)}
                  >
                    <span className="docs-row__icon">
                      <Icon name={document.origin === 'repository' ? 'book' : 'code'} size={16} />
                    </span>
                    <span className="docs-row__body">
                      <strong>{document.title}</strong>
                      <small>
                        {document.origin === 'repository' ? document.path : 'Workspace document'} ·
                        {' '}updated {formatDate(document.updatedAt)}
                      </small>
                    </span>
                    <span className={`module-badge ${document.origin === 'repository' ? 'module-badge--info' : 'module-badge--success'}`}>
                      {document.origin === 'repository' ? 'Repository' : 'Workspace'}
                    </span>
                  </button>
                  {document.origin === 'workspace' && (
                    <span className="docs-row__actions">
                      <button
                        type="button"
                        className="module-btn module-btn--sm"
                        onClick={() => openEdit(document)}
                        aria-label={`Edit ${document.title}`}
                      >
                        <Icon name="settings" size={13} />
                      </button>
                      <button
                        type="button"
                        className="module-btn module-btn--danger module-btn--sm"
                        onClick={() => removeDocument(document)}
                        aria-label={`Delete ${document.title}`}
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {selected && (
            <section className="module-card">
              <div className="module-card__header">
                <div>
                  <h2>{selected.title}</h2>
                  <p>
                    {selected.origin === 'repository'
                      ? `Rendered from ${selected.path} in the repository`
                      : 'Authored in this workspace'}
                  </p>
                </div>
              </div>
              <article
                className="docs-content"
                // Content is HTML-escaped by renderMarkdownLite before markup is applied.
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            </section>
          )}
        </div>
      )}

      {editorOpen && (
        <div className="module-modal-overlay" role="presentation" onMouseDown={() => setEditorOpen(false)}>
          <div
            className="module-modal"
            role="dialog"
            aria-modal="true"
            aria-label={editingDoc ? 'Edit document' : 'Create document'}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="module-modal__header">
              <div>
                <span>{editingDoc ? 'Edit document' : 'New workspace document'}</span>
                <h2>{editingDoc ? editingDoc.title : 'Author in markdown'}</h2>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} aria-label="Close document editor">
                <Icon name="close" size={16} />
              </button>
            </div>
            <form onSubmit={saveDocument} noValidate>
              {formError && <p className="module-form-error" role="alert">{formError}</p>}
              <label>
                Title
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Runbook, onboarding guide, ADR…"
                  autoFocus
                />
                {draftErrors.title && <span className="module-form-error">{draftErrors.title}</span>}
              </label>
              <label>
                Content (markdown)
                <textarea
                  className="docs-editor"
                  rows={12}
                  value={draft.content}
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                  placeholder={'## Purpose\n\n- What this covers\n- Who maintains it'}
                />
                {draftErrors.content && <span className="module-form-error">{draftErrors.content}</span>}
              </label>
              <div className="module-modal__actions">
                <button type="button" className="module-btn" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="module-btn module-btn--primary" disabled={saving}>
                  <Icon name="check" size={15} /> {saving ? 'Saving…' : editingDoc ? 'Save changes' : 'Create document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
