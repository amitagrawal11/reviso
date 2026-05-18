import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import CommandPaletteSearch from '@/features/command-palette/CommandPaletteSearch';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';

describe('CommandPaletteSearch', () => {
  it('renders the (mocked) Spotlight component', () => {
    const { getByTestId } = renderWithProviders(
      <DataModeProvider mode="demo">
        <CommandPaletteSearch />
      </DataModeProvider>,
    );
    expect(getByTestId('spotlight')).toBeInTheDocument();
  });
});
