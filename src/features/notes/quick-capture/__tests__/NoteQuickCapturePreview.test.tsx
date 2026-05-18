import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import QuickCapturePreview from '@/features/notes/quick-capture/NoteQuickCapturePreview';

describe('QuickCapturePreview', () => {
  it('renders nothing-to-preview when empty', () => {
    const { getByText } = renderWithProviders(<QuickCapturePreview source="" colorScheme="dark" />);
    expect(getByText(/Nothing to preview/i)).toBeInTheDocument();
  });
  it('renders markdown for non-empty source', async () => {
    const { findByTestId } = renderWithProviders(
      <QuickCapturePreview source="# Hello" colorScheme="light" />,
    );
    await findByTestId('md-view');
  });
});
