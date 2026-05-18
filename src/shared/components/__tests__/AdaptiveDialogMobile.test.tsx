import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/Utils';
import { AdaptiveDialogHost, openAdaptiveDialog } from '@/shared/components/AdaptiveDialog';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('hover: none') || q.includes('pointer: coarse'),
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe('AdaptiveDialog (mobile drawer variant)', () => {
  it('renders Drawer when viewport is compact', async () => {
    renderWithProviders(<AdaptiveDialogHost />);
    // Force viewport recompute to compact.
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    act(() => {
      openAdaptiveDialog({ title: 'M', children: () => <div>X</div> });
    });
    await waitFor(() => {
      // Drawer is portalled outside container; look at document body.
      expect(document.body.textContent).toContain('M');
    });
  });
});
