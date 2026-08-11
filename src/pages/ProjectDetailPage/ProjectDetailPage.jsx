import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import TeamManagement from '../../components/TeamManagement';
import { getProject, updateProject } from '../../services/projectService';
import { createTask, deleteTask, getProjectTasks, updateTaskStatus } from '../../services/taskService';
import { addTask, deleteTask as removeTask, setTasks, updateTask } from '../../store/slices/taskSlice';
import './ProjectDetailPage.css';

const toDate = (value) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value, includeTime = false) => {
  const date = toDate(value);
  if (!date) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
};

function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { tasks } = useSelector((state) => state.tasks);

  const [project, setProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('tasks');

  const loadProjectAndTasks = useCallback(async () => {
    setProjectLoading(true);
    setTasksLoading(true);
    setError('');

    try {
      const projectData = await getProject(projectId);
      setProject(projectData);
      if (!projectData) {
        dispatch(setTasks([]));
        return;
      }

      setProjectLoading(false);
      const taskData = await getProjectTasks(projectId);
      dispatch(setTasks(taskData));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load this project.');
    } finally {
      setProjectLoading(false);
      setTasksLoading(false);
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    loadProjectAndTasks();
  }, [loadProjectAndTasks]);

  useEffect(() => {
    if (!showCreateModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !creatingTask) setShowCreateModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [creatingTask, showCreateModal]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (filter === 'open') return task.status !== 'done';
    if (filter === 'done') return task.status === 'done';
    return true;
  }), [filter, tasks]);

  const completedTasksCount = tasks.filter((task) => task.status === 'done').length;
  const openTasksCount = tasks.length - completedTasksCount;
  const activeMembers = (project?.teamMembers || []).filter((member) => member.status !== 'pending');
  const dueDate = toDate(project?.dueDate);
  const isOverdue = dueDate && dueDate.getTime() < Date.now() && project?.status !== 'completed';
  const isOwner = project?.ownerId === user?.uid;

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;

    setCreatingTask(true);
    setError('');
    try {
      const taskId = await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
      }, projectId);
      dispatch(addTask({
        id: taskId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        projectId,
        reporterId: user.uid,
        status: 'to_do',
        progressPercentage: 0,
      }));
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowCreateModal(false);
    } catch (createError) {
      setError(createError.message || 'Unable to create the task.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const status = task.status === 'done' ? 'to_do' : 'done';
    setError('');
    try {
      await updateTaskStatus(task.id, status);
      dispatch(updateTask({
        ...task,
        status,
        progressPercentage: status === 'done' ? 100 : 0,
      }));
    } catch (updateError) {
      setError(updateError.message || 'Unable to update the task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task? This action cannot be undone.')) return;
    setError('');
    try {
      await deleteTask(taskId);
      dispatch(removeTask(taskId));
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete the task.');
    }
  };

  const handleCompleteProject = async () => {
    if (!window.confirm('Mark this project as completed?')) return;
    setError('');
    try {
      await updateProject(projectId, { status: 'completed' });
      setProject((current) => ({ ...current, status: 'completed' }));
    } catch (updateError) {
      setError(updateError.message || 'Unable to complete the project.');
    }
  };

  if (projectLoading) {
    return (
      <main className="project-detail project-detail--state" aria-busy="true">
        <span className="project-detail__spinner" />
        <p>Loading project…</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="project-detail project-detail--state">
        <span className="project-detail__state-icon"><Icon name="projects" size={25} /></span>
        <h1>Project unavailable</h1>
        <p>{error || 'This project does not exist or you no longer have access.'}</p>
        <button className="project-detail__primary" type="button" onClick={() => navigate('/projects')}>
          Back to projects
        </button>
      </main>
    );
  }

  return (
    <main className="project-detail">
      <header className="project-detail__heading">
        <div>
          <button className="project-detail__back" type="button" onClick={() => navigate('/projects')}>
            <Icon name="chevronRight" size={15} /> Projects
          </button>
          <span className="project-detail__eyebrow">Project workspace</span>
          <h1>{project.name}</h1>
          <p>{project.description || 'No project description has been added.'}</p>
        </div>
        <button className="project-detail__primary" type="button" onClick={() => setShowCreateModal(true)}>
          <Icon name="plus" size={15} /> Add task
        </button>
      </header>

      {error && (
        <div className="project-detail__alert" role="alert">
          <Icon name="issue" size={16} /> <span>{error}</span>
          <button type="button" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      <section className="project-overview" aria-label="Project status">
        <div className="project-overview__main">
          <span className={`project-overview__status project-overview__status--${project.status || 'active'}`}>
            <i /> {(project.status || 'active').replace('_', ' ')}
          </span>
          <div className="project-overview__metrics">
            <div><span>Open tasks</span><strong>{openTasksCount}</strong></div>
            <div><span>Completed</span><strong>{completedTasksCount}</strong></div>
            <div><span>Members</span><strong>{activeMembers.length || 1}</strong></div>
          </div>
        </div>
        <div className="project-overview__aside">
          <span><Icon name="calendar" size={15} /> Due date</span>
          <strong className={isOverdue ? 'is-overdue' : ''}>
            {project.dueDate ? formatDate(project.dueDate, true) : 'Not set'}
            {isOverdue && <small>Overdue</small>}
          </strong>
          <span className="project-overview__created">Created {formatDate(project.createdAt)}</span>
          {project.status !== 'completed' && isOwner && (
            <button type="button" onClick={handleCompleteProject}>
              <Icon name="checkCircle" size={15} /> Mark complete
            </button>
          )}
        </div>
      </section>

      <div className="project-detail__tabs" role="tablist" aria-label="Project views">
        <button
          aria-controls="project-tasks-panel"
          aria-selected={activeTab === 'tasks'}
          className={activeTab === 'tasks' ? 'is-active' : ''}
          id="project-tasks-tab"
          role="tab"
          type="button"
          onClick={() => setActiveTab('tasks')}
        >
          <Icon name="checkCircle" size={15} /> Tasks <span>{tasks.length}</span>
        </button>
        <button
          aria-controls="project-team-panel"
          aria-selected={activeTab === 'team'}
          className={activeTab === 'team' ? 'is-active' : ''}
          id="project-team-tab"
          role="tab"
          type="button"
          onClick={() => setActiveTab('team')}
        >
          <Icon name="users" size={15} /> Team <span>{activeMembers.length || 1}</span>
        </button>
      </div>

      {activeTab === 'tasks' && (
        <section
          aria-labelledby="project-tasks-tab"
          className="project-tasks"
          id="project-tasks-panel"
          role="tabpanel"
        >
          <div className="project-tasks__toolbar">
            <div>
              <h2>Project tasks</h2>
              <p>Track the work attached to this project record.</p>
            </div>
            <div className="project-task-filters" aria-label="Filter tasks">
              {[
                ['all', 'All'],
                ['open', 'Open'],
                ['done', 'Completed'],
              ].map(([value, label]) => (
                <button
                  aria-pressed={filter === value}
                  className={filter === value ? 'is-active' : ''}
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tasksLoading ? (
            <div className="project-tasks__empty" aria-busy="true">Loading tasks…</div>
          ) : filteredTasks.length === 0 ? (
            <div className="project-tasks__empty">
              <span><Icon name="checkCircle" size={24} /></span>
              <h3>{tasks.length ? 'No tasks match this filter' : 'No tasks yet'}</h3>
              <p>{tasks.length ? 'Choose another status to view more work.' : 'Add the first unit of work for this project.'}</p>
              {!tasks.length && (
                <button className="project-detail__primary" type="button" onClick={() => setShowCreateModal(true)}>
                  <Icon name="plus" size={15} /> Add task
                </button>
              )}
            </div>
          ) : (
            <ul className="project-task-list">
              {filteredTasks.map((task) => (
                <li className={task.status === 'done' ? 'is-complete' : ''} key={task.id}>
                  <button
                    aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    className="project-task-list__check"
                    type="button"
                    onClick={() => handleToggleTaskStatus(task)}
                  >
                    {task.status === 'done' && <Icon name="check" size={13} strokeWidth={2.4} />}
                  </button>
                  <div>
                    <strong>{task.title}</strong>
                    {task.description && <p>{task.description}</p>}
                    <span>{task.status === 'done' ? 'Completed' : 'Open'}</span>
                  </div>
                  <button className="project-task-list__delete" type="button" onClick={() => handleDeleteTask(task.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'team' && (
        <section aria-labelledby="project-team-tab" id="project-team-panel" role="tabpanel">
          <TeamManagement project={project} onProjectUpdate={loadProjectAndTasks} />
        </section>
      )}

      {showCreateModal && (
        <div className="project-task-modal__overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !creatingTask) setShowCreateModal(false);
        }}>
          <section aria-labelledby="create-task-title" aria-modal="true" className="project-task-modal" role="dialog">
            <header>
              <div><span>Project task</span><h2 id="create-task-title">Add task</h2></div>
              <button aria-label="Close task dialog" disabled={creatingTask} type="button" onClick={() => setShowCreateModal(false)}>
                <Icon name="close" size={17} />
              </button>
            </header>
            <form onSubmit={handleCreateTask}>
              <label>
                <span>Task title</span>
                <input
                  autoFocus
                  maxLength="140"
                  placeholder="e.g. Add deployment health checks"
                  required
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                />
              </label>
              <label>
                <span>Description <i>Optional</i></span>
                <textarea
                  maxLength="1000"
                  placeholder="Add scope, acceptance criteria, or context"
                  rows="4"
                  value={newTaskDescription}
                  onChange={(event) => setNewTaskDescription(event.target.value)}
                />
              </label>
              <div className="project-task-modal__actions">
                <button disabled={creatingTask} type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="project-detail__primary" disabled={creatingTask || !newTaskTitle.trim()} type="submit">
                  {creatingTask ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default ProjectDetailPage;
