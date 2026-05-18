import { describe, it } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import { SignInModal } from '@/features/authentication/modal/SignInModal';
import { AuthProvider } from '@/features/authentication/context/AuthContext';

describe('SignInModal', () => {
  it('renders when opened=false (nothing visible)', () => {
    renderWithProviders(
      <AuthProvider>
        <SignInModal opened={false} onClose={() => {}} />
      </AuthProvider>,
    );
  });
  it('renders Login when opened', async () => {
    const { findAllByText } = renderWithProviders(
      <AuthProvider>
        <SignInModal opened={true} onClose={() => {}} initialMode="signup" />
      </AuthProvider>,
    );
    await findAllByText(/Create your free account|Welcome back/);
  });
});
