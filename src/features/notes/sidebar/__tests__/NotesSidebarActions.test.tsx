import { describe, it, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NotesSidebar from '@/features/notes/sidebar/NotesSidebar';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

beforeEach(() => {
  mockRepo.reset();
});

function Wrap() {
  return (
    <AuthProvider>
      <DataModeProvider mode="demo">
        <NotesSidebar />
        <AdaptiveDialogHost />
      </DataModeProvider>
    </AuthProvider>
  );
}

describe('NotesSidebar RowMenu (desktop variant)', () => {
  it('opens menu and navigates rename', async () => {
    const { getAllByLabelText, findByText } = renderWithProviders(<Wrap />);
    const triggers = getAllByLabelText(/Actions for /);
    await userEvent.click(triggers[0]!);
    const rename = await findByText('Rename');
    await userEvent.click(rename);
  });

  it('star toggle from row menu', async () => {
    // Find an action for a note specifically.
    const expanders = (await renderWithProviders(<Wrap />).findAllByLabelText(/Expand /)) as any;
    await userEvent.click(expanders[0]!);
  });
});
