import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/Utils';
import { MarkdownEditor, prefetchMarkdownEditor } from '@/features/notes/editor/MarkdownEditor';
import { MarkdownViewer, prefetchMarkdownViewer } from '@/features/notes/viewer/MarkdownViewer';

describe('Markdown', () => {
  it('MarkdownViewer renders markdown view', async () => {
    const { findByTestId } = renderWithProviders(<MarkdownViewer source="# Hi" />);
    expect((await findByTestId('md-view')).textContent).toContain('# Hi');
  });
  it('MarkdownEditor renders editor', async () => {
    const { findByTestId } = renderWithProviders(<MarkdownEditor value="x" />);
    await findByTestId('md-editor');
  });
  it('prefetch can be called repeatedly', async () => {
    await prefetchMarkdownEditor();
    await prefetchMarkdownEditor();
    await prefetchMarkdownViewer();
    await prefetchMarkdownViewer();
    await waitFor(() => expect(true).toBe(true));
  });
});
