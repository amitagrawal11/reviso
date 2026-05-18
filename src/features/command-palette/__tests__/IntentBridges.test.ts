import { describe, it, expect, vi } from 'vitest';
import {
  requestSpotlight,
  consumePendingSpotlight,
  subscribeSpotlight,
} from '@/features/command-palette/CommandPaletteIntent';
import {
  openQuickCapture,
  subscribeQuickCapture,
} from '@/features/notes/quick-capture/NoteQuickCaptureIntent';

describe('CommandPaletteIntent', () => {
  it('requestSpotlight notifies subscribers and sets pending', () => {
    const fn = vi.fn();
    const off = subscribeSpotlight(fn);
    requestSpotlight();
    expect(fn).toHaveBeenCalled();
    expect(consumePendingSpotlight()).toBe(true);
    expect(consumePendingSpotlight()).toBe(false);
    off();
    fn.mockClear();
    requestSpotlight();
    expect(fn).not.toHaveBeenCalled();
    consumePendingSpotlight();
  });
});

describe('NoteQuickCaptureIntent', () => {
  it('subscribers receive parentId', () => {
    const fn = vi.fn();
    const off = subscribeQuickCapture(fn);
    openQuickCapture('p1');
    expect(fn).toHaveBeenCalledWith('p1');
    off();
    fn.mockClear();
    openQuickCapture();
    expect(fn).not.toHaveBeenCalled();
  });
});
