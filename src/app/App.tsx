import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import { useAuth } from '@/features/authentication/context/AuthContext';
import { DataModeProvider, usingSupabase } from '@/features/notes/repository/NoteRepositoryContext';

// Everything below is lazy. The landing page only needs LandingPage.tsx +
// SignInModal → SignInPage → supabase. AppLayout, NotesSidebar, DnD-kit, the markdown
// editor, dialogs, and the data-mode pages stay out of the landing critical
// path until the user signs in.
const AppLayout = lazy(() => import('@/app/AppLayout'));
const HomePage = lazy(() => import('@/features/notes/pages/HomePage'));
const NoteViewPage = lazy(() => import('@/features/notes/pages/NoteViewPage'));
const NoteEditPage = lazy(() => import('@/features/notes/pages/NoteEditPage'));
const FolderPage = lazy(() => import('@/features/notes/pages/FolderPage'));
const StarredNotesPage = lazy(() => import('@/features/notes/pages/StarredNotesPage'));
const RecentNotesPage = lazy(() => import('@/features/notes/pages/RecentNotesPage'));
const TrashPage = lazy(() => import('@/features/notes/pages/TrashPage'));
const SignInPage = lazy(() => import('@/features/authentication/pages/SignInPage'));
const UserProfilePage = lazy(() => import('@/features/authentication/pages/UserProfilePage'));
const SettingsPage = lazy(() => import('@/features/authentication/pages/SettingsPage'));
const LandingPage = lazy(() => import('@/features/landing-page/LandingPage'));

// Null fallback keeps the boot splash visible instead of flashing a spinner.
function Fallback() {
  return null;
}

/**
 * Root layout for the real (`/`) tree. Three states:
 *   1. Supabase NOT configured        → permanent guest. LandingPage on `/`;
 *                                        deeper paths bounce to `/demo` so
 *                                        the user has a working app surface.
 *   2. Supabase configured, no session → LandingPage on `/`; deeper paths → `/`.
 *   3. Supabase configured, with session → AppLayout (real data).
 *
 * LandingPage is the entry point for every unauthenticated arrival — including
 * the local-dev case (no env vars) where it used to be invisible.
 */
function RealRoot() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  const renderLanding = () => (
    <Suspense fallback={<Fallback />}>
      <LandingPage />
    </Suspense>
  );

  // No Supabase configured: auth will never resolve to a session, so the user
  // is a permanent guest. Show LandingPage on `/` and route deeper paths to
  // `/demo` (the public, no-auth-required application path). This matches
  // the architecture in docs/ARCHITECTURE.md: the demo tree is the canonical
  // no-auth surface; the real tree without Supabase has no extra value.
  if (!usingSupabase) {
    return isRoot ? renderLanding() : <Navigate to="/demo" replace />;
  }

  // Supabase configured but auth still resolving. Render LandingPage immediately
  // on `/` (no perceived blank screen) — once the session arrives this
  // component re-renders into AppLayout. Other paths show the spinner because
  // we don't yet know whether to allow them.
  if (loading) {
    return isRoot ? renderLanding() : <Fallback />;
  }

  // Auth resolved, no session: LandingPage on `/`, bounce everything else home.
  if (!session) {
    return isRoot ? renderLanding() : <Navigate to="/" replace />;
  }

  // Authenticated — real data, real AppLayout.
  return (
    <DataModeProvider mode="real">
      <Suspense fallback={<Fallback />}>
        <AppLayout />
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
            <SignInPage />
          </Suspense>
        }
      />

      {/* Demo tree — public, mock store, no auth required. */}
      <Route
        path="/demo"
        element={
          <DataModeProvider mode="demo">
            <Suspense fallback={<Fallback />}>
              <AppLayout />
            </Suspense>
          </DataModeProvider>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Fallback />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="recent"
          element={
            <Suspense fallback={<Fallback />}>
              <RecentNotesPage />
            </Suspense>
          }
        />
        <Route
          path="starred"
          element={
            <Suspense fallback={<Fallback />}>
              <StarredNotesPage />
            </Suspense>
          }
        />
        <Route
          path="trash"
          element={
            <Suspense fallback={<Fallback />}>
              <TrashPage />
            </Suspense>
          }
        />
        {/* Mirror real-tree /settings so the NavRail (and any nav surface
            that uses useModePath) has a working target in demo mode. The
            SettingsPage page hides its account-only sections when there's no
            session, so the demo render is safe. */}
        <Route
          path="settings"
          element={
            <Suspense fallback={<Fallback />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="c/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <FolderPage />
            </Suspense>
          }
        />
        <Route
          path="n/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteViewPage />
            </Suspense>
          }
        />
        <Route
          path="n/:id/edit"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteEditPage />
            </Suspense>
          }
        />
      </Route>

      {/* Real tree. RealRoot renders either <LandingPage/> or <AppLayout/>. */}
      <Route path="/" element={<RealRoot />}>
        <Route
          index
          element={
            <Suspense fallback={<Fallback />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="recent"
          element={
            <Suspense fallback={<Fallback />}>
              <RecentNotesPage />
            </Suspense>
          }
        />
        <Route
          path="starred"
          element={
            <Suspense fallback={<Fallback />}>
              <StarredNotesPage />
            </Suspense>
          }
        />
        <Route
          path="trash"
          element={
            <Suspense fallback={<Fallback />}>
              <TrashPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<Fallback />}>
              <UserProfilePage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<Fallback />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="c/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <FolderPage />
            </Suspense>
          }
        />
        <Route
          path="n/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteViewPage />
            </Suspense>
          }
        />
        <Route
          path="n/:id/edit"
          element={
            <Suspense fallback={<Fallback />}>
              <NoteEditPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
