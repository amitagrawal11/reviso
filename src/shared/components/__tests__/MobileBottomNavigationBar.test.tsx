import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import {
  MobileBottomNavigationBar,
  BOTTOM_NAV_HEIGHT,
} from '@/shared/components/MobileBottomNavigationBar';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';

describe('MobileBottomNavigationBar', () => {
  it('exports BOTTOM_NAV_HEIGHT', () => {
    expect(BOTTOM_NAV_HEIGHT).toBeGreaterThan(0);
  });

  it('renders three nav items and triggers callbacks', async () => {
    const onOpenDrawer = vi.fn();
    const { container } = renderWithProviders(
      <DataModeProvider mode="demo">
        <MobileBottomNavigationBar onOpenDrawer={onOpenDrawer} />
      </DataModeProvider>,
    );
    const buttons = container.querySelectorAll('.bottom-nav-item');
    expect(buttons.length).toBe(3);
    await userEvent.click(buttons[2]!); // More
    expect(onOpenDrawer).toHaveBeenCalled();
    await userEvent.click(buttons[1]!); // Search
  });
});
