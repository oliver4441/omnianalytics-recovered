import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import GitHubMark from '../../components/GitHubMark';
import Icon from '../../components/Icon';
import { formatAuthError, getCurrentUser, linkGitHub, logoutUser, unlinkGitHub } from '../../services/authService';
import { clearUser } from '../../store/slices/authSlice';
import './SettingsPage.css';

function SettingsPage({ user }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState([]);
  const [linking, setLinking] = useState(false);
  const [accountMessage, setAccountMessage] = useState({ type: '', text: '' });

  const refreshProviders = () => {
    const currentUser = getCurrentUser();
    const ids = (currentUser?.providerData || [])
      .map((entry) => entry.providerId)
      .filter(Boolean);
    setProviders(ids);
  };

  useEffect(() => {
    refreshProviders();
  }, []);

  const hasGithub = providers.includes('github.com');
  const hasPassword = providers.includes('password');
  // Never leave an account with zero sign-in methods.
  const canUnlinkGithub = hasGithub && providers.length > 1;

  const handleLinkGitHub = async () => {
    setLinking(true);
    setAccountMessage({ type: '', text: '' });
    try {
      await linkGitHub();
      refreshProviders();
      setAccountMessage({ type: 'success', text: 'GitHub is now connected to this account.' });
    } catch (linkError) {
      setAccountMessage({ type: 'error', text: formatAuthError(linkError) });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkGitHub = async () => {
    setLinking(true);
    setAccountMessage({ type: '', text: '' });
    try {
      await unlinkGitHub();
      refreshProviders();
      setAccountMessage({ type: 'success', text: 'GitHub disconnected from this account.' });
    } catch (unlinkError) {
      setAccountMessage({ type: 'error', text: formatAuthError(unlinkError) });
    } finally {
      setLinking(false);
    }
  };

  const selectTheme = (value) => {
    setTheme(value);
    window.dispatchEvent(new CustomEvent('omni-theme-change', { detail: value }));
  };

  const handleLogout = async () => {
    setSigningOut(true);
    setError('');
    try {
      await logoutUser();
      dispatch(clearUser());
      navigate('/login');
    } catch (logoutError) {
      setError(logoutError.message || 'Unable to sign out.');
      setSigningOut(false);
    }
  };

  return (
    <main className="settings-page">
      <header className="settings-page__heading">
        <span>Workspace</span>
        <h1>Settings</h1>
        <p>Manage this browser experience and review the active account.</p>
      </header>

      {error && <div className="settings-page__alert" role="alert"><Icon name="issue" size={16} /> {error}</div>}

      <div className="settings-page__layout">
        <section className="settings-card" aria-labelledby="appearance-heading">
          <div className="settings-card__icon"><Icon name="sun" size={18} /></div>
          <div className="settings-card__body">
            <h2 id="appearance-heading">Appearance</h2>
            <p>Choose the color theme saved for this browser.</p>
            <div className="settings-theme" role="group" aria-label="Color theme">
              <button aria-pressed={theme === 'light'} className={theme === 'light' ? 'is-active' : ''} type="button" onClick={() => selectTheme('light')}>
                <Icon name="sun" size={15} /> Light
              </button>
              <button aria-pressed={theme === 'dark'} className={theme === 'dark' ? 'is-active' : ''} type="button" onClick={() => selectTheme('dark')}>
                <Icon name="moon" size={15} /> Dark
              </button>
            </div>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="account-heading">
          <div className="settings-card__icon"><Icon name="users" size={18} /></div>
          <div className="settings-card__body">
            <h2 id="account-heading">Account identity</h2>
            <p>The Firebase Authentication identity active in this session.</p>
            <dl className="settings-account">
              <div><dt>Name</dt><dd>{user?.displayName || 'Not set'}</dd></div>
              <div><dt>Email</dt><dd>{user?.email || 'Unavailable'}</dd></div>
            </dl>
            <button className="settings-card__link" type="button" onClick={() => navigate('/profile')}>Open profile <Icon name="arrowRight" size={14} /></button>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="connections-heading">
          <div className="settings-card__icon"><Icon name="link" size={18} /></div>
          <div className="settings-card__body">
            <h2 id="connections-heading">Connected accounts</h2>
            <p>Link GitHub to sign in with it and keep your engineering identity available.</p>

            {accountMessage.text && (
              <p className={`settings-connections__message settings-connections__message--${accountMessage.type}`} role={accountMessage.type === 'error' ? 'alert' : 'status'}>
                {accountMessage.type === 'error' && <Icon name="issue" size={14} />}
                <span>{accountMessage.text}</span>
              </p>
            )}

            <ul className="settings-connections">
              <li>
                <span className="settings-connections__mark"><GitHubMark /></span>
                <div className="settings-connections__meta">
                  <strong>GitHub</strong>
                  <small>{hasGithub ? 'Connected' : 'Not connected'}</small>
                </div>
                {hasGithub ? (
                  <button className="settings-connections__unlink" disabled={linking || !canUnlinkGithub} type="button" onClick={handleUnlinkGitHub}>
                    {linking ? 'Working…' : 'Unlink'}
                  </button>
                ) : (
                  <button className="settings-connections__link" disabled={linking} type="button" onClick={handleLinkGitHub}>
                    {linking ? 'Working…' : 'Link GitHub'}
                  </button>
                )}
              </li>
              <li>
                <span className="settings-connections__mark"><Icon name="shield" size={15} /></span>
                <div className="settings-connections__meta">
                  <strong>Email &amp; password</strong>
                  <small>{hasPassword ? 'Connected' : 'Not connected'}</small>
                </div>                  {hasPassword && <span className="settings-connections__static">Primary</span>}
              </li>
            </ul>

            {hasGithub && !canUnlinkGithub && (
              <p className="settings-connections__note"><Icon name="shield" size={13} /> GitHub is your only sign-in method, so it can&apos;t be unlinked.</p>
            )}
          </div>
        </section>

        <section className="settings-card" aria-labelledby="security-heading">
          <div className="settings-card__icon"><Icon name="shield" size={18} /></div>
          <div className="settings-card__body settings-card__body--action">
            <div>
              <h2 id="security-heading">Session</h2>
              <p>Sign out of OmniAnalytics on this browser.</p>
            </div>
            <button className="settings-signout" disabled={signingOut} type="button" onClick={handleLogout}>
              <Icon name="logout" size={15} /> {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default SettingsPage;
