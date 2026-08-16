import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail, signUpWithEmail } from '../../services/authService';
import { setUser } from '../../store/slices/authSlice';
import BrandMark from '../../components/BrandMark';
import Icon from '../../components/Icon';
import './LandingPage.css';

const lifecycle = [
  { label: 'Plan', icon: 'projects' },
  { label: 'Build', icon: 'code' },
  { label: 'Review', icon: 'pullRequest' },
  { label: 'Ship', icon: 'rocket' },
  { label: 'Operate', icon: 'chart' },
  { label: 'Improve', icon: 'refresh' },
];

export default function LandingPage({ initialTab = 'login' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'signup') {
        if (formData.password !== formData.confirmPassword) throw new Error('Passwords do not match.');
        if (formData.password.length < 6) throw new Error('Password must be at least 6 characters.');
        const user = await signUpWithEmail(formData.email, formData.password, formData.displayName);
        dispatch(setUser({ uid: user.uid, email: user.email, displayName: user.displayName || formData.displayName }));
      } else {
        const user = await signInWithEmail(formData.email, formData.password);
        dispatch(setUser({ uid: user.uid, email: user.email, displayName: user.displayName || '' }));
      }
      navigate('/dashboard');
    } catch (submitError) {
      const message = submitError.message || 'Authentication failed. Please try again.';
      setError(message.replace('Firebase: ', '').replace(/\s*\(auth\/[\w-]+\)\.?/, ''));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    const target = tab === 'signup' ? '/signup' : '/login';
    if (window.location.pathname !== target) navigate(target);
  };

  return (
    <main className="omni-landing">
      <section className="landing-story">
        <div className="landing-story__glow landing-story__glow--one" />
        <div className="landing-story__glow landing-story__glow--two" />

        <header className="landing-brand">
          <BrandMark size={32} />
          <span>OmniAnalytics</span>
        </header>

        <div className="landing-story__content">
          <span className="landing-story__eyebrow"><i /> Engineering operations, unified</span>
          <h1>Build with context.<br /><em>Ship with confidence.</em></h1>
          <p>One focused workspace for the complete software lifecycle—from the first task to production health.</p>

          <div className="lifecycle-track" aria-label="Software delivery lifecycle">
            {lifecycle.map((stage, index) => (
              <div className="lifecycle-stage" key={stage.label}>
                <span><Icon name={stage.icon} size={17} /></span>
                <strong>{stage.label}</strong>
                {index < lifecycle.length - 1 && <i><Icon name="chevronRight" size={12} /></i>}
              </div>
            ))}
          </div>

          <div className="landing-proof">
            <div><span><Icon name="check" size={13} /></span><p><strong>Traceable by default</strong>Connect issues, tasks, commits, PRs, and releases.</p></div>
            <div><span><Icon name="check" size={13} /></span><p><strong>Actionable signals</strong>Measure bottlenecks, not vanity metrics.</p></div>
            <div><span><Icon name="check" size={13} /></span><p><strong>Built for your stack</strong>Responsive web, PWA, and desktop support.</p></div>
          </div>
        </div>

        <footer className="landing-story__footer">
          <span>© {new Date().getFullYear()} OmniAnalytics</span>
          <span>Developer workspace · Preview</span>
        </footer>
      </section>

      <section className="landing-auth" aria-label="Account access">
        <div className="landing-auth__mobile-brand">
          <BrandMark size={30} />
          <span>OmniAnalytics</span>
        </div>

        <div className="auth-panel">
          <div className="auth-panel__heading">
            <span className="auth-panel__kicker">Developer workspace</span>
            <h2>{activeTab === 'login' ? 'Welcome back' : 'Create your workspace'}</h2>
            <p>{activeTab === 'login' ? 'Sign in to continue to your engineering overview.' : 'Start connecting plans, code, and delivery signals.'}</p>
          </div>

          <div className="auth-segment" role="tablist" aria-label="Account action">
            <button aria-selected={activeTab === 'login'} className={activeTab === 'login' ? 'is-active' : ''} onClick={() => switchTab('login')} role="tab">Sign in</button>
            <button aria-selected={activeTab === 'signup'} className={activeTab === 'signup' ? 'is-active' : ''} onClick={() => switchTab('signup')} role="tab">Create account</button>
          </div>

          <form className="landing-auth-form" onSubmit={handleSubmit}>
            {activeTab === 'signup' && (
              <label>
                <span>Full name</span>
                <div className="landing-input"><Icon name="users" size={17} /><input autoComplete="name" name="displayName" onChange={handleChange} placeholder="Alex Morgan" required value={formData.displayName} /></div>
              </label>
            )}

            <label>
              <span>Work email</span>
              <div className="landing-input landing-input--email"><span className="landing-input__at">@</span><input autoComplete="email" name="email" onChange={handleChange} placeholder="you@company.com" required type="email" value={formData.email} /></div>
            </label>

            <label>
              <span>Password</span>
              <div className="landing-input"><Icon name="shield" size={17} /><input autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'} minLength={6} name="password" onChange={handleChange} placeholder="At least 6 characters" required type={showPassword ? 'text' : 'password'} value={formData.password} /><button aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} type="button">{showPassword ? 'Hide' : 'Show'}</button></div>
            </label>

            {activeTab === 'signup' && (
              <label>
                <span>Confirm password</span>
                <div className="landing-input"><Icon name="shield" size={17} /><input autoComplete="new-password" minLength={6} name="confirmPassword" onChange={handleChange} placeholder="Repeat your password" required type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} /></div>
              </label>
            )}

            {error && <div className="landing-auth-error" role="alert"><Icon name="issue" size={16} /><span>{error}</span></div>}

            <button className="landing-submit" disabled={loading} type="submit">
              {loading ? <><span className="landing-submit__spinner" /> Please wait…</> : <>{activeTab === 'login' ? 'Sign in to workspace' : 'Create account'} <Icon name="arrowRight" size={16} /></>}
            </button>
          </form>

          <div className="auth-panel__security"><Icon name="shield" size={14} /><span>Authentication secured by Firebase. Your password is never stored by OmniAnalytics.</span></div>
        </div>

        <footer className="landing-auth__footer"><span>Firebase Authentication</span><span aria-hidden="true">•</span><span>OmniAnalytics</span></footer>
      </section>
    </main>
  );
}
