import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import Home from '../HomePage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

beforeEach(() => {
  mockRepo.clearAll();
});

function Wrap() {
  return (
    <AuthProvider>
      <DataModeProvider mode="demo">
        <Home />
      </DataModeProvider>
    </AuthProvider>
  );
}

describe('Home (empty / loading state)', () => {
  it('renders skeleton rows when items list starts empty', async () => {
    const { findByText, container } = renderWithProviders(<Wrap />);
    await findByText(/Welcome back/);
    // Skeletons render as Mantine .mantine-Skeleton-root
    const sks = container.querySelectorAll('.mantine-Skeleton-root');
    expect(sks.length).toBeGreaterThan(0);
  });
});
