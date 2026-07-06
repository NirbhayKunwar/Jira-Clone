import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import InteractiveShowcase from './components/InteractiveShowcase';
import TeamTabs from './components/TeamTabs';
import FeaturesGrid from './components/FeaturesGrid';
import Integrations from './components/Integrations';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Auth from './components/Auth';
const Dashboard = lazy(() => import('./components/Dashboard'));
const WorkspaceSetup = lazy(() => import('./components/WorkspaceSetup'));
import { useAuthStore } from './store/authStore';
import { useWorkspaceStore } from './store/workspaceStore';

// Protected Route Guard Component
function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Redirect to workspace setup if user hasn't configured one yet
  if (!user.hasConfiguredWorkspace && location.pathname !== '/workspace-setup') {
    return <Navigate to="/workspace-setup" replace />;
  }

  return children;
}

// Redirect authenticated users away from public auth pages
function AuthRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const from = location.state?.from;
  const redirectPath = from ? `${from.pathname}${from.search || ''}` : '/dashboard';

  if (user) {
    if (!user.hasConfiguredWorkspace) {
      return <Navigate to="/workspace-setup" replace />;
    }
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, mode, user, toggleMode, setTheme } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();

  // Sync theme/mode with DOM attributes
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', `${theme}-${mode}`);
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mode]);

  // Fetch workspaces list once authenticated
  useEffect(() => {
    if (user) {
      fetchWorkspaces(user, navigate, location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.hasConfiguredWorkspace, fetchWorkspaces]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname !== '/' || params.get('invite') !== 'profile') return;

    const profileTarget = { pathname: '/dashboard', search: '?tab=profile' };
    if (user) {
      navigate('/dashboard?tab=profile', { replace: true });
      return;
    }

    navigate('/auth', {
      replace: true,
      state: {
        from: profileTarget,
        email: params.get('email') || ''
      }
    });
  }, [location.pathname, location.search, navigate, user]);

  return (
    <div className="min-h-screen bg-dominant text-text-secondary selection:bg-accent-light selection:text-accent transition-colors duration-300">
      <Routes>
        {/* Landing Page */}
        <Route
          path="/"
          element={
            <>
              <Navbar theme={theme} setTheme={setTheme} mode={mode} toggleMode={toggleMode} onNavigate={(view) => navigate(view === 'landing' ? '/' : `/${view}`)} />
              <Hero onGetStarted={(email) => navigate('/auth', { state: { email, isSignUp: true } })} />
              <InteractiveShowcase />
              <TeamTabs />
              <FeaturesGrid />
              <Integrations />
              <Testimonials />
              <FAQ />
              <Footer onGetStarted={() => navigate('/auth', { state: { isSignUp: true } })} />
            </>
          }
        />

        {/* Authentication Pages */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Auth initialView="login" onClose={() => navigate('/')} />
            </AuthRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthRoute>
              <Auth initialView="signup" onClose={() => navigate('/')} />
            </AuthRoute>
          }
        />
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <Auth initialView="login" onClose={() => navigate('/')} />
            </AuthRoute>
          }
        />

        {/* Protected Setup Page */}
        <Route
          path="/workspace-setup"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen bg-dominant flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
                <WorkspaceSetup />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Protected Dashboard Page */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen bg-dominant flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Friendly profile route used by invite links */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard?tab=profile" replace />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
