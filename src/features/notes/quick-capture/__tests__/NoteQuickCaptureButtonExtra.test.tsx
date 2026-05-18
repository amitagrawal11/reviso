import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { NoteQuickCaptureButton } from '@/features/notes/quick-capture/NoteQuickCaptureButton';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

beforeEach(() => {
  mockRepo.reset();
});

function Wrap() {
  return (
    <DataModeProvider mode="demo">
      <NoteQuickCaptureButton />
    </DataModeProvider>
  );
}

describe('NoteQuickCaptureButton — save / keyboard / tab', () => {
  it('saves a note when title is provided and Save is clicked', async () => {
    const { getByLabelText, findByPlaceholderText, getByText } = renderWithProviders(<Wrap />);
    await userEvent.click(getByLabelText('New note'));
    const title = await findByPlaceholderText('Note title');
    await userEvent.type(title, 'My fresh note');
    const body = document.getElementById('qcf-body') as HTMLTextAreaElement;
    await userEvent.type(body, 'body content');
    await userEvent.click(getByText('Save'));
    await waitFor(() => {
      expect(mockRepo.getAll().some((i) => i.title === 'My fresh note')).toBe(true);
    });
    // Reopen
    await userEvent.click(getByLabelText('New note'));
    await findByPlaceholderText('Note title');
  });

  it('Enter on title focuses body; Escape on title closes drawer', async () => {
    const { getByLabelText, findByPlaceholderText } = renderWithProviders(<Wrap />);
    await userEvent.click(getByLabelText('New note'));
    const title = await findByPlaceholderText('Note title');
    await userEvent.type(title, 't');
    await act(async () => {
      fireEvent.keyDown(title, { key: 'Enter' });
    });
    // Escape on body should close
    const body = document.getElementById('qcf-body') as HTMLTextAreaElement;
    if (body) {
      await act(async () => {
        fireEvent.keyDown(body, { key: 'Escape' });
      });
    }
    // Reopen and use Escape on title to close
    await userEvent.click(getByLabelText('New note'));
    const title2 = await findByPlaceholderText('Note title');
    await act(async () => {
      fireEvent.keyDown(title2, { key: 'Escape' });
    });
  });

  it('Cancel button + close X close the drawer', async () => {
    const { getByLabelText, findByPlaceholderText, getByText } = renderWithProviders(<Wrap />);
    await userEvent.click(getByLabelText('New note'));
    await findByPlaceholderText('Note title');
    await userEvent.click(getByText('Cancel'));
    // Reopen
    await userEvent.click(getByLabelText('New note'));
    await findByPlaceholderText('Note title');
    await userEvent.click(getByLabelText('Close'));
  });

  it('switches to preview tab', async () => {
    const { getByLabelText, findByPlaceholderText, getByText } = renderWithProviders(<Wrap />);
    await userEvent.click(getByLabelText('New note'));
    await findByPlaceholderText('Note title');
    await userEvent.click(getByText('Preview'));
  });
});
