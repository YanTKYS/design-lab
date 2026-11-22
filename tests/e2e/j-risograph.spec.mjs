// 二色刷り（j-risograph）だけが持つ動き・表現。共通の検索・絞り込み・詳細・フォーム・ダッシュボードは
// 各デザイン共通のテスト（site / form / dashboard）で確かめている。ここでは次だけを確かめる。
// 狭い幅で列見出しが並べ替えの札の列になること、網点（飾り）が表題・件数・指標の文字に重ならないこと、
// 版ずれの複製が見出しの名前に入らないこと、0件の指標と空の一覧の案内が実際の操作と食い違わないこと。
import { LOWEST_ID } from './expected.mjs';
import { expect, test } from './fixtures.mjs';

const pane = (page) => page.locator('section.pane').first();
const WASTE = encodeURIComponent('廃棄物対策課'); // 処理待ち0件・処理完了率100.0%になる担当課

/** 網点（clip の中で見える部分）と、texts の文字の矩形が重なる文字を返す。 */
const overlapsIn = (scope, dotSel, textSel) =>
  scope.evaluate(
    (root, [dotSel, textSel]) => {
      const clip = root.getBoundingClientRect();
      const d = root.querySelector(dotSel).getBoundingClientRect();
      const v = { left: Math.max(d.left, clip.left), right: Math.min(d.right, clip.right), top: Math.max(d.top, clip.top), bottom: Math.min(d.bottom, clip.bottom) };
      const hit = (r) => r.width > 0 && r.left < v.right && r.right > v.left && r.top < v.bottom && r.bottom > v.top;
      return [...root.querySelectorAll(textSel)]
        .filter((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return [...range.getClientRects()].some(hit) || (el.tagName === 'BUTTON' && hit(el.getBoundingClientRect()));
        })
        .map((el) => el.textContent.trim());
    },
    [dotSel, textSel],
  );

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
  test(`二色刷り ${width}px：網点は表題・件数・操作と、指標の数値・説明・リンクに重ならない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('?design=j-risograph');
    const p = pane(page);
    expect(await overlapsIn(p.locator('.jl-hero'), '.jl-hero__dots', '.jl-title, .jl-hero__count, .jl-new')).toEqual([]);

    await page.goto(`?design=j-risograph&screen=dashboard&dept=${WASTE}`);
    await expect(p.locator('[data-kpi="rate"]')).toHaveText('100.0%');
    expect(await overlapsIn(p.locator('.jl-hero'), '.jl-hero__dots', '.jl-title')).toEqual([]);
    expect(await overlapsIn(p.locator('.jd-kpis'), '.jd-kpis__dots', 'dt, .jd-kpi__value, .jd-kpi__note, .jd-kpi__link a')).toEqual([]);
  });
}

test('二色刷り：版ずれの複製は見出しの名前に入らない（一覧・フォーム・ダッシュボード）', async ({ page }) => {
  for (const [screen, title] of [['', '申請一覧'], ['&screen=form', '新規申請'], ['&screen=dashboard', '申請処理ダッシュボード']]) {
    await page.goto(`?design=j-risograph${screen}`);
    await expect(pane(page).getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible();
  }
});

test('二色刷り：0件の指標は一覧へのリンクを置かず、空の一覧は実際にある解除の操作を案内する', async ({ page }) => {
  await page.goto(`?design=j-risograph&screen=dashboard&dept=${WASTE}`);
  const p = pane(page);
  await expect(p.locator('[data-kpi="pending"]')).toHaveText('0');
  await expect(p.locator('.jd-kpis [data-link-group="pending"]')).toHaveCount(0);
  await expect(p.locator('.jd-kpis [data-link-group="done"]')).toHaveCount(1);

  // 引き継いだ条件だけで0件の一覧（共有 URL）：「引き継ぎを解除」だけを案内する
  await page.goto(`?design=j-risograph&lperiod=fy&ldept=${WASTE}&lgroup=pending`);
  await expect(p.locator('.jl-empty')).toContainText('「引き継ぎを解除」');
  await expect(p.locator('.jl-empty')).not.toContainText('条件をクリア');
  await expect(p.locator('[data-action="clear"]')).toHaveCount(0);
  await p.locator('[data-action="clear-scope"]').click();
  await expect(p.locator('.pane__root [data-id]')).not.toHaveCount(0);

  // 検索語で0件：「条件をクリア」を案内し、そのボタンがある
  await page.goto('?design=j-risograph&q=%E8%A9%B2%E5%BD%93%E3%81%AA%E3%81%97');
  await expect(p.locator('.jl-empty')).toContainText('「条件をクリア」');
  await expect(p.locator('[data-action="clear"]')).toHaveCount(1);
});
