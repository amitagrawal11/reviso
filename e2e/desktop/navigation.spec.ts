import { test, expect } from '@playwright/test';
import { gotoDemo, resetStorage, createNote, openMobileNavbar } from '../helpers';

const SIDEBAR_NOTE = '.mantine-AppShell-navbar [data-testid="sidebar-note-link"]';

/**
 * Navigation tests.
 * Covers sidebar collections, note view, and browser history.
 */
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    resetStorage(page);
    await gotoDemo(page);
  });

  test('Home page shows Quick actions section', async ({ page }) => {
    await expect(page.getByText(/quick actions/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Home page shows Recent notes section when notes exist', async ({ page }) => {
    // Seed data has notes, so Recent section should appear
    await expect(page.getByText(/recent/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking a collection in sidebar navigates to collection view', async ({ page }) => {
    // "Start here" is always in seed data
    await page.locator('.mantine-AppShell-navbar').getByText('Start here').first().click();
    await expect(page).toHaveURL(/\/(c|demo)\//);
  });

  test('clicking a note in sidebar navigates to note view', async ({ page }) => {
    // Seed data nests notes inside collections, so we create a top-level note
    // to guarantee a deterministic sidebar note link.
    const title = `Nav note ${Date.now()}`;
    await createNote(page, title);

    await openMobileNavbar(page);
    await page.locator(SIDEBAR_NOTE).first().click();
    await expect(page).toHaveURL(/\/n\//);
  });

  test('browser back button returns to previous page', async ({ page }) => {
    const title = `Back note ${Date.now()}`;
    await createNote(page, title);

    // Navigate to /demo (Home) so we have a stable starting point — createNote
    // may leave us on the new note's view route.
    await page.goto('/demo');
    const startUrl = page.url();

    await openMobileNavbar(page);
    await page.locator(SIDEBAR_NOTE).first().click();
    await expect(page).toHaveURL(/\/n\//);

    await page.goBack();
    await expect(page).toHaveURL(startUrl);
  });

  test('unknown route redirects to a valid page with content', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(10);
  });

  test('navigates to /recent via URL directly', async ({ page }) => {
    await page.goto('/demo/recent');
    await expect(page).toHaveURL(/\/recent/);
    await expect(page.locator('.mantine-AppShell-main')).toBeVisible();
  });

  test('navigates to /starred via URL directly', async ({ page }) => {
    await page.goto('/demo/starred');
    await expect(page).toHaveURL(/\/starred/);
    await expect(page.locator('.mantine-AppShell-main')).toBeVisible();
  });

  test('navigates to /trash via URL directly', async ({ page }) => {
    await page.goto('/demo/trash');
    await expect(page).toHaveURL(/\/trash/);
    await expect(page.locator('.mantine-AppShell-main')).toBeVisible();
  });
});
