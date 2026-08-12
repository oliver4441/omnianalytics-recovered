import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser } from '../../store/slices/authSlice';
import { persistProjectContext, selectProject } from '../../store/slices/contextSlice';
import { logoutUser } from '../../services/authService';
import { FEATURE_STATES, getFeatureState } from '../../config/featureFlags';
import { getIntegrationDataset, normalizeIntegrationDataset } from '../../modules/integrations';
import { buildCommandIndex, flattenCommandResults, queryCommandIndex } from '../../modules/search/index.js';
import BrandMark from '../BrandMark';
import Icon from '../Icon';
import './AppShell.css';

/**
 * Navigation is organized around developer objects and workflows — every
 * concept owns exactly one home. Deep explorer sections stay routable for
 * detail-panel/graph deep links but do not duplicate top-level concepts.
 */
const navigation = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', icon: 'overview', to: '/dashboard' },
      { label: 'Projects', icon: 'projects', to: '/projects' },
      { label: 'Repositories', icon: 'branch', to: '/repositories', flag: 'githubIntegration' },
      { label: 'Activity', icon: 'activity', to: '/activity', flag: 'engineeringActivity' },
    ],
  },
  {
    label: 'Engineering',
    items: [
      { label: 'Issues', icon: 'issue', to: '/issues', flag: 'issueManagement' },
      { label: 'CI/CD', icon: 'pipeline', to: '/cicd', flag: 'cicdDashboard' },
      { label: 'Releases', icon: 'rocket', to: '/releases', flag: 'releaseManagement' },
      { label: 'Analytics', icon: 'chart', to: '/analytics', flag: 'developerAnalytics' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { label: 'Graph', icon: 'graph', to: '/integrations/graph', flag: 'integrationExplorer' },
      { label: 'Integrations', icon: 'layers', to: '/integrations', end: true, flag: 'integrationExplorer' },
      { label: 'Connections', icon: 'link', to: '/integrations/connections', flag: 'integrationExplorer' },
    ],
  },
  {
    label: 'Operate',
    items: [
      { label: 'Security', icon: 'shield', to: '/security', flag: 'securityCenter' },
      { label: 'Documentation', icon: 'book', to: '/docs', flag: 'documentationWorkspace' },
    ],
  },
];

const commandItems = navigation.flatMap((group) => (
  group.items.map((item) => ({ ...item, group: group.label }))
));

/** Palette actions are real create flows — each lands on a working page. */
const paletteActions = [
  { id: 'action:new-project', label: 'Create project', path: '/projects?create=1', icon: 'plus', keywords: ['new', 'project'] },
  { id: 'action:new-issue', label: 'Create issue', path: '/issues?create=1', icon: 'issue', keywords: ['new', 'issue', 'bug'] },
  { id: 'action:plan-release', label: 'Plan a release', path: '/releases?create=1', icon: 'rocket', keywords: ['new', 'release', 'version'] },
  { id: 'action:open-graph', label: 'Open relationship graph', path: '/integrations/graph', icon: 'graph', keywords: ['infrastructure', 'trace'] },
];

const mobileMoreGroups = [
  {
    label: 'Build',
    items: [
      { label: 'Repositories', icon: 'branch', to: '/repositories' },
      { label: 'CI/CD', icon: 'pipeline', to: '/cicd' },
      { label: 'Releases', icon: 'rocket', to: '/releases' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { label: 'Graph', icon: 'graph', to: '/integrations/graph' },
      { label: 'Integrations', icon: 'layers', to: '/integrations' },
      { label: 'Connections', icon: 'link', to: '/integrations/connections' },
    ],
  },
  {
    label: 'Operate',
    items: [
      { label: 'Activity', icon: 'activity', to: '/activity' },
      { label: 'Analytics', icon: 'chart', to: '/analytics' },
      { label: 'Security', icon: 'shield', to: '/security' },
      { label: 'Documentation', icon: 'book', to: '/docs' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', icon: 'users', to: '/profile' },
      { label: 'Settings', icon: 'settings', to: '/settings' },
    ],
  },
];

const getPageTitle = (pathname) => {
  if (pathname.startsWith('/projects/')) return 'Project workspace';
  const exact = navigation
    .flatMap((group) => group.items)
    .find((item) => (item.end ? item.to === pathname : pathname.startsWith(item.to)));
  if (exact) return exact.label;
  const explorerTitles = {
    '/integrations/accounts': 'Provider accounts',
    '/integrations/repositories': 'Connected repositories',
    '/integrations/deployments': 'Deployments',
    '/integrations/activity': 'Integration activity',
    '/integrations/health': 'Integration health',
  };
  if (explorerTitles[pathname]) return explorerTitles[pathname];
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/profile') return 'Profile';
  return 'Workspace';
};

function FeatureLabel({ flag }) {
  if (!flag) return null;
  const state = getFeatureState(flag);
  if (state === FEATURE_STATES.ENABLED) return null;

  return (
    <span className={`app-nav__feature app-nav__feature--${state}`}>
      {state === FEATURE_STATES.INTERNAL ? 'Soon' : state}
    </span>
  );
}

function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dataset, setDataset] = useState(null);
  const projects = useSelector((state) => state.projects.projects);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // The object index (repositories, accounts) is read once per session from
  // the same attributed metadata the graph uses.
  useEffect(() => {
    if (!open || dataset) return undefined;
    const controller = new AbortController();
    getIntegrationDataset({ signal: controller.signal })
      .then((raw) => setDataset(normalizeIntegrationDataset(raw)))
      .catch(() => { /* Palette stays useful with navigation + projects only. */ });
    return () => controller.abort();
  }, [open, dataset]);

  const sections = useMemo(() => {
    const index = buildCommandIndex({ navigation: commandItems, projects, dataset, actions: paletteActions });
    return queryCommandIndex(index, query);
  }, [projects, dataset, query]);

  const flatResults = useMemo(() => flattenCommandResults(sections), [sections]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return undefined;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector('.command-item--active')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const goTo = (path) => {
    navigate(path);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, flatResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && flatResults[activeIndex]) {
      event.preventDefault();
      goTo(flatResults[activeIndex].path);
    }
  };

  let runningIndex = -1;

  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <div
        aria-label="Search OmniAnalytics"
        aria-modal="true"
        className="command-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-dialog__search">
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            aria-activedescendant={flatResults[activeIndex] ? `command-item-${activeIndex}` : undefined}
            aria-label="Search OmniAnalytics objects, actions, and pages"
            aria-controls="command-results"
            aria-expanded="true"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search objects, pages, actions…"
            role="combobox"
            spellCheck="false"
            value={query}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-dialog__body" id="command-results" ref={listRef} role="listbox">
          {sections.length ? sections.map((section) => (
            <div className="command-group" key={section.id}>
              <span className="command-dialog__label">{section.label}</span>
              {section.items.map((item) => {
                runningIndex += 1;
                const itemIndex = runningIndex;
                const active = itemIndex === activeIndex;
                return (
                  <button
                    aria-selected={active}
                    className={`command-item${active ? ' command-item--active' : ''}`}
                    id={`command-item-${itemIndex}`}
                    key={item.id}
                    onClick={() => goTo(item.path)}
                    onMouseEnter={() => setActiveIndex(itemIndex)}
                    role="option"
                  >
                    <span className="command-item__icon"><Icon name={item.icon || 'arrowRight'} size={17} /></span>
                    <span className="command-item__copy">
                      <span>{item.label}</span>
                      {item.hint && <small>{item.hint}</small>}
                    </span>
                    <Icon name="arrowRight" size={15} />
                  </button>
                );
              })}
            </div>
          )) : (
            <div className="command-dialog__empty">No matching objects or destinations</div>
          )}
        </div>
        <div className="command-dialog__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to open</span>
          <span><kbd>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

function ProjectSwitcher({ compact }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const projects = useSelector((state) => state.projects.projects);
  const selectedProjectId = useSelector((state) => state.context.selectedProjectId);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!anchorRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const selected = projects.find((project) => project.id === selectedProjectId) || null;

  const choose = (projectId) => {
    dispatch(selectProject(projectId));
    persistProjectContext(projectId);
    setOpen(false);
  };

  return (
    <div className="popover-anchor project-switcher-anchor" ref={anchorRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Workspace context: ${selected ? selected.name : 'All projects'}`}
        className="project-switcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="project-switcher__mark">{selected ? selected.name.slice(0, 2).toUpperCase() : 'OA'}</span>
        {!compact && (
          <span className="project-switcher__copy">
            <span>Workspace</span>
            <strong>{selected?.name || 'All projects'}</strong>
          </span>
        )}
        {!compact && <Icon name="chevronDown" size={15} />}
      </button>

      {open && (
        <div className="utility-popover project-switcher-popover" role="listbox" aria-label="Select project context">
          <div className="utility-popover__header"><strong>Workspace</strong></div>
          <button
            aria-selected={!selected}
            className="project-switcher-option"
            onClick={() => choose(null)}
            role="option"
          >
            <span className="project-switcher-option__mark project-switcher-option__mark--all"><Icon name="layers" size={14} /></span>
            <span className="project-switcher-option__copy">
              <strong>All projects</strong>
              <small>Every project in this workspace</small>
            </span>
            {!selected && <Icon name="check" size={15} />}
          </button>
          {projects.map((project) => (
            <button
              aria-selected={selected?.id === project.id}
              className="project-switcher-option"
              key={project.id}
              onClick={() => choose(project.id)}
              role="option"
            >
              <span className="project-switcher-option__mark">{project.name.slice(0, 2).toUpperCase()}</span>
              <span className="project-switcher-option__copy">
                <strong>{project.name}</strong>
                <small>{project.description || 'Project workspace'}</small>
              </span>
              {selected?.id === project.id && <Icon name="check" size={15} />}
            </button>
          ))}
          <span className="account-popover__divider" />
          <button
            className="project-switcher-option project-switcher-option--create"
            onClick={() => { setOpen(false); navigate('/projects?create=1'); }}
          >
            <span className="project-switcher-option__mark project-switcher-option__mark--all"><Icon name="plus" size={14} /></span>
            <span className="project-switcher-option__copy"><strong>Create project</strong></span>
          </button>
        </div>
      )}
    </div>
  );
}

function MobileMoreSheet({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="more-sheet-overlay" role="presentation" onMouseDown={onClose}>
      <div
        aria-label="More destinations"
        aria-modal="true"
        className="more-sheet"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="more-sheet__grip" aria-hidden="true" />
        {mobileMoreGroups.map((group) => (
          <div className="more-sheet__group" key={group.label}>
            <span className="more-sheet__label">{group.label}</span>
            <div className="more-sheet__grid">
              {group.items.map((item) => (
                <NavLink className="more-sheet__item" key={item.to} onClick={onClose} to={item.to}>
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppShell({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('omni-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const isDev = import.meta.env.DEV;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('omni-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event) => {
      if (event.detail === 'light' || event.detail === 'dark') setTheme(event.detail);
    };
    window.addEventListener('omni-theme-change', handleThemeChange);
    return () => window.removeEventListener('omni-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setNotificationsOpen(false);
    setAccountOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyboard = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setDrawerOpen(false);
        setNotificationsOpen(false);
        setAccountOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    dispatch(clearUser());
    navigate('/');
  };

  const userInitial = (user?.displayName || user?.email || 'O').charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <div
        aria-hidden="true"
        className={`app-shell__scrim ${drawerOpen ? 'is-visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`app-sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
        <div className="app-sidebar__brand">
          <NavLink className="brand-lockup" to="/dashboard" aria-label="OmniAnalytics home">
            <BrandMark size={30} />
            <span className="brand-lockup__name">OmniAnalytics</span>
          </NavLink>
          <button className="app-sidebar__close" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <ProjectSwitcher />

        <nav className="app-nav">
          {navigation.map((group) => (
            <div className="app-nav__group" key={group.label}>
              <span className="app-nav__label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  className={({ isActive }) => `app-nav__item ${isActive ? 'is-active' : ''}`}
                  end={item.end || item.to === '/dashboard'}
                  key={item.to}
                  title={item.label}
                  to={item.to}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="app-nav__item-label">{item.shortLabel || item.label}</span>
                  <FeatureLabel flag={item.flag} />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="app-sidebar__footer">
          <div className="environment-chip">
            <span className="environment-chip__dot" />
            <span className="environment-chip__copy">
              {isDev ? (
                <>
                  <strong>Development build</strong>
                  <small>Module flags visible</small>
                </>
              ) : (
                <>
                  <strong>OmniAnalytics workspace</strong>
                  <small>All systems operational</small>
                </>
              )}
            </span>
          </div>
          <NavLink className="app-nav__item" to="/settings" title="Settings">
            <Icon name="settings" size={18} />
            <span className="app-nav__item-label">Settings</span>
          </NavLink>
        </div>
      </aside>

      <div className="app-shell__workspace">
        <header className="app-topbar">
          <div className="app-topbar__start">
            <button className="icon-control app-topbar__menu" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>
              <Icon name="menu" size={21} />
            </button>
            <div className="app-topbar__title">
              <span className="app-topbar__eyebrow">OmniAnalytics</span>
              <strong>{getPageTitle(location.pathname)}</strong>
            </div>
          </div>

          <button className="global-search" onClick={() => setSearchOpen(true)}>
            <Icon name="search" size={18} />
            <span>Search OmniAnalytics…</span>
            <kbd>⌘ K</kbd>
          </button>

          <div className="app-topbar__actions">
            <button
              className="icon-control theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>

            <div className="popover-anchor">
              <button
                aria-expanded={notificationsOpen}
                aria-label="Notifications"
                className="icon-control notification-control"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setAccountOpen(false);
                }}
              >
                <Icon name="bell" size={19} />
              </button>
              {notificationsOpen && (
                <div className="utility-popover notification-popover">
                  <div className="utility-popover__header">
                    <strong>Notifications</strong>
                  </div>
                  <div className="notification-item notification-item--empty">
                    <span className="notification-item__icon"><Icon name="bell" size={17} /></span>
                    <div>
                      <strong>No notifications</strong>
                      <p>Activity from connected project records will appear here.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="popover-anchor">
              <button
                aria-expanded={accountOpen}
                className="account-control"
                onClick={() => {
                  setAccountOpen(!accountOpen);
                  setNotificationsOpen(false);
                }}
              >
                <span className="avatar avatar--sm">{userInitial}</span>
                <span className="account-control__copy">
                  <strong>{user?.displayName || 'Developer'}</strong>
                  <small>{user?.email || 'Workspace member'}</small>
                </span>
                <Icon name="chevronDown" size={14} />
              </button>
              {accountOpen && (
                <div className="utility-popover account-popover">
                  <button onClick={() => navigate('/profile')}><Icon name="users" size={17} /> Profile</button>
                  <button onClick={() => navigate('/settings')}><Icon name="settings" size={17} /> Settings</button>
                  <span className="account-popover__divider" />
                  <button className="account-popover__logout" onClick={handleLogout}><Icon name="logout" size={17} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content" id="main-content" tabIndex="-1">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard"><Icon name="overview" size={20} /><span>Overview</span></NavLink>
        <NavLink to="/projects"><Icon name="projects" size={20} /><span>Projects</span></NavLink>
        <NavLink to="/repositories"><Icon name="branch" size={20} /><span>Repos</span></NavLink>
        <NavLink to="/issues"><Icon name="issue" size={20} /><span>Issues</span></NavLink>
        <button aria-haspopup="dialog" onClick={() => setMoreOpen(true)}><Icon name="more" size={20} /><span>More</span></button>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
