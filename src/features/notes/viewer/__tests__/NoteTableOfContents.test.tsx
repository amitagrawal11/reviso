import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import NoteTableOfContents from '@/features/notes/viewer/NoteTableOfContents';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('NoteTableOfContents', () => {
  it('shows empty hint when no markdown', () => {
    const { getByText } = renderWithProviders(<NoteTableOfContents />);
    expect(getByText(/On this page/i)).toBeInTheDocument();
  });

  it('lists headings found in .markdown', () => {
    const root = document.createElement('div');
    root.className = 'markdown';
    root.innerHTML = '<h1>One</h1><h2>Two</h2><h3>Three</h3>';
    document.body.appendChild(root);
    const { getAllByText } = renderWithProviders(<NoteTableOfContents />);
    expect(getAllByText('One').length).toBeGreaterThan(0);
    expect(getAllByText('Two').length).toBeGreaterThan(0);
    expect(getAllByText('Three').length).toBeGreaterThan(0);
  });
});
