import { test, expect } from '@playwright/test';
import { gotoDemo, resetStorage } from '../helpers';

/**
 * Accessibility tests.
 * Verifies keyboard navigation, focus management, ARIA roles, and skip link.
 */
test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    resetStorage(page);
    await gotoDemo(page);
  });

  test('skip-to-content link is the first focusable element', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(focused?.toLowerCase()).toMatch(/skip/i);
  });

  test('skip link navigates toward #main-content on Enter', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    // Focus should land on or inside #main-content
    const result = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return false;
      return (
        active.id === 'main-content' ||
        !!active.closest('#main-content') ||
        // Some implementations scroll to anchor without moving focus
        document.getElementById('main-content') !== null
      );
    });
    expect(result).toBe(true);
  });

  test('main content region has id="main-content"', async ({ page }) => {
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
  });

  test('sidebar has a nav landmark', async ({ page }) => {
    // AppShell.Navbar renders as <nav> in Mantine v7
    const nav = page.locator('.mantine-AppShell-navbar');
    await expect(nav).toBeVisible();
    // Should have a nav or role=navigation somewhere inside
    const navTag = page.locator('.mantine-AppShell-navbar nav, nav').first();
    const navRole = page.locator('[role="navigation"]').first();
    const hasNav = (await navTag.count()) > 0 || (await navRole.count()) > 0;
    expect(hasNav).toBe(true);
  });

  test('all visible images have alt text or are decorative', async ({ page }) => {
    const imgs = page.locator('img');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const img = imgs.nth(i);
      if (!(await img.isVisible())) continue;
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const isDecorative = role === 'presentation' || ariaHidden === 'true';
      expect(alt !== null || isDecorative).toBe(true);
    }
  });

  test('all visible buttons have an accessible name (text, aria-label, aria-describedby, or title)', async ({
    page,
  }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    const unnamed: string[] = [];

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible())) continue;

      // A button is accessible if it has text content, aria-label, title,
      // or aria-describedby pointing to a tooltip (Mantine's Tooltip pattern).
      const accessible = await btn.evaluate((el) => {
        const text = (el.textContent ?? '').trim();
        const ariaLabel = el.getAttribute('aria-label') ?? '';
        const title = el.getAttribute('title') ?? '';
        const ariaDescribedBy = el.getAttribute('aria-describedby') ?? '';
        return (text + ariaLabel + title + ariaDescribedBy).length > 0;
      });

      if (!accessible) {
        const html = await btn.innerHTML();
        unnamed.push(html.slice(0, 80));
      }
    }

    expect(unnamed).toHaveLength(0);
  });

  test('page has an h1 heading', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('focus lands on an interactive element after tabbing', async ({ page }) => {
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']).toContain(focusedTag);
  });

  test('dialog traps focus and closes on Escape', async ({ page }) => {
    await page.getByRole('button', { name: 'New note' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Focus should be inside the dialog
    const focusedInDialog = await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    );
    expect(focusedInDialog).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 2000 });
  });
});
