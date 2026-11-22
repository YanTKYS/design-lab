// 汀線（k-shoreline）だけが持つ動き・表現。共通の検索・絞り込み・詳細・フォーム・ダッシュボードは
// 各デザイン共通のテスト（site / form / dashboard）で確かめている。ここでは次だけを確かめる。
// 詳細の置き場所（広い枠は選んだ行の右の列、狭い枠は行の直後）、月別の0件の点が基準線にあること、
// 左右比較でグラフの ID が衝突しないこと、狭い枠で表題の等高線が文字・操作に重ならないこと。
import { expect, test } from './fixtures.mjs';

const pane = (page, i = 0) => page.locator('section.pane').nth(i);
const TOSHI = encodeURIComponent('都市計画課'); // 令和8年度に0件の月がある担当課

test('汀線：詳細は、広い枠では選んだ行の右の列に、狭い枠では選んだ行の直後に開く', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('?design=k-shoreline');
  const p = pane(page);
  await p.locator('[data-action="open-detail"][data-id="2026-01041"]').click();
  const title = p.locator('[data-focus="detail"]');
  await expect(title).toBeFocused();
  await expect(title).toBeInViewport();
  const rowBox = await p.locator('tr.is-open').boundingBox();
  const detailBox = await p.locator('.kl-detail').boundingBox();
  expect(detailBox.x).toBeGreaterThanOrEqual(rowBox.x + rowBox.width - 1); // 行の右に続く

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(p.locator('tr.is-open + tr.kl-detail-row .kl-detail')).toBeVisible(); // DOM でも行の直後
  const row = await p.locator('tr.is-open').boundingBox();
  const below = await p.locator('.kl-detail').boundingBox();
  expect(below.y).toBeGreaterThanOrEqual(row.y + row.height - 1); // 行の下
  expect(below.x).toBeLessThan(row.x + row.width / 2);
  await p.locator('.kl-detail [data-action="close-detail"]').click();
  await expect(p.locator('[data-action="open-detail"][data-id="2026-01041"]')).toBeFocused();
});

for (const width of [1280, 375]) {
  test(`汀線 ${width}px：月別の0件の点は基準線に置き、件数の文字は点の真上`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`?design=k-shoreline&screen=dashboard&dept=${TOSHI}`);
    const chart = pane(page).locator('.kd-chart');
    const result = await chart.evaluate((el) => {
      const base = el.getBoundingClientRect().bottom - 30; // 基準線（.kd-chart::after は下から 30px）
      return [...el.querySelectorAll('.kd-chart__points li')].map((li) => {
        const dot = li.querySelector('.kd-chart__dot').getBoundingClientRect();
        const label = li.querySelector('b').getBoundingClientRect();
        return { count: Number(li.querySelector('b').textContent), dotCenter: (dot.top + dot.bottom) / 2, base, labelAbove: label.bottom <= dot.top + 1, labelX: Math.abs((label.left + label.right) / 2 - (dot.left + dot.right) / 2) };
      });
    });
    expect(result.some((r) => r.count === 0)).toBe(true);
    for (const r of result) {
      if (r.count === 0) expect(Math.abs(r.dotCenter - r.base)).toBeLessThanOrEqual(1);
      else expect(r.dotCenter).toBeLessThan(r.base - 5);
      expect(r.labelAbove).toBe(true);
      expect(r.labelX).toBeLessThanOrEqual(1);
    }
  });
}

test('汀線：左右比較（汀線×汀線）でも、月別のグラフの ID は重ならず、各ペインは自分の clipPath を参照する', async ({ page }) => {
  await page.goto('?mode=compare&left=k-shoreline&right=k-shoreline&screen=dashboard');
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((el) => el.id));
  expect(ids.length).toBe(new Set(ids).size);
  for (const i of [0, 1]) {
    const ok = await pane(page, i).evaluate((sec) => {
      const ref = sec.querySelector('[clip-path]').getAttribute('clip-path').match(/#([^)]+)/)[1];
      return Boolean(sec.querySelector(`clipPath[id="${ref}"]`));
    });
    expect(ok).toBe(true);
  }
});

test('汀線 375px：表題の等高線は、表題・件数・集計条件・操作に重ならない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const q of ['', '&screen=form', '&screen=dashboard']) {
    await page.goto(`?design=k-shoreline${q}`);
    const hits = await pane(page).locator('.kl-hero').evaluate((hero) => {
      const art = hero.querySelector('.kl-hero__art').getBoundingClientRect();
      const hit = (r) => r.width > 0 && r.left < art.right && r.right > art.left && r.top < art.bottom && r.bottom > art.top;
      return [...hero.querySelectorAll('.kl-title, .kl-hero__count, .kl-new, .kd-ref, .kd-cond label, .kd-cond select, .kd-reset, .ks-steps li')]
        .filter((el) => hit(el.getBoundingClientRect()))
        .map((el) => el.textContent.trim().slice(0, 20));
    });
    expect(hits, q || 'list').toEqual([]);
  }
});
