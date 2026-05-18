import { test, expect } from '@playwright/test';

/**
 * PWA installability tests.
 * Verifies manifest, icons, and service worker are all reachable and valid.
 */
test.describe('PWA', () => {
  test('manifest.webmanifest is reachable and valid JSON', async ({ request }) => {
    const resp = await request.get('/manifest.webmanifest');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('json');

    const manifest = await resp.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.length).toBeGreaterThanOrEqual(2);
  });

  test('manifest has 192px and 512px icons', async ({ request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes.some((s: string) => s.includes('192'))).toBe(true);
    expect(sizes.some((s: string) => s.includes('512'))).toBe(true);
  });

  test('manifest has a maskable icon', async ({ request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    const hasMaskable = manifest.icons.some((i: { purpose?: string }) =>
      i.purpose?.includes('maskable'),
    );
    expect(hasMaskable).toBe(true);
  });

  test('icon-192.png is reachable', async ({ request }) => {
    const resp = await request.get('/icon-192.png');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('png');
  });

  test('icon-512.png is reachable', async ({ request }) => {
    const resp = await request.get('/icon-512.png');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('png');
  });

  test('apple-touch-icon.png is reachable', async ({ request }) => {
    const resp = await request.get('/apple-touch-icon.png');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('png');
  });

  test('service worker (sw.js) is reachable', async ({ request }) => {
    const resp = await request.get('/sw.js');
    expect(resp.status()).toBe(200);
  });

  test('viewport meta has viewport-fit=cover for PWA safe areas', async ({ page }) => {
    await page.goto('/');
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).toContain('viewport-fit=cover');
  });
});
