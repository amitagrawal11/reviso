import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import { DemoModeBanner, DEMO_BANNER_HEIGHT } from '@/shared/components/DemoModeBanner';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import userEvent from '@testing-library/user-event';

describe('DemoModeBanner', () => {
  it('exports DEMO_BANNER_HEIGHT = 44', () => {
    expect(DEMO_BANNER_HEIGHT).toBe(44);
  });

  it('renders the demo banner with create account CTA', async () => {
    const { getByText } = renderWithProviders(
      <AuthProvider>
        <DemoModeBanner />
      </AuthProvider>,
    );
    expect(getByText(/Create Account/i)).toBeInTheDocument();
    await userEvent.click(getByText(/Create Account/i));
  });
});
