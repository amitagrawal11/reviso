import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader, Center } from '@mantine/core';
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

function Fallback() {
  return (
    <Center h="60vh">
      <Loader />
    </Center>
  );
}

/**
 * Root layout — see RealRoot in the previous design. Renders Landing for
 * logged-out guests on `/` (no Shell), Shell for logged-in users (with
 * Outlet so child routes render).
 */
function RealRoot() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (!usingSupabase) {
    return (
      <DataModeProvider mode="real">
        <Suspense fallback={<Fallback />}>
          <Shell />
        </Suspense>
      </DataModeProvider>
    );
  }

  // Render landing immediately for guests, even while supabase is still
  // loading. Supabase auth resolves in the background; if a session arrives
  // (cached/persisted), the next render of this component will swap to Shell.
  // Only show the spinner for *protected* paths during initial auth load.
  if (loading) {
    if (location.pathname === '/') {
      return (
        <Suspense fallback={<Fallback />}>
          <Landing />
        </Suspense>
      );
    }
    return <Fallback />;
  }

  if (!session) {
    if (location.pathname === '/') {
      return (
        <Suspense fallback={<Fallback />}>
          <Landing />
        </Suspense>
      );
    }
    return <Navigate to="/" replace />;
  }

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
