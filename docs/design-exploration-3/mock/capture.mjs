// 申請一覧モックを 1280px で撮影し、../images/ に書き出す。
// 実行：node docs/design-exploration-3/mock/build.mjs && node docs/design-exploration-3/mock/capture.mjs
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'images');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 1280, height: 900 } });
for (const name of ['h-list', 'i-list', 'j-list']) {
  const page = await context.newPage();
  let external = 0;
  page.on('request', (r) => { if (!/^(file|data):/.test(r.url())) external += 1; });
  await page.goto(pathToFileURL(join(HERE, `${name}.html`)).href);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: join(OUT, `${name}-1280.png`), fullPage: true });
  console.log(`${name}-1280.png\toverflow=${overflow}px\texternal=${external}`);
  await page.close();
}
await browser.close();
