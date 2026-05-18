import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import { PwaInstallPrompt } from '@/shared/components/PwaInstallPrompt';

describe('PwaInstallPrompt', () => {
  it('renders nothing without a beforeinstallprompt event', () => {
    const { queryByText } = renderWithProviders(<PwaInstallPrompt />);
    expect(queryByText(/Install app/i)).toBeNull();
  });

  it('shows button after beforeinstallprompt and triggers prompt', async () => {
    const { findByText } = renderWithProviders(<PwaInstallPrompt />);
    const promptFn = vi.fn().mockResolvedValue(undefined);
    act(() => {
      const ev: any = new Event('beforeinstallprompt');
      ev.prompt = promptFn;
      ev.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(ev);
    });
    const btn = await findByText(/Install app/i);
    await userEvent.click(btn);
    expect(promptFn).toHaveBeenCalled();
  });

  it('stores dismissed flag on dismiss', async () => {
    const { findByText } = renderWithProviders(<PwaInstallPrompt />);
    act(() => {
      const ev: any = new Event('beforeinstallprompt');
      ev.prompt = vi.fn().mockResolvedValue(undefined);
      ev.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(ev);
    });
    const btn = await findByText(/Install app/i);
    await userEvent.click(btn);
    await new Promise((r) => setTimeout(r, 5));
    expect(localStorage.getItem('pwa-install-dismissed')).toBe('1');
  });
});
