import { test, expect } from '@playwright/test';
import { gotoDemo, resetStorage, createNote, openRowMenu, openMobileNavbar } from '../helpers';

const SIDEBAR_NOTE = '.mantine-AppShell-navbar [data-testid="sidebar-note-link"]';

/**
 * Note CRUD tests.
 * Covers create, read, edit/save, star, trash, restore, hard-delete.
 *
 * Row menus on desktop render as a Mantine Menu (role="menuitem").
 * On compact (mobile) they render as a bottom sheet with <button> elements.
 * These tests target desktop (1280px) where menuitems are used.
 */
test.describe('Note CRUD', () => {
  test.beforeEach(async ({ page }) => {
    resetStorage(page);
    await gotoDemo(page);
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('creates a new note via the sidebar + button', async ({ page }) => {
    const title = `Test note ${Date.now()}`;
    await createNote(page, title);
    await expect(page.locator('.mantine-AppShell-navbar').getByText(title).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('creates a new collection via the sidebar + button', async ({ page }) => {
    const title = `Collection ${Date.now()}`;
    await page.getByRole('button', { name: 'New collection' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox').first().fill(title);
    await dialog.getByRole('button', { name: /create/i }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.locator('.mantine-AppShell-navbar').getByText(title).first()).toBeVisible({
      timeout: 5000,
    });
  });

  // ── Read ──────────────────────────────────────────────────────────────

  test('opens a note and renders markdown content', async ({ page }) => {
    // Seed data nests notes inside collections, so we create a top-level note
    // with markdown content to guarantee the markdown renderer engages.
    const title = `Readable ${Date.now()}`;
    await createNote(page, title);

    await openMobileNavbar(page);
    await page.locator(SIDEBAR_NOTE).first().click();
    await expect(page.locator('.markdown').first()).toBeVisible({ timeout: 8000 });
  });

  test('note view shows an edit button', async ({ page }) => {
    const title = `Editable-view ${Date.now()}`;
    await createNote(page, title);

    await openMobileNavbar(page);
    await page.locator(SIDEBAR_NOTE).first().click();
    await expect(page.getByRole('link', { name: /edit/i }).first()).toBeVisible({ timeout: 5000 });
  });

  // ── Edit & Save ───────────────────────────────────────────────────────

  test('edits a note and saves changes', async ({ page }) => {
    const title = `Editable ${Date.now()}`;
    await createNote(page, title);

    await openMobileNavbar(page);
    await page.locator('.mantine-AppShell-navbar').getByText(title).first().click();

    // Open edit mode
    await page.getByRole('link', { name: /edit/i }).first().click();
    await expect(page).toHaveURL(/\/edit/);

    // Type in the markdown editor textarea
    const textarea = page.locator('.w-md-editor-text-input').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.click();
    await textarea.fill('# Edited heading\n\nSome content.');

    // Save
    await page.getByRole('button', { name: /save/i }).first().click();

    // Note view renders the heading
    await expect(page.locator('.markdown h1').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.markdown h1').first()).toContainText('Edited heading');
  });

  // ── Star via row action ───────────────────────────────────────────────

  test('stars a note via the row action menu', async ({ page }) => {
    const title = `Starrable ${Date.now()}`;
    await createNote(page, title);

    await openRowMenu(page, title);

    // Desktop (1280 px viewport): Mantine Menu renders menuitems.
    await page.getByRole('menuitem', { name: /^(Star|Unstar)$/i }).click();

    // Navigate to /starred and confirm note is there
    await page.goto('/demo/starred');
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 });
  });

  // ── Rename ────────────────────────────────────────────────────────────

  test('renames a note via the row action menu', async ({ page }) => {
    const title = `Renameable ${Date.now()}`;
    const newTitle = `Renamed ${Date.now()}`;
    await createNote(page, title);

    await openRowMenu(page, title);

    // Desktop (1280 px viewport): Mantine Menu renders menuitems.
    await page.getByRole('menuitem', { name: /rename/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    const input = dialog.getByRole('textbox').first();
    await input.clear();
    await input.fill(newTitle);
    await dialog.getByRole('button', { name: /rename|save/i }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.locator('.mantine-AppShell-navbar').getByText(newTitle).first()).toBeVisible({
      timeout: 5000,
    });
  });

  // ── Trash & Restore ───────────────────────────────────────────────────

  /** Helper: trash the note whose title is in the sidebar row menu. */
  async function trashNote(page: import('@playwright/test').Page, title: string) {
    await openRowMenu(page, title);

    // Desktop (1280 px viewport): Mantine Menu renders menuitems.
    await page.getByRole('menuitem', { name: /move to trash/i }).click();

    // Confirm the AdaptiveDialog (renders as a Modal on desktop)
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await dialog.getByRole('button', { name: /move to trash/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  }

  test('moves a note to trash', async ({ page }) => {
    const title = `Trashable ${Date.now()}`;
    await createNote(page, title);

    await trashNote(page, title);

    // Gone from sidebar
    await expect(page.locator('.mantine-AppShell-navbar').getByText(title)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('restores a trashed note', async ({ page }) => {
    const title = `Restorable ${Date.now()}`;
    await createNote(page, title);

    await trashNote(page, title);

    // Go to Trash page
    await page.goto('/demo/trash');
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 });

    // Restore — button is directly visible, no confirm needed
    await page
      .getByRole('button', { name: /^restore$/i })
      .first()
      .click();

    // Back in sidebar
    await page.goto('/demo');
    await expect(page.locator('.mantine-AppShell-navbar').getByText(title).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('hard-deletes a note from trash', async ({ page }) => {
    const title = `Deletable ${Date.now()}`;
    await createNote(page, title);

    await trashNote(page, title);

    // Hard delete from trash
    await page.goto('/demo/trash');
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5000 });

    // Click "Delete forever" button (no confirm needed for the row button... or is there?)
    await page
      .getByRole('button', { name: /delete forever/i })
      .first()
      .click();

    // Confirm the AdaptiveDialog
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dialog.getByRole('button', { name: /delete forever/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }

    await expect(page.getByText(title)).not.toBeVisible({ timeout: 3000 });
  });
});
