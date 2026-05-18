import { test, expect } from '@playwright/test';

/**
 * Landing page smoke tests.
 */
test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders hero headline', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('has a "Try" or "demo" CTA that navigates to /demo', async ({ page }) => {
    const demoLink = page.getByRole('link', { name: /try.*demo|open.*demo|try it/i }).first();
    await expect(demoLink).toBeVisible();
    await demoLink.click();
    await expect(page).toHaveURL(/\/demo/);
  });

  test('page title contains "Reviso"', async ({ page }) => {
    await expect(page).toHaveTitle(/Reviso/i);
  });

  test('meta description is set', async ({ page }) => {
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content', /.{20,}/);
  });

  test('manifest link is present', async ({ page }) => {
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);
  });

  test('has no JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
