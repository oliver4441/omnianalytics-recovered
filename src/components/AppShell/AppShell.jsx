import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser } from '../../store/slices/authSlice';
import { logoutUser } from '../../services/authService';
import { FEATURE_STATES, getFeatureState } from '../../config/featureFlags';
import BrandMark from '../BrandMark';
import Icon from '../Icon';
import './AppShell.css';

const navigation = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', icon: 'overview', to: '/dashboard' },
      { label: 'Projects', icon: 'projects', to: '/projects' },
      { label: 'Issues', icon: 'issue', to: '/issues', flag: 'issueManagement' },
    ],
  },
  {
    label: 'Build & ship',
    items: [
      { label: 'Repositories', icon: 'branch', to: '/repositories', flag: 'githubIntegration' },
      { label: 'CI/CD', icon: 'pipeline', to: '/cicd', flag: 'cicdDashboard' },
      { label: 'Releases', icon: 'rocket', to: '/releases', flag: 'releaseManagement' },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { label: 'Integration overview', shortLabel: 'Overview', icon: 'overview', to: '/integrations', end: true, flag: 'integrationExplorer' },
      { label: 'Relationship graph', shortLabel: 'Graph', icon: 'graph', to: '/integrations/graph', flag: 'integrationExplorer' },
      { label: 'Provider accounts', shortLabel: 'Accounts', icon: 'users', to: '/integrations/accounts', flag: 'integrationExplorer' },
      { label: 'Connected repositories', shortLabel: 'Repositories', icon: 'branch', to: '/integrations/repositories', flag: 'integrationExplorer' },
      { label: 'Deployments', icon: 'rocket', to: '/integrations/deployments', flag: 'integrationExplorer' },
      { label: 'Connections', icon: 'link', to: '/integrations/connections', flag: 'integrationExplorer' },
      { label: 'Integration activity', shortLabel: 'Activity', icon: 'activity', to: '/integrations/activity', flag: 'integrationExplorer' },
      { label: 'Integration health', shortLabel: 'Health', icon: 'health', to: '/integrations/health', flag: 'integrationExplorer' },
    ],
  },
  {
    label: 'Operate',
    items: [
      { label: 'Analytics', icon: 'chart', to: '/analytics', flag: 'developerAnalytics' },
      { label: 'Security', icon: 'shield', to: '/security', flag: 'securityCenter' },
      { label: 'Documentation', icon: 'book', to: '/docs', flag: 'documentationWorkspace' },
    ],
  },
];

const commandItems = navigation.flatMap((group) => group.items);

const getPageTitle = (pathname) => {
  if (pathname.startsWith('/projects/')) return 'Project workspace';
  const match = commandItems.find((item) => item.to === pathname);
  if (match) return match.label;
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
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commandItems;
    return commandItems.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const goTo = (path) => {
    navigate(path);
    onClose();
  };

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
            aria-label="Search pages and actions"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) goTo(results[0].to);
            }}
            placeholder="Search pages and actions…"
            value={query}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-dialog__body">
          <span className="command-dialog__label">Navigate</span>
          {results.length ? (
            results.map((item) => (
              <button key={item.to} className="command-item" onClick={() => goTo(item.to)}>
                <span className="command-item__icon"><Icon name={item.icon} size={17} /></span>
                <span>{item.label}</span>
                <FeatureLabel flag={item.flag} />
                <Icon name="arrowRight" size={15} />
              </button>
            ))
          ) : (
            <div className="command-dialog__empty">No matching destination</div>
          )}
        </div>
        <div className="command-dialog__footer">
          <span><kbd>↵</kbd> to open</span>
          <span><kbd>⌘ K</kbd> quick search</span>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const projects = useSelector((state) => state.projects.projects);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('omni-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

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
  const activeProject = location.pathname.startsWith('/projects/')
    ? projects.find((project) => location.pathname.includes(project.id))
    : null;

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

        <button className="project-switcher" type="button">
          <span className="project-switcher__mark">OA</span>
          <span className="project-switcher__copy">
            <span>Workspace</span>
            <strong>{activeProject?.name || 'All projects'}</strong>
          </span>
          <Icon name="chevronDown" size={15} />
        </button>

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
              <strong>Preview workspace</strong>
              <small>Module flags active</small>
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
            <span>Search workspace…</span>
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
        <button onClick={() => setDrawerOpen(true)}><Icon name="more" size={20} /><span>More</span></button>
      </nav>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
