import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import { NoteEditor } from '../NoteEditor';

describe('NoteEditor', () => {
  it('renders the editor with gutter on desktop', () => {
    const { container } = renderWithProviders(<NoteEditor value={'a\nb\nc'} onChange={() => {}} />);
    expect(container.querySelector('.md-with-gutter')).toBeTruthy();
  });
  it('handles non-string value', () => {
    renderWithProviders(<NoteEditor value={undefined} onChange={() => {}} />);
  });
});
