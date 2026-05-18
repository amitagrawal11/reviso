import { test, expect } from '@playwright/test';
import { gotoDemo, resetStorage } from '../helpers';

/**
 * Demo shell smoke tests.
 */
test.describe('Demo shell', () => {
  test.beforeEach(async ({ page }) => {
    resetStorage(page);
    await gotoDemo(page);
  });

  test('renders the app shell header', async ({ page }) => {
    await expect(page.locator('.mantine-AppShell-header')).toBeVisible();
  });

  test('renders the sidebar navbar', async ({ page }) => {
    await expect(page.locator('.mantine-AppShell-navbar')).toBeVisible();
  });

  test('shows the demo banner', async ({ page }) => {
    await expect(page.locator('.demo-banner')).toBeVisible();
  });

  test('shows seed collections in the sidebar', async ({ page }) => {
    const sidebar = page.locator('.mantine-AppShell-navbar');
    await expect(sidebar.getByText('Start here').first()).toBeVisible();
    await expect(sidebar.getByText('Work').first()).toBeVisible();
  });

  test('search trigger is present in the header', async ({ page }) => {
    // Desktop: full search bar
    const searchBar = page.locator('.app-header-search');
    const searchBtn = page.getByRole('button', { name: /search/i });
    const isVisible = (await searchBar.isVisible()) || (await searchBtn.isVisible());
    expect(isVisible).toBe(true);
  });

  test('theme toggle button exists in the header', async ({ page }) => {
    // Theme toggle uses a Tooltip with label="Theme" but no aria-label on button.
    // It's the last ActionIcon in the header right group.
    const headerBtns = page.locator('.app-header-row button');
    const count = await headerBtns.count();
    expect(count).toBeGreaterThan(0);

    // Click the last header button (theme toggle is always last)
    const themeBtn = headerBtns.last();
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    // No error — theme toggled
  });

  test('color scheme toggles on theme button click', async ({ page }) => {
    const html = page.locator('html');
    const before = await html.getAttribute('data-mantine-color-scheme');
    await page.locator('.app-header-row button').last().click();
    await page.waitForTimeout(200);
    const after = await html.getAttribute('data-mantine-color-scheme');
    expect(after).not.toBe(before);
  });

  test('⌘K opens spotlight search', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    const input = page.locator('[class*="spotlight"] input, [class*="Spotlight"] input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
  });

  test('New note button opens create dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'New note' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('New collection button opens create dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'New collection' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
