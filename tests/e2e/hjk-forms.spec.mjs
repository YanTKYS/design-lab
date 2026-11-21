// 実験中の独立した試作：H′「折本」・J「二色刷り」・K「汀線」（いずれも仮称）の新規申請フォーム。
// 3案とも同じ共通モデルで動くため、主な遷移・値の保持・Tab 順・375px だけを同じ手順で確かめる。
import { expect, test } from './fixtures.mjs';

const POCS = [
  { name: '折本', url: 'experiments/h-prime-form/' },
  { name: '二色刷り', url: 'experiments/j-risograph-form/' },
  { name: '汀線', url: 'experiments/k-shoreline-form/' },
];
const field = (page, name) => page.locator(`[data-field="${name}"]`);

for (const poc of POCS) {
  test(`${poc.name}フォーム：Tab 順、エラー→修正→確認→項目の修正→完了、375px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(poc.url);

    // 申請者情報 → 手続きの内容の順に Tab で進む（折本は右頁から左頁へ）
    await field(page, 'name').focus();
    for (const name of ['kana', 'email', 'phone', 'type', 'date']) {
      await page.keyboard.press('Tab');
      await expect(field(page, name)).toBeFocused();
    }

    // 空のまま確認へ → エラーの一覧にフォーカス、項目名から欄へ
    await page.getByRole('button', { name: /確認へ/ }).click();
    const summary = page.locator('[data-focus="error-summary"]');
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('入力エラーが7件あります');
    await summary.getByRole('button', { name: '申請内容' }).click();
    await expect(field(page, 'body')).toBeFocused();

    // 入力例で確認へ → 項目の「修正」で戻ると、その欄にフォーカスし値を保つ
    await page.getByRole('button', { name: '入力例を入れる' }).click();
    await page.getByRole('button', { name: /確認へ/ }).click();
    await expect(page.locator('#poc-sheet-title')).toBeFocused();
    await expect(page.locator('main')).toContainText('2026年11月2日');
    await page.getByRole('button', { name: /^修正.*ふりがな/ }).click();
    await expect(field(page, 'kana')).toBeFocused();
    await expect(field(page, 'kana')).toHaveValue('さくらい はるか');
    await expect(field(page, 'agree')).toBeChecked();

    await page.getByRole('button', { name: /確認へ/ }).click();
    await page.getByRole('button', { name: /申請する/ }).click();
    await expect(page.locator('#poc-sheet-title')).toContainText('申請を受け付けました');
    expect(new globalThis.URL(page.url()).search).toBe('');
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);

    // 375px：縦1列で横にはみ出さない
    await page.getByRole('button', { name: '新しい申請を入力する' }).click();
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(field(page, 'name')).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const [a, b] = [await field(page, 'name').boundingBox(), await field(page, 'type').boundingBox()];
    expect(b.y).toBeGreaterThan(a.y); // 申請者情報の下に手続きの内容
  });
}
