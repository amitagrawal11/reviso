import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import { useAuth } from './lib/auth';
import { DataModeProvider, usingSupabase } from './lib/data-mode';

// Everything below is lazy. The landing page only needs Landing.tsx +
// AuthModalSimple → Login → supabase. Shell, Sidebar, DnD-kit, the markdown
// editor, dialogs, and the data-mode pages stay out of the landing critical
// path until the user signs in.
const Shell = lazy(() => import('./components/Shell'));
const Home = lazy(() => import('./pages/Home'));
const NoteView = lazy(() => import('./pages/NoteView'));
const NoteEdit = lazy(() => import('./pages/NoteEdit'));
const CollectionView = lazy(() => import('./pages/CollectionView'));
const Starred = lazy(() => import('./pages/Starred'));
const Recent = lazy(() => import('./pages/Recent'));
const Trash = lazy(() => import('./pages/Trash'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Landing = lazy(() => import('./pages/Landing'));

// Null fallback keeps the boot splash visible instead of flashing a spinner.
function Fallback() {
  return null;
}

/**
 * Root layout for the real (`/`) tree. Three states:
 *   1. Supabase NOT configured        → permanent guest. Landing on `/`;
 *                                        deeper paths bounce to `/demo` so
 *                                        the user has a working app surface.
 *   2. Supabase configured, no session → Landing on `/`; deeper paths → `/`.
 *   3. Supabase configured, with session → Shell (real data).
 *
 * Landing is the entry point for every unauthenticated arrival — including
 * the local-dev case (no env vars) where it used to be invisible.
 */
function RealRoot() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  const renderLanding = () => (
    <Suspense fallback={<Fallback />}>
      <Landing />
    </Suspense>
  );

  // No Supabase configured: auth will never resolve to a session, so the user
  // is a permanent guest. Show Landing on `/` and route deeper paths to
  // `/demo` (the public, no-auth-required application path). This matches
  // the architecture in docs/ARCHITECTURE.md: the demo tree is the canonical
  // no-auth surface; the real tree without Supabase has no extra value.
  if (!usingSupabase) {
    return isRoot ? renderLanding() : <Navigate to="/demo" replace />;
  }

  // Supabase configured but auth still resolving. Render Landing immediately
  // on `/` (no perceived blank screen) — once the session arrives this
  // component re-renders into Shell. Other paths show the spinner because
  // we don't yet know whether to allow them.
  if (loading) {
    return isRoot ? renderLanding() : <Fallback />;
  }

  // Auth resolved, no session: Landing on `/`, bounce everything else home.
  if (!session) {
    return isRoot ? renderLanding() : <Navigate to="/" replace />;
  }

  // Authenticated — real data, real Shell.
  return (
    <DataModeProvider mode="real">
      <Suspense fallback={<Fallback />}>
        <Shell />
      </Suspense>
    </DataModeProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<Fallback />}>
            <Login />
          </Suspense>
        }
      />

      {/* Demo tree — public, mock store, no auth required. */}
      <Route
        path="/demo"
        element={
          <DataModeProvider mode="demo">
            <Suspense fallback={<Fallback />}>
              <Shell />
            </Suspense>
          </DataModeProvider>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Fallback />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="recent"
          element={
            <Suspense fallback={<Fallback />}>
              <Recent />
            </Suspense>
          }
        />
        <Route
          path="starred"
          element={
            <Suspense fallback={<Fallback />}>
              <Starred />
            </Suspense>
          }
        />
        <Route
          path="trash"
          element={
            <Suspense fallback={<Fallback />}>
              <Trash />
            </Suspense>
          }
        />
        {/* Mirror real-tree /settings so the NavRail (and any nav surface
            that uses useModePath) has a working target in demo mode. The
            Settings page hides its account-only sections when there's no
            session, so the demo render is safe. */}
        <Route
          path="settings"
          element={
            <Suspense fallback={<Fallback />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="c/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <CollectionView />
            </Suspense>
          }
        />
        <Route
          path="n/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteView />
            </Suspense>
          }
        />
        <Route
          path="n/:id/edit"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteEdit />
            </Suspense>
          }
        />
      </Route>

      {/* Real tree. RealRoot renders either <Landing/> or <Shell/>. */}
      <Route path="/" element={<RealRoot />}>
        <Route
          index
          element={
            <Suspense fallback={<Fallback />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="recent"
          element={
            <Suspense fallback={<Fallback />}>
              <Recent />
            </Suspense>
          }
        />
        <Route
          path="starred"
          element={
            <Suspense fallback={<Fallback />}>
              <Starred />
            </Suspense>
          }
        />
        <Route
          path="trash"
          element={
            <Suspense fallback={<Fallback />}>
              <Trash />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<Fallback />}>
              <Profile />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<Fallback />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="c/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <CollectionView />
            </Suspense>
          }
        />
        <Route
          path="n/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteView />
            </Suspense>
          }
        />
        <Route
          path="n/:id/edit"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteEdit />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
