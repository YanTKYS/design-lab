// 代表画面を撮影して ../images/ に書き出す（1280px × 3案。案Gだけ 375px の補助画像も撮る）。
// 実行：node docs/design-exploration-2/mock/build.mjs && node docs/design-exploration-2/mock/capture.mjs
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'images');
mkdirSync(OUT, { recursive: true });
const SHOTS = [['e-list', 1280], ['f-list', 1280], ['g-dashboard', 1280], ['g-dashboard', 375]];

const browser = await chromium.launch({ env: { ...process.env, LANG: 'ja_JP.UTF-8' }, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const context = await browser.newContext({ locale: 'ja-JP' });
for (const [name, width] of SHOTS) {
  const page = await context.newPage();
  let external = 0;
  page.on('request', (r) => { if (!/^(file|data):/.test(r.url())) external += 1; });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(pathToFileURL(join(HERE, `${name}.html`)).href);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: join(OUT, `${name}-${width}.png`), fullPage: true });
  console.log(`${name}-${width}.png\toverflow=${overflow}px\texternal=${external}`);
  await page.close();
}
await browser.close();
