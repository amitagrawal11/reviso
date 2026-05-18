import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Home, Star } from 'lucide-react';
import { ItemIcon } from '@/shared/components/ItemIcon';

describe('ItemIcon', () => {
  it('renders with default md size', () => {
    const { container } = render(<ItemIcon icon={Home} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('18');
  });
  it('accepts token sizes', () => {
    const { container } = render(<ItemIcon icon={Star} size="lg" />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('20');
  });
  it('accepts explicit pixel sizes', () => {
    const { container } = render(<ItemIcon icon={Star} size={40} />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('40');
  });
});
