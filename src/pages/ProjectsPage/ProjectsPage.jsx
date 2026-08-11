import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createProject, deleteProject, getAllUserProjects } from '../../services/projectService';
import { getProjectTaskCount } from '../../services/taskService';
import { addProject, removeProject, setLoading, setProjects } from '../../store/slices/projectSlice';
import Icon from '../../components/Icon';
import './ProjectsPage.css';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { projects, loading } = useSelector((state) => state.projects);
  const currentUser = useSelector((state) => state.auth.user);
  const [showModal, setShowModal] = useState(() => searchParams.get('create') === '1');
  const [newProject, setNewProject] = useState({ name: '', description: '', dueDate: '' });
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    dispatch(setLoading(true));
    setLoadError('');
    try {
      const userProjects = await getAllUserProjects();
      const countResults = await Promise.allSettled(
        userProjects.map((project) => getProjectTaskCount(project.id)),
      );
      dispatch(setProjects(userProjects.map((project, index) => ({
        ...project,
        taskCount: countResults[index].status === 'fulfilled' ? countResults[index].value : null,
      }))));
    } catch (error) {
      setLoadError(error.message || 'Projects could not be loaded.');
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (searchParams.get('create') === '1') setShowModal(true);
  }, [searchParams]);

  const openCreateModal = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('create', '1');
    setSearchParams(nextParams, { replace: true });
    setShowModal(true);
  };

  const closeCreateModal = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('create');
    setSearchParams(nextParams, { replace: true });
    setShowModal(false);
    setFormError('');
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!showModal) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeCreateModal();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [closeCreateModal, showModal]);

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setFormError('');
    setCreating(true);

    try {
      if (!newProject.name.trim()) {
        setFormError('Project name is required.');
        return;
      }

      const projectId = await createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        dueDate: newProject.dueDate || null,
      });

      dispatch(addProject({
        id: projectId,
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        dueDate: newProject.dueDate || null,
        status: 'active',
        ownerId: currentUser?.uid,
        memberIds: currentUser?.uid ? [currentUser.uid] : [],
        teamMembers: currentUser ? [currentUser] : [],
        taskCount: 0,
      }));
      closeCreateModal();
      setNewProject({ name: '', description: '', dueDate: '' });
      navigate(`/projects/${projectId}`);
    } catch (error) {
      setFormError(error.message || 'Project could not be created.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Delete “${project.name}”? This action cannot be undone.`)) return;
    try {
      await deleteProject(project.id);
      dispatch(removeProject(project.id));
    } catch (error) {
      setLoadError(error.message || 'Project could not be deleted.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="projects-page">
      <header className="projects-heading">
        <div>
          <span className="projects-heading__eyebrow">Plan and coordinate</span>
          <h1>Projects</h1>
          <p>Connect delivery work, tasks, contributors, and engineering signals.</p>
        </div>
        <button className="projects-primary-action" onClick={openCreateModal}>
          <Icon name="plus" size={16} /> New project
        </button>
      </header>

      {loadError && (
        <div className="projects-alert" role="alert">
          <Icon name="issue" size={17} />
          <span>{loadError}</span>
          <button onClick={fetchProjects}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="projects-loading" role="status">
          <span className="projects-loading__spinner" />
          <p>Loading projects…</p>
        </div>
      ) : projects.length === 0 ? (
        <section className="projects-empty">
          <span className="projects-empty__icon"><Icon name="projects" size={27} /></span>
          <h2>Create your first project</h2>
          <p>Start with a real delivery initiative, then add tasks and invite the people who need access.</p>
          <button className="projects-primary-action" onClick={openCreateModal}>
            <Icon name="plus" size={16} /> Create project
          </button>
        </section>
      ) : (
        <section aria-label="Projects" className="projects-grid">
          {projects.map((project) => {
            const status = project.status || 'active';
            const memberCount = project.teamMembers?.length || project.memberIds?.length || 1;
            const isOwner = !project.ownerId || project.ownerId === currentUser?.uid;
            return (
              <article className="project-card" key={project.id}>
                <button className="project-card__open" onClick={() => navigate(`/projects/${project.id}`)}>
                  <span className="project-card__topline">
                    <span className="project-card__mark"><Icon name="cube" size={17} /></span>
                    <span className={`status-badge status-${status}`}><i />{status.replace('_', ' ')}</span>
                  </span>
                  <span className="project-card__copy">
                    <strong>{project.name}</strong>
                    <span>{project.description || 'No description provided.'}</span>
                  </span>
                  {project.dueDate && (
                    <span className="project-card__deadline">
                      <small><Icon name="calendar" size={13} /> Due {formatDate(project.dueDate)}</small>
                    </span>
                  )}
                  <span className="project-card__meta">
                    <span>
                      <Icon name="checkCircle" size={14} />
                      {typeof project.taskCount === 'number'
                        ? `${project.taskCount} ${project.taskCount === 1 ? 'task' : 'tasks'}`
                        : 'Tasks unavailable'}
                    </span>
                    <span><Icon name="users" size={14} /> {memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                    <Icon name="chevronRight" size={15} />
                  </span>
                </button>
                {isOwner && (
                  <div className="project-card__actions">
                    <button aria-label={`Delete ${project.name}`} onClick={() => handleDeleteProject(project)}>
                      Delete project
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {showModal && (
        <div className="project-modal-overlay" onMouseDown={closeCreateModal} role="presentation">
          <section
            aria-labelledby="create-project-title"
            aria-modal="true"
            className="project-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="project-modal__header">
              <div>
                <span>New workspace project</span>
                <h2 id="create-project-title">Create project</h2>
              </div>
              <button aria-label="Close create project dialog" onClick={closeCreateModal}>
                <Icon name="close" size={19} />
              </button>
            </header>
            <form onSubmit={handleCreateProject}>
              <label className="project-form-field" htmlFor="projectName">
                <span>Project name <i>Required</i></span>
                <input
                  autoFocus
                  id="projectName"
                  maxLength={120}
                  onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
                  placeholder="Payments reliability"
                  required
                  type="text"
                  value={newProject.name}
                />
              </label>
              <label className="project-form-field" htmlFor="projectDescription">
                <span>Description</span>
                <textarea
                  id="projectDescription"
                  maxLength={500}
                  onChange={(event) => setNewProject({ ...newProject, description: event.target.value })}
                  placeholder="What outcome is this project responsible for?"
                  rows="4"
                  value={newProject.description}
                />
              </label>
              <label className="project-form-field" htmlFor="projectDueDate">
                <span>Target date <i>Optional</i></span>
                <input
                  id="projectDueDate"
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(event) => setNewProject({ ...newProject, dueDate: event.target.value })}
                  type="datetime-local"
                  value={newProject.dueDate}
                />
              </label>
              {formError && <div className="project-form-error" role="alert"><Icon name="issue" size={15} /> {formError}</div>}
              <footer className="project-modal__actions">
                <button className="project-modal__cancel" onClick={closeCreateModal} type="button">Cancel</button>
                <button className="projects-primary-action" disabled={creating} type="submit">
                  {creating ? 'Creating…' : <><Icon name="plus" size={15} /> Create project</>}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
