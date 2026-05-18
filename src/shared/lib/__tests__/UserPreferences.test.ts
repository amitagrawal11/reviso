import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  applyDomPrefs,
  getPreferences,
  hydrateFromUpstream,
  load,
  setPreference,
  setUpstreamSync,
} from '@/shared/lib/UserPreferences';

beforeEach(() => {
  localStorage.clear();
  setUpstreamSync(null);
});

describe('preferences', () => {
  it('load returns defaults when no storage', () => {
    expect(load()).toEqual(DEFAULT_PREFERENCES);
  });

  it('load coerces malformed values', () => {
    localStorage.setItem(
      'notes-preferences-v1',
      JSON.stringify({ density: 'bogus', textScale: 'NaN', lineNumbers: 'yes', defaultView: 'x' }),
    );
    const p = load();
    expect(p.density).toBe(DEFAULT_PREFERENCES.density);
    expect(p.textScale).toBe(DEFAULT_PREFERENCES.textScale);
    expect(p.lineNumbers).toBe(DEFAULT_PREFERENCES.lineNumbers);
    expect(p.defaultView).toBe(DEFAULT_PREFERENCES.defaultView);
  });

  it('load returns defaults on JSON parse error', () => {
    localStorage.setItem('notes-preferences-v1', '{broken');
    expect(load()).toEqual(DEFAULT_PREFERENCES);
  });

  it('load accepts valid values', () => {
    localStorage.setItem(
      'notes-preferences-v1',
      JSON.stringify({
        density: 'compact',
        textScale: 115,
        lineNumbers: false,
        spellcheck: false,
        defaultView: 'edit',
      }),
    );
    const p = load();
    expect(p.density).toBe('compact');
    expect(p.textScale).toBe(115);
    expect(p.defaultView).toBe('edit');
  });

  it('applyDomPrefs writes attrs to <html>', () => {
    applyDomPrefs({ ...DEFAULT_PREFERENCES, density: 'compact', textScale: 115 });
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1.15');
  });

  it('setPreference updates state and persists', () => {
    setPreference('density', 'compact');
    expect(getPreferences().density).toBe('compact');
    expect(JSON.parse(localStorage.getItem('notes-preferences-v1')!).density).toBe('compact');
  });

  it('setPreference is a no-op when value unchanged', () => {
    setPreference('density', 'compact');
    const before = localStorage.getItem('notes-preferences-v1');
    setPreference('density', 'compact');
    expect(localStorage.getItem('notes-preferences-v1')).toBe(before);
  });

  it('setPreference fires upstream sync (fire-and-forget)', () => {
    const sync = vi.fn().mockResolvedValue(undefined);
    setUpstreamSync(sync);
    setPreference('textScale', 115);
    expect(sync).toHaveBeenCalled();
  });

  it('setPreference tolerates throwing upstream sync', () => {
    setUpstreamSync(() => {
      throw new Error('boom');
    });
    expect(() => setPreference('textScale', 130)).not.toThrow();
  });

  it('hydrateFromUpstream replaces state when different', () => {
    hydrateFromUpstream({ density: 'compact', textScale: 115 });
    expect(getPreferences().density).toBe('compact');
  });

  it('hydrateFromUpstream is a no-op when equal', () => {
    const before = getPreferences();
    hydrateFromUpstream({ ...before });
    expect(getPreferences()).toEqual(before);
  });
});
