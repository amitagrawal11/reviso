import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import { NoteQuickCaptureButton } from '@/features/notes/quick-capture/NoteQuickCaptureButton';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { openQuickCapture } from '@/features/notes/quick-capture/NoteQuickCaptureIntent';
import { act } from '@testing-library/react';

describe('NoteQuickCaptureButton', () => {
  it('renders fab and opens drawer on click', async () => {
    const { getByLabelText, findByPlaceholderText } = renderWithProviders(
      <DataModeProvider mode="demo">
        <NoteQuickCaptureButton />
      </DataModeProvider>,
    );
    await userEvent.click(getByLabelText('New note'));
    await findByPlaceholderText('Note title');
  });

  it('hides fab when showFab=false but still responds to bridge', async () => {
    const { container } = renderWithProviders(
      <DataModeProvider mode="demo">
        <NoteQuickCaptureButton showFab={false} />
      </DataModeProvider>,
    );
    expect(container.querySelector('.quick-capture-fab')).toBeFalsy();
    act(() => {
      openQuickCapture('c-work');
    });
  });
});
