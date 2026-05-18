import { test, expect } from '@playwright/test';
import { gotoDemo, resetStorage } from '../helpers';

/**
 * Spotlight search tests.
 */
test.describe('Spotlight search', () => {
  test.beforeEach(async ({ page }) => {
    resetStorage(page);
    await gotoDemo(page);
  });

  test('opens via ⌘K keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    // Spotlight injects an input into a portal/dialog
    const input = page.locator('[class*="spotlight"] input, [class*="Spotlight"] input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
  });

  test('opens via clicking the search bar (desktop)', async ({ page, viewport }) => {
    // The inline search bar is desktop-only (`visibleFrom="sm"` in Shell.tsx).
    // On mobile (compact viewport) it's replaced by an icon-only trigger;
    // that path is covered by the ⌘K keyboard test above.
    test.skip(
      viewport != null && viewport.width < 600,
      'Inline search bar is hidden on compact viewports by design.',
    );

    const searchBar = page.locator('.app-header-search');
    await expect(searchBar).toBeVisible();
    await searchBar.click();
    const input = page.locator('[class*="spotlight"] input, [class*="Spotlight"] input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
  });

  test('shows results when typing a seed collection name', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    const input = page.locator('[class*="spotlight"] input, [class*="Spotlight"] input').first();
    await expect(input).toBeVisible({ timeout: 5000 });

    await input.fill('Start here');
    // Some result text should appear
    await expect(page.getByText('Start here').last()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
  });

  test('closes on Escape', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    const input = page.locator('[class*="spotlight"] input, [class*="Spotlight"] input').first();
    await expect(input).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(input).not.toBeVisible({ timeout: 3000 });
  });
});
