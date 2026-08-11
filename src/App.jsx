import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store/store';
import { onAuthChange } from './services/authService';
import { clearUser, setUser } from './store/slices/authSlice';
import { ToastProvider } from './components/Toast';
import AppShell from './components/AppShell/AppShell';

// Pages
import LandingPage from './pages/LandingPage/LandingPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage/ProjectDetailPage';
import FeaturePreviewPage from './pages/FeaturePreviewPage/FeaturePreviewPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';

import './index.css';

function LoadingScreen() {
  return (
    <div className="loading-screen" role="status">
      <div className="loader" />
      <p>Loading OmniAnalytics…</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppContent() {
  const dispatch = useDispatch();
  const [user, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((authenticatedUser) => {
      if (authenticatedUser) {
        setUserData(authenticatedUser);
        dispatch(setUser({
          uid: authenticatedUser.uid,
          email: authenticatedUser.email,
          displayName: authenticatedUser.displayName || '',
        }));
      } else {
        setUserData(null);
        dispatch(clearUser());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch]);

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><LandingPage initialTab="signup" /></PublicRoute>} />

      <Route element={<ProtectedRoute><AppShell user={user} /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/issues" element={<FeaturePreviewPage />} />
        <Route path="/repositories" element={<FeaturePreviewPage />} />
        <Route path="/cicd" element={<FeaturePreviewPage />} />
        <Route path="/releases" element={<FeaturePreviewPage />} />
        <Route path="/analytics" element={<FeaturePreviewPage />} />
        <Route path="/security" element={<FeaturePreviewPage />} />
        <Route path="/docs" element={<FeaturePreviewPage />} />
        <Route path="/settings" element={<SettingsPage user={user} />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </Router>
    </Provider>
  );
}
