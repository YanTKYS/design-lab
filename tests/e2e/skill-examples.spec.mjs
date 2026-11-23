// Skill の適用見本（examples/）のうち、再利用の参考になるキーボード操作と詳細の置き場所だけを確かめる。
// 見本は比較サイトの外にあり file:// で開く前提なので、配信サーバーを通さずにファイルを直接開く。
// （見本の主要操作・幅ごとの確認は、各見本の VERIFICATION.md に記録している）
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from './fixtures.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const booking = pathToFileURL(resolve(ROOT, 'examples/h-prime-room-booking/index.html')).href;
const lending = pathToFileURL(resolve(ROOT, 'examples/j-risograph-equipment-lending/index.html')).href;
const inquiry = pathToFileURL(resolve(ROOT, 'examples/k-shoreline-inquiry-tracker/index.html')).href;

test('折本の予約台帳：部屋をキーボードで選ぶと、選んだラジオにフォーカスが残り、矢印キーで続けて移れる', async ({ page }) => {
  await page.goto(booking);
  const faces = page.locator('#faces > .hp-face');
  await expect(faces).toHaveCount(6);

  await page.locator('#room-all').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#room-r1')).toBeChecked();
  await expect(page.locator('#room-r1')).toBeFocused();
  await expect(faces).toHaveCount(2); // 第1会議室の2件に絞り込まれている

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#room-r2')).toBeChecked();
  await expect(page.locator('#room-r2')).toBeFocused();
  await expect(faces).toHaveCount(1);
  await expect(page.locator('label[for="room-r2"]')).toContainText('1件'); // 件数の表示は残る
});

test('二色刷りの備品台帳：状態の札と列見出しの並べ替えをキーボードで操作しても、操作した部品にフォーカスが残る', async ({ page }) => {
  await page.goto(lending);
  const rows = page.locator('.jr-row');
  await expect(rows).toHaveCount(12);

  // 札（ラジオ）：矢印キーで続けて選べる
  await page.locator('#chip-all').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#chip-available')).toBeFocused();
  await expect(rows).toHaveCount(6);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#chip-lent')).toBeFocused();
  await expect(rows).toHaveCount(2);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#chip-all')).toBeFocused();

  // 並べ替え：表を描き直しても、押した列見出しのボタンにフォーカスが残り、もう一度押すと向きが変わる
  const dueHead = page.locator('th[aria-sort]', { has: page.locator('.jr-sort', { hasText: '返却予定' }) });
  const due = dueHead.locator('.jr-sort');
  await due.focus();
  await page.keyboard.press('Enter');
  await expect(due).toBeFocused();
  await expect(dueHead).toHaveAttribute('aria-sort', 'ascending');
  await expect(page.locator('.jr-id').first()).toHaveText('B-003'); // 返却予定の早いもの（期限切れ）が先頭
  await page.keyboard.press('Enter');
  await expect(due).toBeFocused();
  await expect(dueHead).toHaveAttribute('aria-sort', 'descending');
  await expect(page.locator('.jr-id').first()).toHaveText('B-007');
});

test('汀線の照会台帳：広い幅では詳細を開く前から右の列を確保し、狭い幅では選んだ行の直下に開く', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(inquiry);
  const table = page.locator('.k-table');
  const before = await table.boundingBox();
  await expect(page.locator('.k-detail-slot')).toBeVisible(); // 開く前から右の列の場所を見せる

  await page.locator('#open-Q-007').click();
  const detail = page.locator('#detail');
  await expect(page.locator('#detail-title')).toBeFocused();
  const after = await table.boundingBox();
  expect(after.width).toBe(before.width); // 開いた瞬間に表の幅が変わらない
  const box = await detail.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(after.x + after.width); // 詳細は表に重ならず、右の列にある
  await expect(page.locator('tr.is-open + tr.k-detail-row #detail')).toHaveCount(1); // DOM・Tab の順は選んだ行の直後
  await page.locator('.k-detail__close').click();
  await expect(page.locator('#open-Q-007')).toBeFocused();

  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('#open-Q-007').click();
  const row = await page.locator('tr.is-open').boundingBox();
  const narrow = await detail.boundingBox();
  expect(Math.abs(narrow.y - (row.y + row.height))).toBeLessThanOrEqual(2); // 選んだ行のすぐ下
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
