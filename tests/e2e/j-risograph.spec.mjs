// 二色刷り（j-risograph）だけが持つ動き・表現。共通の検索・絞り込み・詳細・フォーム・ダッシュボードは
// 各デザイン共通のテスト（site / form / dashboard）で確かめている。ここでは、狭い幅で列見出しが並べ替えの札の列になること、
// ダッシュボードの網点（飾り）が指標の数値・説明・リンクに重ならないことだけを確かめる。
import { LOWEST_ID } from './expected.mjs';
import { expect, test } from './fixtures.mjs';

const pane = (page) => page.locator('section.pane').first();

test('二色刷り 375px：列見出しが並べ替えの札になり、押すと並びと現在の向きが変わる', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('?design=j-risograph');
  const p = pane(page);
  const byId = p.locator('[data-action="sort"][data-key="id"]');
  await expect(byId).toBeVisible();
  await expect(p.locator('th[aria-sort="descending"]')).toContainText('受付日');
  await byId.click();
  await expect(p.locator('th[aria-sort="ascending"]')).toContainText('受付番号');
  await expect(p.locator('.pane__root [data-id]').first()).toHaveAttribute('data-id', LOWEST_ID);
  await expect(byId).toBeFocused();
});

for (const width of [1280, 768, 375]) {
  test(`二色刷り ${width}px：ダッシュボードの網点は、指標の数値・説明・リンクに重ならない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('?design=j-risograph&screen=dashboard&dept=%E5%BB%83%E6%A3%84%E7%89%A9%E5%AF%BE%E7%AD%96%E8%AA%B2'); // 廃棄物対策課（100.0%）
    const p = pane(page);
    await expect(p.locator('[data-kpi="rate"]')).toHaveText('100.0%');
    const overlaps = await p.locator('.jd-kpis').evaluate((kpis) => {
      const dot = kpis.querySelector('.jd-kpis__dots').getBoundingClientRect();
      const clip = kpis.getBoundingClientRect(); // 上の罫で切れた部分は見えない
      const visible = { left: dot.left, right: dot.right, top: Math.max(dot.top, clip.top), bottom: Math.min(dot.bottom, clip.bottom) };
      const hit = (r) => r.left < visible.right && r.right > visible.left && r.top < visible.bottom && r.bottom > visible.top;
      const texts = [...kpis.querySelectorAll('dt, .jd-kpi__value, .jd-kpi__note, .jd-kpi__link a')];
      return texts.filter((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return [...range.getClientRects()].some(hit);
      }).map((el) => el.textContent.trim());
    });
    expect(overlaps).toEqual([]);
  });
}
