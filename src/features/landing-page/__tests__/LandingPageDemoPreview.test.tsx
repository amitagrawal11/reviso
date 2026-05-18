import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import { LandingPageDemoPreview } from '@/features/landing-page/LandingPageDemoPreview';

describe('LandingPageDemoPreview', () => {
  it('renders picture with srcSet and a /demo link', () => {
    const { container, getByLabelText } = renderWithProviders(<LandingPageDemoPreview />);
    expect(container.querySelector('picture')).toBeTruthy();
    expect(container.querySelector('source')!.getAttribute('srcset')).toContain('webp');
    expect(getByLabelText(/Try the demo/i)).toBeInTheDocument();
  });
});
