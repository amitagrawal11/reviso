// Generates the landing-page screenshots — light + dark themes — by booting
// the app via `vite preview`, opening /demo in a headless browser, and
// snapshotting at a desktop resolution.
//
// Outputs: public/landing/screenshot-light.{png,webp}
//          public/landing/screenshot-dark.{png,webp}
//
// Run with:  npm run screenshots
//
// First-time setup:
//   npm install -D playwright sharp
//   npx playwright install chromium

import { chromium, type Browser } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

const OUT_DIR = join(process.cwd(), 'public', 'landing');
const PORT = 4321;
const URL = `http://localhost:${PORT}/demo`;
const VIEWPORT = { width: 1600, height: 1000 };
// Output widths for responsive srcset. Browser picks the smallest variant
// that is at least display-width × DPR. Covers mobile 1x through 4K 2x.
const RESPONSIVE_WIDTHS = [800, 1200, 1600, 2400];

async function startPreview(): Promise<ChildProcess> {
  if (!existsSync('dist/index.html')) {
    console.error('No dist/ build found. Run `npm run build` first.');
    process.exit(1);
  }
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  await new Promise<void>((resolve, reject) => {
    let buf = '';
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      if (buf.includes('Local:') || buf.includes('localhost')) {
        proc.stdout?.off('data', onData);
        // Small grace period for Vite to start serving.
        setTimeout(resolve, 250);
      }
    };
    proc.stdout?.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => reject(new Error('preview did not start in time')), 10_000);
  });
  return proc;
}

async function snap(browser: Browser, theme: 'light' | 'dark') {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // retina-quality output
    colorScheme: theme,
  });
  const page = await ctx.newPage();

  // Pre-set the theme so the FOUC-prevention script picks it up before paint.
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('notes-color-scheme', t as string);
    } catch {}
  }, theme);

  await page.goto(URL, { waitUntil: 'networkidle' });

  // Give layout / fonts / icons a beat to settle.
  await page.waitForTimeout(800);

  const png = await page.screenshot({ type: 'png' });
  await ctx.close();

  // 1) Single full-resolution PNG fallback (older browsers without WebP support).
  //    We keep just one PNG at the largest natural width.
  const pngPath = join(OUT_DIR, `screenshot-${theme}.png`);
  await sharp(png).png({ compressionLevel: 9, palette: true }).toFile(pngPath);

  // 2) Responsive WebPs at multiple widths — modern browsers pick via srcset.
  for (const width of RESPONSIVE_WIDTHS) {
    const webpPath = join(OUT_DIR, `screenshot-${theme}-${width}.webp`);
    await sharp(png)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(webpPath);
  }
  // 3) Also keep a stable filename without width suffix as the default WebP
  //    candidate (used by the index.html preload + as the <img>-level src).
  const webpDefault = join(OUT_DIR, `screenshot-${theme}.webp`);
  await sharp(png)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(webpDefault);

  // eslint-disable-next-line no-console
  console.log(`✓ ${theme}: PNG + ${RESPONSIVE_WIDTHS.length + 1} WebP variants`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const preview = await startPreview();
  const browser = await chromium.launch();
  try {
    await snap(browser, 'light');
    await snap(browser, 'dark');
  } finally {
    await browser.close();
    preview.kill();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

// Avoid an empty "this file is just statements" check from Vite.
export {};
