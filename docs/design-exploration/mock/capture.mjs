// 静的モックを 1280px・375px で撮影し、../images/ に PNG を書き出す（ページ全体）。
// 実行：node docs/design-exploration/mock/build.mjs && node docs/design-exploration/mock/capture.mjs
// 既存の @playwright/test に含まれる Chromium を使う。外部への通信はしない。

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'images');
mkdirSync(OUT, { recursive: true });

const SHOTS = [];
for (const concept of ['c', 'd']) for (const screen of ['list', 'form', 'dashboard']) for (const width of [1280, 375]) SHOTS.push({ concept, screen, width });

// 日付欄を日本語の書式（年/月/日）で表示するため、ブラウザの言語を日本語にする
const browser = await chromium.launch({
  args: ['--lang=ja-JP'],
  env: { ...process.env, LANG: 'ja_JP.UTF-8', LANGUAGE: 'ja' },
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const context = await browser.newContext({ locale: 'ja-JP', deviceScaleFactor: 1 });
const results = [];
for (const { concept, screen, width } of SHOTS) {
  const page = await context.newPage();
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url()); });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(pathToFileURL(join(HERE, `${concept}-${screen}.html`)).href);
  // 送信直後の状態として、フォームはエラーの一覧にフォーカスを置いて撮る
  if (screen === 'form') await page.locator('[role="alert"]').focus();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const file = `${concept}-${screen}-${width}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage: true });
  results.push({ file, overflow, external: external.length });
  await page.close();
}
// 本文だけの比較：上部の帯・見出しを除き、一覧・入力・集計の部分を同じ幅（1280px）で切り出す
const BODY = [
  { file: 'body-list', c: '.c-shelf', d: '.d-table' },
  { file: 'body-form', c: '.c-sec', d: '.d-sec' },
  { file: 'body-dashboard', c: '.c-block', d: '.d-panel--flow' },
];
for (const b of BODY) {
  for (const concept of ['c', 'd']) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(pathToFileURL(join(HERE, `${concept}-${b.file.replace('body-', '')}.html`)).href);
    const file = `${b.file}-${concept}.png`;
    await page.locator(b[concept]).first().screenshot({ path: join(OUT, file) });
    results.push({ file, overflow: 0, external: 0 });
    await page.close();
  }
}
await browser.close();
for (const r of results) console.log(`${r.file}\toverflow=${r.overflow}px\texternal=${r.external}`);
