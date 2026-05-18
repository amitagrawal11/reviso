import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrandLogo } from '@/shared/components/BrandLogo';

describe('BrandLogo', () => {
  it('renders an svg with default size', () => {
    const { container } = render(<BrandLogo />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
  });

  it('honors size prop', () => {
    const { container } = render(<BrandLogo size={32} />);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('32');
  });
});
