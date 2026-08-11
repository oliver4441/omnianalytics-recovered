import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { logoutUser } from '../../services/authService';
import { clearUser } from '../../store/slices/authSlice';
import './SettingsPage.css';

function SettingsPage({ user }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

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
