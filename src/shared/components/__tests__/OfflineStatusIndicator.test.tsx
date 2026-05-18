import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/Utils';
import { OfflineStatusIndicator } from '@/shared/components/OfflineStatusIndicator';

describe('OfflineStatusIndicator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function installStorageMocks() {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { clear: vi.fn() },
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: { clear: vi.fn() },
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  it('hides when navigator.onLine', () => {
    installStorageMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const { queryByText } = renderWithProviders(<OfflineStatusIndicator />);
    expect(queryByText(/offline/i)).toBeNull();
  });

  it('stays hidden when navigator.onLine is false but connectivity probe succeeds', async () => {
    installStorageMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const { queryByText } = renderWithProviders(<OfflineStatusIndicator />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await waitFor(() => {
      expect(queryByText(/offline/i)).toBeNull();
    });
  });

  it('shows when offline and connectivity probe fails', async () => {
    installStorageMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const { getByText } = renderWithProviders(<OfflineStatusIndicator />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await waitFor(() => {
      expect(getByText(/offline/i)).toBeInTheDocument();
    });
  });
});
