import { describe, it, expect } from 'vitest';

describe('i18n module', () => {
  it('imports without error', async () => {
    // react-i18next is mocked, but the module still runs.
    const mod = await import('@/shared/lib/I18n');
    expect(mod.default).toBeTruthy();
  });
});
