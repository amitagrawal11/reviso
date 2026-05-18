import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders } from '@/test/Utils';
import { OfflineStatusIndicator } from '@/shared/components/OfflineStatusIndicator';

describe('OfflineStatusIndicator', () => {
  it('hides when navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const { queryByText } = renderWithProviders(<OfflineStatusIndicator />);
    expect(queryByText(/offline/i)).toBeNull();
  });
  it('shows when offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const { getByText } = renderWithProviders(<OfflineStatusIndicator />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(getByText(/offline/i)).toBeInTheDocument();
  });
});
