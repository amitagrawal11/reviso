import { type Page, expect } from '@playwright/test';

/**
 * Navigate to the demo app, clear stale localStorage, and wait for Shell
 * to mount with fresh seed data.
 *
 * Strategy: navigate once, clear localStorage via evaluate() (a one-shot JS
 * call, not an initScript that would re-fire on every subsequent navigation),
 * then reload so mock-repo re-initialises from the cleaned state.
 */
export async function gotoDemo(page: Page) {
  // First load — page may have stale demo data from a previous test run.
  await page.goto('/demo');
  await page.waitForLoadState('domcontentloaded');

  // Clear stale data synchronously — this is a one-time call, not an
  // addInitScript, so subsequent page.goto() calls in the same test will
  // NOT re-clear the storage.
  await page.evaluate(() => {
    localStorage.removeItem('notes-demo-items-v1');
    localStorage.removeItem('pwa-install-dismissed');
  });

  // Reload so mock-repo re-initialises with clean seed data.
  await page.reload();
  // Shell is ready when a "New note" button is visible. On mobile there are
  // two (sidebar + QuickCapture FAB), so we take .first() to avoid strict mode.
  await expect(page.getByRole('button', { name: 'New note' }).first()).toBeVisible({
    timeout: 15_000,
  });
}

/**
 * @deprecated Use gotoDemo() — it now handles storage reset internally.
 * Kept as a no-op so existing beforeEach calls don't need to be removed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function resetStorage(_page: Page) {
  // no-op: gotoDemo() clears storage after the initial navigation.
}

/** Open the AppShell navbar drawer on mobile (no-op on desktop, where it is
 *  always visible). Tests that interact with sidebar rows should call this in
 *  their beforeEach when running on a compact viewport. */
export async function openMobileNavbar(page: Page) {
  const burger = page.getByRole('button', { name: /navigation/i }).first();
  if (await burger.isVisible().catch(() => false)) {
    const ariaExpanded = await burger.getAttribute('aria-expanded').catch(() => null);
    if (ariaExpanded !== 'true') await burger.click();
  }
}

/** True if the current Playwright viewport is mobile-sized (< 768 px wide). */
export function isMobileViewport(page: Page): boolean {
  const vp = page.viewportSize();
  return !!vp && vp.width < 768;
}

/** Click the sidebar row whose label matches `title`. */
export async function clickSidebarItem(page: Page, title: string) {
  await page.locator('.mantine-AppShell-navbar').getByText(title).first().click();
}

/** Open the "New note" dialog from the sidebar + button (desktop layout).
 *  Scoped to the navbar so it doesn't collide with the QuickCapture FAB
 *  that's rendered on compact viewports. */
export async function openNewNoteDialog(page: Page) {
  await page.locator('.mantine-AppShell-navbar').getByRole('button', { name: 'New note' }).click();
}

/** Create a note via the dialog; returns the title used. */
export async function createNote(page: Page, title: string) {
  await openNewNoteDialog(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').first().fill(title);
  await dialog.getByRole('button', { name: /create/i }).click();
  await expect(dialog).not.toBeVisible();
}

/** Open the row action menu for an item in the sidebar, and wait until the
 *  dropdown is actually open (a `role="menuitem"` is visible).
 *
 *  Why `exact: true`: dnd-kit applies role="button" + listeners to the row
 *  <Group>, so the outer row has an accessible name that *contains* "Actions
 *  for {title}" along with the row's other text. Without `exact: true`,
 *  Playwright's default substring match picks the outer row button first —
 *  clicking it navigates to the note instead of opening the menu. */
export async function openRowMenu(page: Page, title: string) {
  await page.getByRole('button', { name: `Actions for ${title}`, exact: true }).click();
  // Mantine renders the Menu in a portal; wait until the dropdown actually
  // mounts before the caller tries to interact with menuitems.
  await page.locator('[role="menuitem"]').first().waitFor({ state: 'visible', timeout: 5000 });
}
