import { describe, it, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import { Routes, Route } from 'react-router-dom';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';

import HomePage from '@/features/notes/pages/HomePage';
import RecentNotesPage from '@/features/notes/pages/RecentNotesPage';
import StarredNotesPage from '@/features/notes/pages/StarredNotesPage';
import TrashPage from '@/features/notes/pages/TrashPage';
import FolderPage from '@/features/notes/pages/FolderPage';
import NoteViewPage from '@/features/notes/pages/NoteViewPage';
import NoteEditPage from '@/features/notes/pages/NoteEditPage';
import LandingPage from '@/features/landing-page/LandingPage';
import SignInPage from '@/features/authentication/pages/SignInPage';
import UserProfilePage from '@/features/authentication/pages/UserProfilePage';
import SettingsPage from '@/features/authentication/pages/SettingsPage';

function Demo({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataModeProvider mode="demo">
        {children}
        <AdaptiveDialogHost />
      </DataModeProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  mockRepo.reset();
});

describe('HomePage', () => {
  it('renders welcome + quick actions', async () => {
    const { findByText } = renderWithProviders(
      <Demo>
        <HomePage />
      </Demo>,
    );
    await findByText(/Welcome back/i);
    await findByText(/Quick actions/i);
  });
});

describe('RecentNotesPage', () => {
  it('lists recent notes', async () => {
    const { findByText } = renderWithProviders(
      <Demo>
        <RecentNotesPage />
      </Demo>,
    );
    await findByText(/Recent/i);
  });
  it('shows empty state when no items', async () => {
    mockRepo.clearAll();
    const { findByText } = renderWithProviders(
      <Demo>
        <RecentNotesPage />
      </Demo>,
    );
    await findByText(/Nothing here yet/);
  });
});

describe('StarredNotesPage', () => {
  it('lists starred notes', async () => {
    const { findByText } = renderWithProviders(
      <Demo>
        <StarredNotesPage />
      </Demo>,
    );
    await findByText(/Starred/);
  });
  it('shows empty state', async () => {
    mockRepo.clearAll();
    const { findByText } = renderWithProviders(
      <Demo>
        <StarredNotesPage />
      </Demo>,
    );
    await findByText(/haven't starred/);
  });
});

describe('TrashPage', () => {
  it('shows empty trash message', async () => {
    const { findByText } = renderWithProviders(
      <Demo>
        <TrashPage />
      </Demo>,
    );
    await findByText(/Trash is empty/);
  });
  it('lists trashed items with empty-trash button', async () => {
    const item = mockRepo.create({ title: 'gone', isFolder: false });
    mockRepo.trash(item.id);
    const { findByText, findAllByText } = renderWithProviders(
      <Demo>
        <TrashPage />
      </Demo>,
    );
    await findByText('gone');
    await findAllByText(/Empty trash/);
  });
});

describe('FolderPage', () => {
  it('renders an existing collection', async () => {
    const { findAllByText } = renderWithProviders(
      <Routes>
        <Route
          path="/c/:id"
          element={
            <Demo>
              <FolderPage />
            </Demo>
          }
        />
      </Routes>,
      { initialEntries: ['/c/c-work'] },
    );
    await findAllByText('Work');
  });
});

describe('NoteViewPage', () => {
  it('renders a note', async () => {
    function Layout() {
      const { Outlet } = require('react-router-dom');
      return (
        <Demo>
          <Outlet
            context={{
              readMode: false,
              setReadMode: () => {},
              tocOpen: false,
              setTocOpen: () => {},
            }}
          />
        </Demo>
      );
    }
    const { findAllByText } = renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/n/:id" element={<NoteViewPage />} />
        </Route>
      </Routes>,
      { initialEntries: ['/n/n-welcome'] },
    );
    await findAllByText(/Welcome to the demo/);
  });
});

describe('NoteEditPage', () => {
  it('shows NoteNotFoundCard for missing note', async () => {
    const { findByText } = renderWithProviders(
      <Routes>
        <Route
          element={
            <Demo>
              <NoteEditPage />
            </Demo>
          }
          path="/n/:id/edit"
        />
      </Routes>,
      { initialEntries: ['/n/missing/edit'] },
    );
    await findByText(/Go home/i);
  });
  it('renders title + editor for existing note', async () => {
    const { findByDisplayValue } = renderWithProviders(
      <Routes>
        <Route
          element={
            <Demo>
              <NoteEditPage />
            </Demo>
          }
          path="/n/:id/edit"
        />
      </Routes>,
      { initialEntries: ['/n/n-welcome/edit'] },
    );
    await findByDisplayValue('Welcome to the demo');
  });
});

describe('LandingPage', () => {
  it('renders hero + footer', async () => {
    const { findByText } = renderWithProviders(
      <AuthProvider>
        <LandingPage />
      </AuthProvider>,
    );
    await findByText(/Reviso Notes stay yours/);
  });
});

describe('SignInPage', () => {
  it('renders the sign-in form', async () => {
    const { findByText } = renderWithProviders(
      <AuthProvider>
        <SignInPage />
      </AuthProvider>,
    );
    await findByText(/Welcome back/);
  });
  it('embedded sign-up renders without redirect', async () => {
    const { findByText } = renderWithProviders(
      <AuthProvider>
        <SignInPage embedded initialMode="signup" />
      </AuthProvider>,
    );
    await findByText(/Create your free account/);
  });
});

describe('UserProfilePage', () => {
  it('shows unavailable state when not using Supabase via demo', async () => {
    const { findAllByText } = renderWithProviders(
      <AuthProvider>
        <UserProfilePage />
      </AuthProvider>,
    );
    await findAllByText(/Profile/);
  });
});

describe('SettingsPage', () => {
  it('renders settings cards', async () => {
    const { findByText } = renderWithProviders(
      <AuthProvider>
        <DataModeProvider mode="demo">
          <SettingsPage />
        </DataModeProvider>
      </AuthProvider>,
    );
    await findByText(/Appearance/);
    await findByText(/Editor/);
  });
});
