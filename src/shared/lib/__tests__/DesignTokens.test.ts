import { describe, it, expect } from 'vitest';
import * as tokens from '@/shared/lib/DesignTokens';

describe('design-tokens', () => {
  it('exports spacing, radius, text, breakpoints', () => {
    expect(tokens.spacing[4]).toBe(16);
    expect(tokens.radius.md).toBeGreaterThan(0);
    expect(tokens.text.h1).toBeTruthy();
    expect(tokens.breakpoints.compact).toBe(600);
    expect(tokens.iconSize.md).toBe(18);
    expect(tokens.iconStroke).toBeGreaterThan(0);
    expect(tokens.headerHeight.desktop).toBeGreaterThan(0);
    expect(tokens.bottomNavHeight).toBeGreaterThan(0);
    expect(tokens.sidebarWidth.medium).toBeGreaterThan(0);
    expect(tokens.tocWidth).toBeGreaterThan(0);
    expect(tokens.railWidth).toBeGreaterThan(0);
    expect(tokens.fontFamily.ui).toContain('Inter');
    expect(tokens.lineHeight.base).toBeGreaterThan(1);
    expect(tokens.letterSpacing.body).toBeDefined();
    expect(tokens.fontWeight.bold).toBe(700);
  });
});
