import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NotesSidebar from '@/features/notes/sidebar/NotesSidebar';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';

function Wrapped({ closeMobile }: { closeMobile?: () => void } = {}) {
  return (
    <AuthProvider>
      <DataModeProvider mode="demo">
        <NotesSidebar closeMobile={closeMobile} />
        <AdaptiveDialogHost />
      </DataModeProvider>
    </AuthProvider>
  );
}

describe('NotesSidebar', () => {
  it('renders root folders from the seed', () => {
    const { getByText } = renderWithProviders(<Wrapped />);
    expect(getByText('Start here')).toBeInTheDocument();
  });

  it('expands a folder on chevron click and shows its children', async () => {
    const { getAllByLabelText, findByText } = renderWithProviders(<Wrapped />);
    const expanders = getAllByLabelText(/Expand /);
    await userEvent.click(expanders[0]!);
    await findByText('Welcome to the demo');
  });

  it('clicking + new collection opens the dialog', async () => {
    const { getByLabelText, findAllByLabelText } = renderWithProviders(<Wrapped />);
    await userEvent.click(getByLabelText('New collection'));
    const inputs = await findAllByLabelText('Name');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('clicking + new note opens the dialog', async () => {
    const { getByLabelText, findAllByLabelText } = renderWithProviders(<Wrapped />);
    await userEvent.click(getByLabelText('New note'));
    const inputs = await findAllByLabelText('Name');
    expect(inputs.length).toBeGreaterThan(0);
  });
});
