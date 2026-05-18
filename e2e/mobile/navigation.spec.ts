import { test, expect } from '@playwright/test';
import { gotoDemo } from '../helpers';

/**
 * Navigation tests for the compact (mobile) layout.
 *
 * Compact differs from desktop in two key ways:
 *   - The sidebar is collapsed behind a burger toggle in the header.
 *   - A BottomNav (Home / Search / More) is the primary navigation surface.
 */
test.describe('Navigation — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDemo(page);
  });

  test('bottom nav is visible with Home, Search, More', async ({ page }) => {
    const nav = page.locator('.bottom-nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: /search/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /more/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /home/i })).toBeVisible();
  });

  test('burger toggle opens the navbar drawer', async ({ page }) => {
    const burger = page.getByRole('button', { name: /navigation/i }).first();
    await burger.click();
    await expect(page.locator('.mantine-AppShell-navbar')).toBeVisible();
  });

  test('More button in bottom nav opens the drawer', async ({ page }) => {
    await page.locator('.bottom-nav').getByRole('button', { name: /more/i }).click();
    await expect(page.locator('.mantine-AppShell-navbar')).toBeVisible();
  });

  test('Home link in bottom nav routes to /demo', async ({ page }) => {
    await page.goto('/demo/recent');
    await page.locator('.bottom-nav').getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL(/\/demo\/?$/);
  });

  test('navigates to /recent, /starred, /trash via URL directly', async ({ page }) => {
    for (const sub of ['recent', 'starred', 'trash']) {
      await page.goto(`/demo/${sub}`);
      await expect(page).toHaveURL(new RegExp(`/${sub}`));
      await expect(page.locator('.mantine-AppShell-main')).toBeVisible();
    }
  });
});
