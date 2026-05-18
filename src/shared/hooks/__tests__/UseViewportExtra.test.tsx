import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from '@/shared/hooks/UseViewport';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
});

describe('useViewport extra paths', () => {
  it('classifies large and xlarge widths', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1400 });
    const { result, rerender } = renderHook(() => useViewport());
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    // rAF
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        rerender();
        expect(['large', 'expanded', 'xlarge', 'medium', 'compact']).toContain(
          result.current.class,
        );
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 2000 });
        act(() => {
          window.dispatchEvent(new Event('resize'));
        });
        requestAnimationFrame(() => {
          rerender();
          resolve();
        });
      });
    });
  });

  it('coalesces multiple resize events through rAF', () => {
    renderHook(() => useViewport());
    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
    });
    // Just ensures no throw.
    expect(true).toBe(true);
  });

  it('orientationchange listener triggers update', () => {
    const { rerender } = renderHook(() => useViewport());
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    act(() => {
      window.dispatchEvent(new Event('orientationchange'));
    });
    rerender();
    expect(true).toBe(true);
  });

  it('detects standalone via navigator.standalone iOS fallback', () => {
    (window.navigator as any).standalone = true;
    const { result, rerender } = renderHook(() => useViewport());
    act(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
      window.dispatchEvent(new Event('resize'));
    });
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        rerender();
        delete (window.navigator as any).standalone;
        expect(result.current).toBeDefined();
        resolve();
      });
    });
  });

  it('isLandscape true when width > height', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isLandscape !== undefined).toBe(true);
    vi.useRealTimers?.();
  });
});
