import { describe, it, expect } from 'vitest';

describe('inject-styles', () => {
  it('appends a <style id="app-inline-css"> exactly once', async () => {
    await import('@/shared/lib/InjectAppStyles');
    const el = document.getElementById('app-inline-css');
    expect(el).toBeTruthy();
    // Re-import should not duplicate.
    await import('@/shared/lib/InjectAppStyles');
    expect(document.querySelectorAll('#app-inline-css').length).toBe(1);
  });
});
