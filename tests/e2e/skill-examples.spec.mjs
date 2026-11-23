// Skill の適用見本（examples/）のうち、再利用の参考になるキーボード操作だけを確かめる。
// 見本は比較サイトの外にあり file:// で開く前提なので、配信サーバーを通さずにファイルを直接開く。
// （見本の主要操作・幅ごとの確認は、各見本の VERIFICATION.md に記録している）
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from './fixtures.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const booking = pathToFileURL(resolve(ROOT, 'examples/h-prime-room-booking/index.html')).href;
const lending = pathToFileURL(resolve(ROOT, 'examples/j-risograph-equipment-lending/index.html')).href;

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
