import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { logoutUser } from '../../services/authService';
import { getAllUserProjects } from '../../services/projectService';
import { clearUser } from '../../store/slices/authSlice';
import './ProfilePage.css';

function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAllUserProjects()
      .then((records) => {
        if (active) setProjects(records);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load workspace access.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => ({
    owned: projects.filter((project) => project.ownerId === user?.uid).length,
    shared: projects.filter((project) => project.ownerId !== user?.uid).length,
    active: projects.filter((project) => project.status !== 'completed').length,
  }), [projects, user?.uid]);

  const initials = (user?.displayName || user?.email || 'OA')
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

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
    <main className="account-page">
      <header className="account-page__heading">
        <div>
          <span>Account</span>
          <h1>Profile</h1>
          <p>Your OmniAnalytics identity and current project access.</p>
        </div>
        <button type="button" onClick={() => navigate('/settings')}>
          <Icon name="settings" size={15} /> Settings
        </button>
      </header>

      {error && <div className="account-page__alert" role="alert"><Icon name="issue" size={16} /> {error}</div>}

      <div className="account-page__layout">
        <section className="account-card account-card--identity" aria-labelledby="identity-heading">
          <span className="account-card__avatar" aria-hidden="true">{initials}</span>
          <div>
            <span>Signed-in identity</span>
            <h2 id="identity-heading">{user?.displayName || 'OmniAnalytics user'}</h2>
            <p>{user?.email || 'Email unavailable'}</p>
          </div>
          <span className="account-card__verified"><Icon name="checkCircle" size={14} /> Authenticated</span>
        </section>

        <section className="account-card" aria-labelledby="access-heading">
          <header>
            <div><span>Workspace</span><h2 id="access-heading">Project access</h2></div>
            <button type="button" onClick={() => navigate('/projects')}>View projects <Icon name="arrowRight" size={14} /></button>
          </header>
          {loading ? (
            <p className="account-card__loading">Loading project records…</p>
          ) : (
            <div className="account-access-grid">
              <div><strong>{projects.length}</strong><span>Visible projects</span></div>
              <div><strong>{summary.owned}</strong><span>Owned by you</span></div>
              <div><strong>{summary.shared}</strong><span>Shared with you</span></div>
              <div><strong>{summary.active}</strong><span>Not completed</span></div>
            </div>
          )}
          <p className="account-card__note"><Icon name="shield" size={14} /> Access is derived from explicit project ownership or active membership records.</p>
        </section>

        <section className="account-card account-card--session" aria-labelledby="session-heading">
          <div>
            <span>Session</span>
            <h2 id="session-heading">Sign-in controls</h2>
            <p>Signing out ends this browser session and returns you to the OmniAnalytics sign-in screen.</p>
          </div>
          <button disabled={signingOut} type="button" onClick={handleLogout}>
            <Icon name="logout" size={15} /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
