import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useWorkspaceStore } from './store/workspaceStore';

// ─── Eager (always needed, tiny) ────────────────────────────────────────────
// Nothing from the landing page is eager-loaded anymore. The spinner and route
// guards below are the only synchronously-loaded UI.

// ─── Lazy Route-level Bundles ─────────────────────────────────────────────
// Each page is a separate async chunk so authenticated users never download
// landing-page code, and anonymous users never download Dashboard code.

// Landing page sections — grouped in one chunk so a single network request
// fetches the whole landing page after the first paint.
const Navbar              = lazy(() => import('./components/Navbar'));
const Hero                = lazy(() => import('./components/Hero'));
const InteractiveShowcase = lazy(() => import('./components/InteractiveShowcase'));
const TeamTabs            = lazy(() => import('./components/TeamTabs'));
const FeaturesGrid        = lazy(() => import('./components/FeaturesGrid'));
const Integrations        = lazy(() => import('./components/Integrations'));
const Testimonials        = lazy(() => import('./components/Testimonials'));
const FAQ                 = lazy(() => import('./components/FAQ'));
const Footer              = lazy(() => import('./components/Footer'));

// Auth — separate chunk, loaded only on /auth /login /signup
const Auth = lazy(() => import('./components/Auth'));

// Protected app pages
const Dashboard      = lazy(() => import('./components/Dashboard'));
const WorkspaceSetup = lazy(() => import('./components/WorkspaceSetup'));

// ─── Shared Loading Fallback ──────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="min-h-screen bg-dominant flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Route Guards ─────────────────────────────────────────────────────────

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

// ─── App ──────────────────────────────────────────────────────────────────

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
        {/* Landing Page — entire section loads as one lazy chunk */}
        <Route
          path="/"
          element={
            <Suspense fallback={<PageSpinner />}>
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
            </Suspense>
          }
        />

        {/* Authentication Pages */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Suspense fallback={<PageSpinner />}>
                <Auth initialView="login" onClose={() => navigate('/')} />
              </Suspense>
            </AuthRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthRoute>
              <Suspense fallback={<PageSpinner />}>
                <Auth initialView="signup" onClose={() => navigate('/')} />
              </Suspense>
            </AuthRoute>
          }
        />
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <Suspense fallback={<PageSpinner />}>
                <Auth initialView="login" onClose={() => navigate('/')} />
              </Suspense>
            </AuthRoute>
          }
        />

        {/* Protected Setup Page */}
        <Route
          path="/workspace-setup"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageSpinner />}>
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
              <Suspense fallback={<PageSpinner />}>
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
