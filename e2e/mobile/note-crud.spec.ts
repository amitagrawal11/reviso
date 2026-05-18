import { test, expect } from '@playwright/test';
import { gotoDemo } from '../helpers';

/**
 * Note CRUD on the compact (mobile) layout.
 *
 * The mobile flow is fundamentally different from desktop:
 *   - "New note" opens the QuickCapture drawer (a bottom-anchored sheet)
 *     instead of an AdaptiveDialog.
 *   - Notes are picked from the burger drawer (`.mantine-AppShell-navbar`)
 *     once it's opened, not from a permanently-visible sidebar.
 */
test.describe('Note CRUD — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDemo(page);
  });

  async function openDrawer(page: import('@playwright/test').Page) {
    await page.locator('.bottom-nav').getByRole('button', { name: /more/i }).click();
    await expect(page.locator('.mantine-AppShell-navbar')).toBeVisible();
  }

  async function createViaFab(page: import('@playwright/test').Page, title: string) {
    // The FAB has aria-label "New note" and class .quick-capture-fab.
    await page.locator('.quick-capture-fab').click();
    const titleInput = page.getByPlaceholder('Note title');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(titleInput).not.toBeVisible();
  }

  test('creates a new note via the QuickCapture FAB', async ({ page }) => {
    const title = `Mobile note ${Date.now()}`;
    await createViaFab(page, title);

    // The new note should be visible in the burger drawer.
    await openDrawer(page);
    await expect(page.locator('.mantine-AppShell-navbar').getByText(title).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('opens a note from the drawer and renders markdown', async ({ page }) => {
    const title = `Readable mobile ${Date.now()}`;
    await createViaFab(page, title);

    await openDrawer(page);
    await page
      .locator('.mantine-AppShell-navbar [data-testid="sidebar-note-link"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/n\//);
    await expect(page.locator('.markdown').first()).toBeVisible({ timeout: 8000 });
  });

  test('note view exposes an edit link', async ({ page }) => {
    const title = `Editable mobile ${Date.now()}`;
    await createViaFab(page, title);

    await openDrawer(page);
    await page
      .locator('.mantine-AppShell-navbar [data-testid="sidebar-note-link"]')
      .first()
      .click();
    await expect(page.getByRole('link', { name: /edit/i }).first()).toBeVisible({
      timeout: 5000,
    });
  });
});
