// 実験中の独立した試作：L「標示盤」（仮称）の新規申請フォーム。主な遷移と入力値の保持だけを確かめる。
import { expect, test } from './fixtures.mjs';

const URL = 'experiments/l-signage-form/';

test('標示盤フォーム 1280px：Tab は見た目の順、エラー→修正→確認→項目の修正→完了まで値を保つ', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await expect(page.locator('.ls-now')).toContainText('入力');

  // 2列の入力欄は、左→右→次の段の順に Tab で進む
  await page.locator('[data-field="name"]').focus();
  for (const name of ['kana', 'email', 'phone', 'type', 'date']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`[data-field="${name}"]`)).toBeFocused();
  }

  // 空のまま確認へ → 入力画面にとどまり、エラーの一覧から欄へ移れる
  await page.getByRole('button', { name: /確認へ/ }).click();
  const summary = page.locator('[data-focus="error-summary"]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('入力エラーが7件あります');
  await expect(page.locator('.ls-chapter__err').first()).toHaveText('エラー 3件');
  await summary.getByRole('button', { name: 'ふりがな' }).click();
  await expect(page.locator('[data-field="kana"]')).toBeFocused();

  // 入力例で正しい値にすると確認へ進み、値が並ぶ
  await page.getByRole('button', { name: '入力例を入れる' }).click();
  await expect(page.locator('.ls-field-error')).toHaveCount(0);
  await page.getByRole('button', { name: /確認へ/ }).click();
  await expect(page.locator('.ls-now')).toContainText('確認');
  await expect(page.locator('#ls-sheet-title')).toBeFocused();
  await expect(page.locator('.ls-panel')).toContainText('さくらい はるか');
  await expect(page.locator('.ls-panel')).toContainText('2026年11月2日');

  // 項目の「修正」で入力へ戻ると、その欄にフォーカスし、値を保つ
  await page.getByRole('button', { name: /^修正.*ふりがな/ }).click();
  await expect(page.locator('[data-field="kana"]')).toBeFocused();
  await expect(page.locator('[data-field="kana"]')).toHaveValue('さくらい はるか');
  await expect(page.locator('[data-field="body"]')).toHaveValue(/第2希望/);

  await page.getByRole('button', { name: /確認へ/ }).click();
  await page.getByRole('button', { name: /申請する/ }).click();
  await expect(page.locator('.ls-now')).toContainText('完了');
  await expect(page.locator('#ls-sheet-title')).toBeFocused();

  // 新しい申請は空から。状態は URL・ストレージに残さない
  await page.getByRole('button', { name: '新しい申請を入力する' }).click();
  await expect(page.locator('[data-field="name"]')).toHaveValue('');
  expect(new globalThis.URL(page.url()).search).toBe('');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('標示盤フォーム 375px：縦1列で横にはみ出さず、確認へ進める', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL);
  await page.getByRole('button', { name: '入力例を入れる' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const name = await page.locator('[data-field="name"]').boundingBox();
  const kana = await page.locator('[data-field="kana"]').boundingBox();
  expect(kana.y).toBeGreaterThan(name.y); // 2列ではなく縦に並ぶ
  await page.getByRole('button', { name: /確認へ/ }).click();
  await expect(page.locator('.ls-now')).toContainText('確認');
  await page.getByRole('button', { name: '入力に戻る' }).click();
  await expect(page.locator('[data-field="name"]')).toBeFocused();
  await expect(page.locator('[data-field="name"]')).toHaveValue('桜井 はるか');
});
