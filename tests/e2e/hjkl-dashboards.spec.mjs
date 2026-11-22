// 実験中の独立した試作：H′・J・K・L（いずれも仮称）のダッシュボード。共通の dashboard.js で動くため、
// 既定値 → 対象期間（キーボード）→ 担当課 → 既定に戻す の一連の操作と 375px を同じ手順で確かめる。
// 0件の表示は UI の期間×担当課では起きないため、ユニットテスト（tests/unit/dashboard-pocs.test.mjs）で確かめる。
import { expect, test } from './fixtures.mjs';

const POCS = [
  { name: '折本', url: 'experiments/h-prime-dashboard/' },
  { name: '二色刷り', url: 'experiments/j-risograph-dashboard/' },
  { name: '汀線', url: 'experiments/k-shoreline-dashboard/' },
  { name: '標示盤', url: 'experiments/l-signage-dashboard/' },
];

const kpi = (page, key) => page.locator(`[data-kpi="${key}"]`);
const expectKpis = async (page, values) => {
  for (const [key, value] of Object.entries(values)) await expect(kpi(page, key)).toHaveText(value);
};
const DEFAULT = { total: '71', pending: '19', done: '52', rate: '73.2%' };

for (const poc of POCS) {
  test(`${poc.name}のダッシュボード：既定値 → 対象期間・担当課の変更で全体が更新 → 既定に戻す、375px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(poc.url);

    // 既定：令和8年度・すべての担当課・基準日 2026年10月12日
    await expectKpis(page, DEFAULT);
    await expect(page.locator('[data-month]')).toHaveCount(7);
    await expect(page.locator('[data-type-count]')).toHaveCount(8);
    await expect(page.getByText('2026年10月12日').first()).toBeVisible();
    const reset = page.locator('[data-action="reset"]');
    await expect(reset).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('a', { hasText: '一覧を見る' })).toHaveCount(0); // 指標から一覧へは移らない

    // 対象期間をキーボードで変える（令和8年度 → 上半期 → 第2四半期）
    const period = page.locator('[data-bind="period"]');
    await period.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(period).toHaveValue('q2');
    await expect(kpi(page, 'total')).toHaveText('40');
    await expect(page.locator('[data-month]')).toHaveCount(3);

    // Tab で担当課へ進んで変える
    await page.keyboard.press('Tab');
    const dept = page.locator('[data-bind="dept"]');
    await expect(dept).toBeFocused();
    await dept.selectOption('市民課');

    // 指標・月別・処理状態・種別がそろって更新される
    await expectKpis(page, { total: '8', pending: '2', done: '6', rate: '75.0%' });
    for (const [key, n] of [['2026-07', '1'], ['2026-08', '6'], ['2026-09', '1']]) await expect(page.locator(`[data-month="${key}"]`)).toHaveText(n);
    for (const [s, n, share] of [['received', '1', '12.5%'], ['reviewing', '0', '0.0%'], ['returned', '1', '12.5%'], ['approved', '3', '37.5%'], ['rejected', '3', '37.5%']]) {
      await expect(page.locator(`[data-status="${s}"]`)).toHaveText(n);
      await expect(page.locator(`[data-status-share="${s}"]`)).toHaveText(share);
    }
    await expect(page.locator('[data-type-count]')).toHaveCount(1);
    await expect(page.locator('[data-type-count="住民票の写し等交付申請"]')).toHaveText('8');
    await expect(page.getByText('2026年7月1日〜2026年9月30日・市民課').first()).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(/第2四半期.*市民課で集計しました。受付8件、処理待ち2件、処理完了6件、処理完了率75.0%/);
    await expect(page).toHaveTitle(/^第2四半期.*市民課｜ダッシュボード/);
    await expect(reset).toHaveAttribute('aria-disabled', 'false');

    // 条件はメモリだけ（URL・ストレージは変えない）
    expect(new URL(page.url()).search).toBe('');
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);

    // Tab で「既定に戻す」へ進み、Enter で戻す。フォーカスは対象期間へ
    await page.keyboard.press('Tab');
    await expect(reset).toBeFocused();
    await page.keyboard.press('Enter');
    await expectKpis(page, DEFAULT);
    await expect(period).toHaveValue('fy');
    await expect(dept).toHaveValue('');
    await expect(period).toBeFocused();
    await expect(reset).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[data-month]')).toHaveCount(7);
    await expect(page.locator('[aria-live="polite"]')).toHaveText(/^集計条件を既定に戻しました。/);

    // 375px：横にはみ出さず、同じ値のまま
    await page.setViewportSize({ width: 375, height: 812 });
    await expectKpis(page, DEFAULT);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
