import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useWorkspaceStore } from './store/workspaceStore';
import { useTheme } from './hooks/useTheme';

// ─── Eager (always needed, tiny) ────────────────────────────────────────────
// Nothing from the landing page is eager-loaded anymore. The spinner and route
// guards below are the only synchronously-loaded UI.

// ─── Lazy Route-level Bundles ─────────────────────────────────────────────
// Each page is a separate async chunk so authenticated users never download
// landing-page code, and anonymous users never download Dashboard code.

// Safe lazy wrapper that auto-reloads the page when Vercel deployments update chunk hashes
function safeLazy(importFn) {
  return lazy(async () => {
    try {
      const component = await importFn();
      sessionStorage.removeItem('chunk_retry');
      return component;
    } catch (error) {
      const isChunkLoadError =
        error &&
        (error.name === 'ChunkLoadError' ||
          error.message?.includes('Failed to fetch dynamically imported module') ||
          error.message?.includes('Importing a module script failed'));

      if (isChunkLoadError && !sessionStorage.getItem('chunk_retry')) {
        sessionStorage.setItem('chunk_retry', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

const LandingPage = safeLazy(() => import('./components/landing/LandingPage'));

// Auth — separate chunk, loaded only on /auth /login /signup
const Auth = safeLazy(() => import('./components/Auth'));

// Protected app pages
const Dashboard      = safeLazy(() => import('./components/Dashboard'));
const WorkspaceSetup = safeLazy(() => import('./components/WorkspaceSetup'));

import AppSplash from './components/common/AppSplash';

// ─── Shared Loading Fallback ──────────────────────────────────────────────
function PageSpinner() {
  return <AppSplash />;
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
  const { user } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  const { theme, mode, resolvedMode, setTheme, setMode, toggleMode } = useTheme();

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
        {/* Landing Page — enhanced with interactive workflow background and Lenis smooth scroll */}
        <Route
          path="/"
          element={
            <Suspense fallback={<PageSpinner />}>
              <LandingPage
                theme={theme}
                setTheme={setTheme}
                mode={mode}
                toggleMode={toggleMode}
                onNavigate={(view, state) => navigate(view === 'landing' ? '/' : `/${view}`, { state })}
              />
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
