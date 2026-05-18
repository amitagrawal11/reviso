import { test, expect } from '@playwright/test';
import { gotoDemo, resetStorage } from '../helpers';

/**
 * Theme persistence tests.
 */
test.describe('Theme persistence', () => {
  test('defaults to dark when OS prefers dark', async ({ page }) => {
    resetStorage(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await gotoDemo(page);
    const scheme = await page.locator('html').getAttribute('data-mantine-color-scheme');
    expect(scheme).toBe('dark');
  });

  test('defaults to light when OS prefers light', async ({ page }) => {
    resetStorage(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await gotoDemo(page);
    const scheme = await page.locator('html').getAttribute('data-mantine-color-scheme');
    expect(scheme).toBe('light');
  });

  test('theme toggle switches color scheme', async ({ page }) => {
    resetStorage(page);
    await gotoDemo(page);
    const html = page.locator('html');
    const before = await html.getAttribute('data-mantine-color-scheme');

    // Theme button is the last button in the header row
    await page.locator('.app-header-row button').last().click();
    await page.waitForTimeout(150);

    const after = await html.getAttribute('data-mantine-color-scheme');
    expect(after).not.toBe(before);
  });

  test('theme choice persists across page reloads', async ({ page }) => {
    resetStorage(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await gotoDemo(page);

    // Toggle to light
    await page.locator('.app-header-row button').last().click();
    await page.waitForTimeout(150);
    const after = await page.locator('html').getAttribute('data-mantine-color-scheme');
    expect(after).toBe('light');

    // Reload without clearing storage — should stay light
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const reloaded = await page.locator('html').getAttribute('data-mantine-color-scheme');
    expect(reloaded).toBe('light');
  });

  test('html has data-mantine-color-scheme set on load (no FOUC)', async ({ page }) => {
    // The inline <script> in index.html sets data-mantine-color-scheme
    // synchronously before React mounts. We verify it's present as soon
    // as the DOM is interactive — not waiting for JS bundle evaluation.
    resetStorage(page);
    await page.emulateMedia({ colorScheme: 'dark' });

    // Navigate and check attribute before full load
    await page.goto('/demo', { waitUntil: 'domcontentloaded' });

    const scheme = await page.locator('html').getAttribute('data-mantine-color-scheme');
    expect(scheme).toBeTruthy();
    expect(['light', 'dark']).toContain(scheme);
  });
});
