import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import { NoteNotFoundCard } from '@/features/notes/viewer/NoteNotFoundCard';

describe('NoteNotFoundCard', () => {
  it('renders note variant', () => {
    const { getByText } = renderWithProviders(<NoteNotFoundCard kind="note" homePath="/" />);
    expect(getByText(/note/i)).toBeInTheDocument();
    expect(getByText(/Go home/i)).toBeInTheDocument();
  });
  it('renders collection variant', () => {
    const { getByText } = renderWithProviders(
      <NoteNotFoundCard kind="collection" homePath="/demo" />,
    );
    expect(getByText(/collection/i)).toBeInTheDocument();
  });
});
