// Skill の適用見本（examples/）のうち、再利用の参考になるキーボード操作だけを確かめる。
// 見本は比較サイトの外にあり file:// で開く前提なので、配信サーバーを通さずにファイルを直接開く。
// （見本の主要操作・幅ごとの確認は、各見本の VERIFICATION.md に記録している）
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from './fixtures.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const booking = pathToFileURL(resolve(ROOT, 'examples/h-prime-room-booking/index.html')).href;

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
