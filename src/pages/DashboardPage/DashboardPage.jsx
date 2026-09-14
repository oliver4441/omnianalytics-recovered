import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getAllUserProjects } from '../../services/projectService';
import { getProjectTaskCount } from '../../services/taskService';
import { setError, setLoading, setProjects } from '../../store/slices/projectSlice';
import Icon from '../../components/Icon';
import './DashboardPage.css';

const formatRelativeDate = (value) => {
  if (!value) return 'Update time unavailable';
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Update time unavailable';

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
};

const getProjectProgress = (project) => {
  if (project.status === 'completed') return 100;
  if (typeof project.progress === 'number') return Math.min(100, Math.max(0, project.progress));
  return 0;
};

function MetricCard({ icon, label, value, detail, tone = 'brand', action, onClick }) {
  // An undefined value signals the bounded loading state (see the stalled
  // timeout below); the skeleton renders instead of a permanent ellipsis.
  const loading = value === undefined;
  return (
    <button aria-busy={loading || undefined} className="overview-metric" onClick={onClick} type="button">
      <span className={`overview-metric__icon overview-metric__icon--${tone}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="overview-metric__body">
        <span className="overview-metric__label">{label}</span>
        {loading ? (
          <span aria-hidden="true" className="overview-metric__skeleton" />
        ) : (
          <strong className={value === '—' ? 'is-empty' : ''}>{value}</strong>
        )}
        {!loading && <span className="overview-metric__detail">{detail}</span>}
      </span>
      <span className="overview-metric__action">{action}<Icon name="chevronRight" size={14} /></span>
    </button>
  );
}

function SignalRow({ label, meta, status, tone = 'neutral', last = false }) {
  return (
    <div className={`signal-row ${last ? 'signal-row--last' : ''}`}>
      <span className={`signal-row__status signal-row__status--${tone}`}>
        <Icon name={tone === 'success' ? 'check' : tone === 'warning' ? 'issue' : 'circle'} size={13} />
      </span>
      <span className="signal-row__copy">
        <strong>{label}</strong>
        <small>{meta}</small>
      </span>
      <span className={`signal-row__result signal-row__result--${tone}`}>{status}</span>
    </div>
  );
}

function EmptyProjects({ onCreate }) {
  return (
    <div className="dashboard-empty">
      <span className="dashboard-empty__icon"><Icon name="projects" size={24} /></span>
      <h3>Create your first engineering project</h3>
      <p>Projects connect plans, tasks, repositories, releases, and operational signals in one place.</p>
      <button className="dashboard-button dashboard-button--primary" onClick={onCreate}>
        <Icon name="plus" size={16} /> Create project
      </button>
    </div>
  );
}

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projects, loading, error } = useSelector((state) => state.projects);
  const [stalled, setStalled] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user?.uid) return;
    dispatch(setLoading(true));
    try {
      const result = await getAllUserProjects();
      const countResults = await Promise.allSettled(
        result.map((project) => getProjectTaskCount(project.id))
      );
      dispatch(setProjects(result.map((project, index) => ({
        ...project,
        taskCount: countResults[index].status === 'fulfilled' ? countResults[index].value : null,
      }))));
    } catch (fetchError) {
      dispatch(setError(fetchError.message || 'Projects could not be loaded'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, user?.uid]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Bound the skeleton state: if project data has not resolved within a few
  // seconds (slow network, unavailable backend), settle on the true value so
  // the cards never sit on an unresolvable ellipsis.
  useEffect(() => {
    if (!loading) {
      setStalled(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setStalled(true), 6000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const stats = useMemo(() => {
    const active = projects.filter((project) => project.status !== 'completed').length;
    const countsAvailable = projects.every((project) => typeof project.taskCount === 'number');
    const tasks = countsAvailable
      ? projects.reduce((total, project) => total + project.taskCount, 0)
      : null;
    const completed = projects.filter((project) => project.status === 'completed').length;
    return { active, tasks, completed };
  }, [projects]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 4);
  }, [projects]);

  const today = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const firstName = user?.displayName?.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="engineering-dashboard">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-heading__date">{today}</span>
          <h1>{firstName ? `${greeting}, ${firstName}` : 'Engineering overview'}</h1>
          <p>See what needs attention across your software delivery lifecycle.</p>
        </div>
        <div className="dashboard-heading__actions">
          <button className="dashboard-button" onClick={() => navigate('/repositories')}>
            <Icon name="branch" size={16} /> Repository setup
          </button>
          <button className="dashboard-button dashboard-button--primary" onClick={() => navigate('/projects?create=1')}>
            <Icon name="plus" size={16} /> New project
          </button>
        </div>
      </section>

      {error && (
        <div className="dashboard-alert" role="alert">
          <Icon name="issue" size={17} />
          <span><strong>We could not refresh your projects.</strong> {error}</span>
          <button onClick={fetchProjects}>Try again</button>
        </div>
      )}

      <section aria-labelledby="overview-metrics-title">
        <div className="section-kicker">
          <div>
            <h2 id="overview-metrics-title">Engineering overview</h2>
            <span>Live workspace data</span>
          </div>
          <span className="date-control"><Icon name="calendar" size={15} /> All project data</span>
        </div>
        <div className="overview-metrics">
          <MetricCard
            action="View"
            detail={`${stats.completed} completed`}
            icon="projects"
            label="Active projects"
            onClick={() => navigate('/projects')}
            tone="brand"
            value={loading && !stalled ? undefined : stats.active}
          />
          <MetricCard
            action="Open"
            detail={stats.tasks === null ? 'Task counts unavailable' : 'Across visible projects'}
            icon="checkCircle"
            label="Tracked tasks"
            onClick={() => navigate('/projects')}
            tone="blue"
            value={loading && !stalled ? undefined : (stats.tasks ?? '—')}
          />
          <MetricCard
            action="Set up"
            detail="Issue source not connected"
            icon="issue"
            label="Open issues"
            onClick={() => navigate('/issues')}
            tone="amber"
            value="—"
          />
          <MetricCard
            action="Connect"
            detail="Repository data required"
            icon="pullRequest"
            label="Pull requests"
            onClick={() => navigate('/repositories')}
            tone="purple"
            value="—"
          />
          <MetricCard
            action="Configure"
            detail="No deployment provider"
            icon="rocket"
            label="Deployments"
            onClick={() => navigate('/cicd')}
            tone="green"
            value="—"
          />
          <MetricCard
            action="Add CI"
            detail="No workflow runs yet"
            icon="pipeline"
            label="Build status"
            onClick={() => navigate('/cicd')}
            tone="slate"
            value="—"
          />
        </div>
      </section>

      <div className="dashboard-grid dashboard-grid--primary">
        <section className="dashboard-panel project-panel">
          <div className="dashboard-panel__header">
            <div>
              <h2>Active projects</h2>
              <p>Current delivery work and project progress</p>
            </div>
            <button className="text-action" onClick={() => navigate('/projects')}>View all <Icon name="arrowRight" size={14} /></button>
          </div>

          {loading ? (
            <div className="project-table project-table--loading" aria-label="Loading projects">
              {[1, 2, 3].map((item) => <div className="dashboard-skeleton" key={item} />)}
            </div>
          ) : recentProjects.length === 0 ? (
            <EmptyProjects onCreate={() => navigate('/projects?create=1')} />
          ) : (
            <div className="project-table">
              <div className="project-table__head">
                <span>Project</span><span>Status</span><span>Tasks</span><span>Progress</span><span />
              </div>
              {recentProjects.map((project) => {
                const progress = getProjectProgress(project);
                return (
                  <button className="project-table__row" key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>
                    <span className="project-cell">
                      <span className="project-cell__icon"><Icon name="cube" size={16} /></span>
                      <span><strong>{project.name}</strong><small>{formatRelativeDate(project.updatedAt || project.createdAt)}</small></span>
                    </span>
                    <span><span className={`status-pill status-pill--${project.status || 'active'}`}><i />{(project.status || 'active').replace('_', ' ')}</span></span>
                    <span className="project-table__tasks">{project.taskCount ?? '—'}</span>
                    <span className="project-progress-cell">
                      <span className="project-progress-track"><i style={{ width: `${progress}%` }} /></span>
                      <small>{progress}%</small>
                    </span>
                    <span><Icon name="chevronRight" size={15} /></span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-panel delivery-panel">
          <div className="dashboard-panel__header">
            <div>
              <h2>Delivery readiness</h2>
              <p>Signals for your default environment</p>
            </div>
            <span className="preview-tag">Setup</span>
          </div>
          <div className="readiness-score">
            <div className="readiness-score__ring"><strong>0</strong><span>/ 4</span></div>
            <div><strong>Connect delivery signals</strong><p>Add a repository and CI provider to calculate release readiness.</p></div>
          </div>
          <div className="signal-list">
            <SignalRow label="Source" meta="Repository" status="Not connected" />
            <SignalRow label="Checks" meta="Tests and lint" status="No runs" />
            <SignalRow label="Security" meta="Dependency scan" status="Not configured" />
            <SignalRow label="Production" meta="Deployment" status="No provider" last />
          </div>
          <button className="dashboard-button dashboard-button--wide" onClick={() => navigate('/repositories')}>
            Review data connections <Icon name="arrowRight" size={15} />
          </button>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--secondary">
        <section className="dashboard-panel setup-panel">
          <div className="dashboard-panel__header">
            <div>
              <h2>Prepare your workspace</h2>
              <p>Review the engineering data setup areas</p>
            </div>
            <span className="setup-progress">0 of 3</span>
          </div>
          <div className="setup-actions">
            <button onClick={() => navigate('/repositories')}>
              <span className="setup-actions__number">1</span>
              <span className="setup-actions__icon"><Icon name="branch" size={19} /></span>
              <span><strong>Review repository setup</strong><small>Repository connections are currently in preview</small></span>
              <Icon name="arrowUpRight" size={16} />
            </button>
            <button onClick={() => navigate('/cicd')}>
              <span className="setup-actions__number">2</span>
              <span className="setup-actions__icon"><Icon name="pipeline" size={19} /></span>
              <span><strong>Review CI/CD setup</strong><small>Provider connections are not enabled yet</small></span>
              <Icon name="arrowUpRight" size={16} />
            </button>
            <button onClick={() => navigate('/security')}>
              <span className="setup-actions__number">3</span>
              <span className="setup-actions__icon"><Icon name="shield" size={19} /></span>
              <span><strong>Preview security posture</strong><small>Scanning signals require a future connection</small></span>
              <Icon name="arrowUpRight" size={16} />
            </button>
          </div>
        </section>

        <section className="dashboard-panel activity-panel">
          <div className="dashboard-panel__header">
            <div>
              <h2>Recent activity</h2>
              <p>Changes across this workspace</p>
            </div>
          </div>
          <div className="activity-list">
            {recentProjects.length ? recentProjects.slice(0, 3).map((project) => (
              <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>
                <span className="activity-list__icon activity-list__icon--purple"><Icon name="projects" size={16} /></span>
                <span><strong>Project record</strong><p>{project.name}</p><small>{formatRelativeDate(project.updatedAt || project.createdAt)}</small></span>
              </button>
            )) : (
              <div className="activity-list__empty">
                <span><Icon name="clock" size={20} /></span>
                <p>Project record changes will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
