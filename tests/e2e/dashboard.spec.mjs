import { aggregate, percentText } from '../../site/assets/js/dashboard.js';
import { APPLICATIONS, TOTAL, countOf } from './expected.mjs';
import { expect, test } from './fixtures.mjs';

import { DESIGN_IDS as DESIGNS } from '../../site/assets/js/designs/index.js';

const pane = (page, index = 0) => page.locator('section.pane').nth(index);
const root = (page, index = 0) => pane(page, index).locator('.pane__root');
const query = (page) => new URL(page.url()).searchParams;
const kpi = (page, key, index = 0) => pane(page, index).locator(`[data-kpi="${key}"]`);

/** 画面に出ている集計値を DOM から読み取る。 */
async function readAll(page, index = 0, a) {
  const text = async (selector) => (await pane(page, index).locator(selector).first().textContent()).trim();
  return {
    kpi: await Promise.all(['total', 'pending', 'done', 'rate'].map((k) => text(`[data-kpi="${k}"]`))),
    months: await Promise.all(a.months.map((m) => text(`[data-month="${m.key}"]`))),
    statuses: await Promise.all(a.statuses.map(async (s) => [await text(`[data-status="${s.value}"]`), await text(`[data-status-share="${s.value}"]`)])),
    types: await Promise.all(a.types.map(async (t) => [await text(`[data-type-count="${t.type}"]`), await text(`[data-type-share="${t.type}"]`)])),
  };
}

const expectedOf = (c) => {
  const a = aggregate(APPLICATIONS, c);
  return {
    a,
    values: {
      kpi: [String(a.total), String(a.pending), String(a.done), percentText(a.rateTenths)],
      months: a.months.map((m) => String(m.count)),
      statuses: a.statuses.map((s) => [String(s.count), percentText(s.tenths)]),
      types: a.types.map((t) => [String(t.count), percentText(t.tenths)]),
    },
  };
};

/** 集計条件を画面の操作で変える（セレクトまたはラジオ。デザインごとに部品が違う）。 */
async function setCondition(page, name, value, index = 0) {
  const control = pane(page, index).locator(`[data-bind="${name}"]`).first();
  if ((await control.evaluate((el) => el.tagName)) === 'SELECT') await control.selectOption(value);
  else await pane(page, index).locator(`[data-bind="${name}"][value="${value}"]`).check();
}

const CONDITIONS = [
  { period: 'fy', dept: '' },
  { period: 'q2', dept: '' },
  { period: 'h1', dept: 'こども家庭課' },
  { period: 'm3', dept: '市民課' },
];

const urlOf = (c, design) => `?screen=dashboard&design=${design}${c.period !== 'fy' ? `&period=${c.period}` : ''}${c.dept ? `&dept=${encodeURIComponent(c.dept)}` : ''}`;

test.describe('各デザインのダッシュボード', () => {
  for (const id of DESIGNS) {
    test(`${id}: 表示・集計値が一覧データの集計と一致し、条件の切り替えで連動して更新される`, async ({ page }) => {
      await page.goto(`?screen=dashboard&design=${id}`);
      const p = pane(page);
      await expect(p).toHaveAttribute('data-design', id);
      await expect(page.locator('#lab-screen')).toHaveValue('dashboard');
      await expect(p.locator('[data-focus="heading"]')).toHaveText('申請処理ダッシュボード');
      await expect(kpi(page, 'total')).toHaveText(String(TOTAL));

      for (const c of CONDITIONS) {
        await setCondition(page, 'period', c.period);
        await setCondition(page, 'dept', c.dept);
        const { a, values } = expectedOf(c);
        await expect(kpi(page, 'total')).toHaveText(String(a.total));
        expect(await readAll(page, 0, a)).toEqual(values);

        // URL に集計条件が反映される（既定値は省略）
        const q = query(page);
        expect([q.get('period'), q.get('dept')]).toEqual([c.period === 'fy' ? null : c.period, c.dept || null]);
        // 合計の整合：処理待ち＋処理完了＝受付件数、状態別・月別・種別別の合計＝受付件数
        const sum = (arr) => arr.reduce((n, x) => n + Number(x), 0);
        expect(Number(values.kpi[1]) + Number(values.kpi[2])).toBe(Number(values.kpi[0]));
        expect(sum(values.statuses.map((s) => s[0]))).toBe(a.total);
        expect(sum(values.months)).toBe(a.total);
        expect(sum(values.types.map((t) => t[0]))).toBe(a.total);
      }
      await expect(page.locator('#lab-live')).toContainText('で集計しました');

      // リセットで既定へ戻る
      await p.locator('[data-action="reset-conditions"]').click();
      await expect(kpi(page, 'total')).toHaveText(String(TOTAL));
      expect(query(page).get('period')).toBeNull();
      expect(query(page).get('dept')).toBeNull();
      await expect(p.locator('[data-action="reset-conditions"]')).toBeDisabled();
    });

    test(`${id}: 指標・状態・種別から一覧へ移動し、表示対象が集計と一致する`, async ({ page }) => {
      await page.goto(urlOf({ period: 'q2', dept: '' }, id));
      const p = pane(page);
      const a = aggregate(APPLICATIONS, { period: 'q2' });
      const rows = () => p.locator('.pane__root [data-id]');
      const scope = p.locator('[data-scope]');
      const back = async () => {
        await page.locator('#lab-screen').selectOption('dashboard');
        await expect(kpi(page, 'total')).toHaveText(String(a.total));
      };

      // 処理待ち → 一覧（処理待ちの申請だけ、期間は第2四半期）
      await p.locator('[data-action="open-list"][data-link-group="pending"]').first().click();
      await expect(page.locator('#lab-screen')).toHaveValue('list');
      await expect(p.locator('[data-focus="heading"]')).toBeFocused();
      await expect(rows()).toHaveCount(a.pending);
      await expect(scope).toContainText('第2四半期');
      await expect(scope).toContainText('処理待ち');
      expect(query(page).get('lperiod')).toBe('q2');
      expect(query(page).get('lgroup')).toBe('pending');
      expect(query(page).get('period')).toBe('q2');
      await expect(p.locator('[data-bind="keyword"]')).toHaveValue('');

      // 条件を解除すると、集計条件の全体に戻る
      await p.locator('[data-action="clear-scope"]').click();
      await expect(rows()).toHaveCount(TOTAL);
      await expect(scope).toHaveCount(0);
      expect(query(page).get('lperiod')).toBeNull();
      expect(query(page).get('period')).toBe('q2'); // ダッシュボードの条件は変わらない

      // 状態 → 一覧
      await back();
      const approved = a.statuses.find((s) => s.value === 'approved').count;
      await p.locator('[data-action="open-list"][data-link-status="approved"]').first().click();
      await expect(rows()).toHaveCount(approved);
      await expect(p.locator('[data-bind="status"]').first()).toBeVisible();
      expect(query(page).get('status')).toBe('approved');

      // 種別 → 一覧
      await back();
      const top = a.types[0];
      await p.locator(`[data-action="open-list"][data-link-type="${top.type}"]`).first().click();
      await expect(rows()).toHaveCount(top.count);
      await expect(scope).toContainText(top.type);
      expect(query(page).get('ltype')).toBe(top.type);

      // 受付件数（全体）→ 一覧
      await back();
      await p.locator('[data-action="open-list"]:not([data-link-group]):not([data-link-status]):not([data-link-type])').first().click();
      await expect(rows()).toHaveCount(a.total);
    });

    test(`${id}: 一覧へ移動した後に集計条件を変えても、一覧の絞り込みは変わらない`, async ({ page }) => {
      await page.goto(urlOf({ period: 'm3', dept: '' }, id));
      const p = pane(page);
      await p.locator('[data-action="open-list"][data-link-group="done"]').first().click();
      const done = aggregate(APPLICATIONS, { period: 'm3' }).done;
      await expect(p.locator('.pane__root [data-id]')).toHaveCount(done);

      await page.locator('#lab-screen').selectOption('dashboard');
      await setCondition(page, 'period', 'h1');
      await setCondition(page, 'dept', '住宅政策課');
      await page.locator('#lab-screen').selectOption('list');
      await expect(p.locator('.pane__root [data-id]')).toHaveCount(done);
      expect(query(page).get('lperiod')).toBe('m3');
      expect(query(page).get('lgroup')).toBe('done');
      expect(query(page).get('period')).toBe('h1');
    });

    test(`${id}: グラフの値が文字でも確認でき、グラフ・表が名前を持つ`, async ({ page }) => {
      await page.goto(`?screen=dashboard&design=${id}`);
      const p = pane(page);
      const a = aggregate(APPLICATIONS, { period: 'fy' });
      // 月別・状態・種別の各値が、見える文字として存在する
      for (const m of a.months) await expect(p.locator(`[data-month="${m.key}"]`)).toBeVisible();
      for (const s of a.statuses) await expect(p.locator(`[data-status="${s.value}"]`)).toBeVisible();
      for (const t of a.types) await expect(p.locator(`[data-type-count="${t.type}"]`)).toBeVisible();
      // 状態は色だけでなくラベルと数値でも判別できる
      for (const s of a.statuses) await expect(root(page)).toContainText(s.label);
      // SVG は role=img と値入りのラベルを持つ。棒グラフは名前つきの list
      for (const svg of await p.locator('svg[role="img"]').all()) expect(await svg.getAttribute('aria-label')).toMatch(/\d/);
      for (const chart of await p.locator('ol[class*="chart-"], ul[class*="chart-"]').all()) expect(await chart.getAttribute('aria-label')).toBeTruthy();
      // アニメーション（transition / animation）を使っていない
      const animated = await p.evaluate((el) =>
        [...el.querySelectorAll('[class*="chart-"], [class*="chart-"] *')].filter((n) => {
          const s = getComputedStyle(n);
          return s.animationName !== 'none' || (s.transitionDuration !== '0s' && s.transitionProperty !== 'none');
        }).length,
      );
      expect(animated).toBe(0);
    });
  }
});

test('全デザインが同じ条件で同じ集計値を表示する', async ({ page }) => {
  for (const c of CONDITIONS) {
    const { a, values } = expectedOf(c);
    for (const id of DESIGNS) {
      await page.goto(urlOf(c, id));
      await expect(kpi(page, 'total')).toHaveText(String(a.total));
      expect(await readAll(page, 0, a), `${id} ${JSON.stringify(c)}`).toEqual(values);
    }
  }
});

test('画面の切り替え：一覧・フォームの状態を初期化せず、条件の変更は他の画面に影響しない', async ({ page }) => {
  await page.goto('?design=carbon');
  await pane(page).locator('[data-bind="keyword"]').fill('道路');
  await expect.poll(() => query(page).get('q')).toBe('道路');
  await page.locator('#lab-screen').selectOption('form');
  await pane(page).locator('[data-field="name"]').fill('山田 太郎');
  await pane(page).locator('[data-field="email"]').fill('taro@example.com');

  await page.locator('#lab-screen').selectOption('dashboard');
  await expect(pane(page).locator('[data-focus="heading"]')).toHaveText('申請処理ダッシュボード');
  await expect(pane(page)).toHaveAttribute('data-design', 'carbon');
  await setCondition(page, 'period', 'q2');
  await setCondition(page, 'dept', '市民課');
  await expect(kpi(page, 'total')).toHaveText(String(aggregate(APPLICATIONS, { period: 'q2', dept: '市民課' }).total));

  await page.locator('#lab-screen').selectOption('list');
  await expect(pane(page).locator('[data-bind="keyword"]')).toHaveValue('道路');
  await expect(pane(page).locator('.pane__root [data-id]')).toHaveCount(countOf({ keyword: '道路' }));
  await page.locator('#lab-screen').selectOption('form');
  await expect(pane(page).locator('[data-field="name"]')).toHaveValue('山田 太郎');
  await expect(pane(page).locator('[data-field="email"]')).toHaveValue('taro@example.com');
  // フォームの内容は URL に含まれない。集計条件は URL にある
  const url = decodeURIComponent(page.url());
  expect(url).not.toContain('山田');
  expect(url).not.toContain('taro');
  expect(query(page).get('period')).toBe('q2');
});

test('ナビゲーションの「ダッシュボード」から移動でき、ブラウザの戻る・進むに対応する', async ({ page }) => {
  await page.goto('?design=dads');
  await pane(page).locator('[data-action="nav"][data-target="dashboard"]').first().click();
  await expect(pane(page).locator('[data-focus="heading"]')).toHaveText('申請処理ダッシュボード');
  await expect(page.locator('#lab-screen')).toHaveValue('dashboard');
  await expect(pane(page).locator('a[aria-current="page"]')).toContainText('ダッシュボード');
  await setCondition(page, 'dept', '市民課');
  await page.goBack();
  await expect(kpi(page, 'total')).toHaveText(String(TOTAL));
  await page.goBack();
  await expect(pane(page).locator('[data-bind="keyword"]')).toBeVisible();
  await page.goForward();
  await page.goForward();
  await expect(kpi(page, 'total')).toHaveText(String(aggregate(APPLICATIONS, { dept: '市民課' }).total));
});

test('URL から画面・条件を復元し、再読み込みしても維持する', async ({ page }) => {
  await page.goto('?screen=dashboard&mode=compare&left=uswds&right=govuk&width=1280&period=h1&dept=%E4%BD%8F%E5%AE%85%E6%94%BF%E7%AD%96%E8%AA%B2');
  const c = { period: 'h1', dept: '住宅政策課' };
  const check = async () => {
    await expect(page.locator('#lab-screen')).toHaveValue('dashboard');
    await expect(pane(page, 0)).toHaveAttribute('data-design', 'uswds');
    await expect(pane(page, 1)).toHaveAttribute('data-design', 'govuk');
    await expect(page.locator('#lab-width')).toHaveValue('1280');
    const { a, values } = expectedOf(c);
    for (const i of [0, 1]) {
      await expect(kpi(page, 'total', i)).toHaveText(String(a.total));
      expect(await readAll(page, i, a)).toEqual(values);
      await expect(pane(page, i).locator('[data-bind="dept"]').first()).toHaveValue('住宅政策課');
    }
    await expect(pane(page, 0).locator('[data-bind="period"]').first()).toHaveValue('h1');
    await expect(pane(page, 1).locator('[data-bind="period"][value="h1"]')).toBeChecked();
  };
  await check();
  await page.reload();
  await check();
});

test('左右比較：集計条件は共通で、どちらで変えても両方が同じ結果に更新される', async ({ page }) => {
  await page.goto('?screen=dashboard&mode=compare&left=dads&right=fluent');
  for (const c of CONDITIONS) {
    // 左と右を交互に操作する
    await setCondition(page, 'period', c.period, 0);
    await setCondition(page, 'dept', c.dept, 1);
    const { a, values } = expectedOf(c);
    for (const i of [0, 1]) {
      await expect(kpi(page, 'total', i)).toHaveText(String(a.total));
      expect(await readAll(page, i, a), `pane ${i}`).toEqual(values);
      await expect(pane(page, i).locator('[data-bind="period"]').first()).toHaveValue(c.period);
      await expect(pane(page, i).locator('[data-bind="dept"]').first()).toHaveValue(c.dept);
    }
  }
});

test('デザインの切り替え・入れ替えでも集計条件と結果が保持される', async ({ page }) => {
  const c = { period: 'm3', dept: '市民課' };
  const { a, values } = expectedOf(c);
  await page.goto(urlOf(c, 'dads'));
  for (const id of DESIGNS) {
    await page.locator(`.lab-wide-only input[name="design"][value="${id}"]`).check();
    await expect(pane(page)).toHaveAttribute('data-design', id);
    await expect(kpi(page, 'total')).toHaveText(String(a.total));
    expect(await readAll(page, 0, a), id).toEqual(values);
    expect([query(page).get('period'), query(page).get('dept')]).toEqual(['m3', '市民課']);
  }
  await page.getByRole('radio', { name: '左右比較' }).check();
  await page.locator('#lab-left').selectOption('carbon');
  await page.locator('#lab-right').selectOption('govuk');
  await page.getByRole('button', { name: '入れ替え' }).click();
  await expect(pane(page, 0)).toHaveAttribute('data-design', 'govuk');
  for (const i of [0, 1]) expect(await readAll(page, i, a)).toEqual(values);
});

test('キーボードだけで集計条件を変更できる', async ({ page }) => {
  await page.goto('?screen=dashboard&design=carbon');
  const period = pane(page).locator('[data-bind="period"]');
  await period.focus();
  await page.keyboard.press('ArrowDown');
  await expect(period).toHaveValue('h1');
  await expect(kpi(page, 'total')).toHaveText(String(aggregate(APPLICATIONS, { period: 'h1' }).total));
  await expect(period).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(pane(page).locator('[data-bind="dept"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(pane(page).locator('[data-bind="dept"]')).toHaveValue('市民課');
  expect(query(page).get('dept')).toBe('市民課');
});

test('ダッシュボード用の「設計上の特徴」に切り替わる', async ({ page }) => {
  await page.goto('?screen=dashboard&design=fluent');
  await pane(page).locator('summary').click();
  const list = pane(page).locator('.pane__trait-list');
  for (const label of ['KPIの表現', '情報密度', 'グラフ・可視化', 'フィルターの配置', '情報の階層']) await expect(list).toContainText(label);
  await expect(list).not.toContainText('ナビゲーション');
  await expect(page.locator('#lab-dashbar')).toBeVisible();
});

test.describe('主要な画面幅でダッシュボードが破綻しない', () => {
  for (const width of [375, 768, 1280, 1920]) {
    test(`幅 ${width}px：単独・左右比較で横にはみ出さず、数値を確認できる`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const a = aggregate(APPLICATIONS, { period: 'q2', dept: '' });
      for (const mode of ['single', 'compare']) {
        for (const id of DESIGNS) {
          const right = DESIGNS[(DESIGNS.indexOf(id) + 1) % DESIGNS.length];
          const params = mode === 'single' ? `design=${id}` : `mode=compare&left=${id}&right=${right}`;
          await page.goto(`?screen=dashboard&${params}&period=q2`);
          const panes = mode === 'single' ? [0] : [0, 1];
          for (const i of panes) {
            await expect(kpi(page, 'total', i)).toHaveText(String(a.total));
            for (const m of a.months) await expect(pane(page, i).locator(`[data-month="${m.key}"]`)).toBeVisible();
          }
          const o = await page.evaluate(() => {
            const doc = document.documentElement;
            return {
              page: doc.scrollWidth - doc.clientWidth,
              panes: [...document.querySelectorAll('section.pane:not([hidden]) .pane__scroll')].map((el) => el.scrollWidth - el.clientWidth),
            };
          });
          expect(o.page, `${mode}/${id}@${width}: ページ全体`).toBeLessThanOrEqual(0);
          for (const v of o.panes) expect(v, `${mode}/${id}@${width}: サンプル画面`).toBeLessThanOrEqual(1);
        }
      }
    });
  }
});

test('各集計条件の組み合わせで、一覧の件数と KPI が一致する（一覧を直接開いて確認）', async ({ page }) => {
  for (const c of [{ period: 'h1', dept: '道路管理課' }, { period: 'm3', dept: '' }]) {
    const a = aggregate(APPLICATIONS, c);
    await page.goto(urlOf(c, 'govuk'));
    await pane(page).locator('[data-action="open-list"]').first().click();
    await expect(pane(page).locator('.pane__root [data-id]')).toHaveCount(a.total);
  }
});
