import { LOWEST_ID, TOTAL, countOf } from './expected.mjs';
import { expect, test } from './fixtures.mjs';

import { DESIGN_IDS as DESIGNS } from '../../site/assets/js/designs/index.js';

const pane = (page, index = 0) => page.locator('section.pane').nth(index);
const rows = (scope) => scope.locator('.pane__root [data-id]');
const keyword = (scope) => scope.locator('[data-bind="keyword"]');
const query = (page) => new URL(page.url()).searchParams;

async function setStatus(scope, value) {
  const control = scope.locator('[data-bind="status"]').first();
  if ((await control.evaluate((el) => el.tagName)) === 'SELECT') await control.selectOption(value);
  else await scope.locator(`[data-bind="status"][value="${value}"]`).check();
}

async function search(page, scope, text) {
  await keyword(scope).fill(text);
  await expect.poll(() => query(page).get('q') ?? '').toBe(text);
}

test.describe('各デザインの表示と機能', () => {
  for (const id of DESIGNS) {
    test(`${id}: 全件表示・検索・絞り込み・並べ替え`, async ({ page }) => {
      await page.goto(`?design=${id}`);
      const p = pane(page);
      await expect(p).toHaveAttribute('data-design', id);
      await expect(p.locator('[data-focus="heading"]')).toHaveText('申請一覧');
      await expect(rows(p)).toHaveCount(TOTAL);
      await expect(p.locator('.pane__root')).toContainText(`${TOTAL}件`);

      await search(page, p, 'こども家庭課');
      await expect(rows(p)).toHaveCount(countOf({ keyword: 'こども家庭課' }));
      await setStatus(p, 'approved');
      const approved = countOf({ keyword: 'こども家庭課', status: 'approved' });
      await expect(rows(p)).toHaveCount(approved);
      await expect(p.locator('.pane__root')).toContainText(`${TOTAL}件中 ${approved}件`);
      expect(query(page).get('status')).toBe('approved');

      await search(page, p, 'あおき');
      await expect(rows(p)).toHaveCount(0);
      await setStatus(p, '');
      await expect(rows(p)).toHaveCount(countOf({ keyword: 'あおき' }));
      await expect(rows(p).first()).toHaveAttribute('data-id', '2026-01042');

      await search(page, p, '');
      await p.locator('[data-action="sort"][data-key="id"]').click();
      await expect(rows(p).first()).toHaveAttribute('data-id', LOWEST_ID);
      expect(query(page).get('sort')).toBe('id');
      expect(query(page).get('order')).toBe('asc');
      await expect(p.locator('th[aria-sort="ascending"]')).toHaveCount(1);
    });

    test(`${id}: 詳細表示とフォーカスの復帰`, async ({ page }) => {
      await page.goto(`?design=${id}`);
      const p = pane(page);
      const trigger = p.locator('[data-action="open-detail"][data-id="2026-01041"]');
      await trigger.click();
      expect(query(page).get('detail')).toBe('2026-01041');
      await expect(p.locator('.pane__root')).toContainText('道路管理課');
      await expect(p.locator('.pane__root')).toContainText('工事期間');

      const modal = p.locator('[data-modal]');
      if (await modal.count()) {
        await expect(modal.locator('[data-focus="detail"]')).toBeFocused();
        await page.keyboard.press('Escape');
      } else {
        await p.locator('[data-action="close-detail"]').first().click();
      }
      await expect.poll(() => query(page).get('detail')).toBeNull();
      await expect(p.locator('[data-action="open-detail"][data-id="2026-01041"]')).toBeFocused();
    });

    test(`${id}: 新規申請で入力フォームへ移り、未実装の画面は通知する`, async ({ page }) => {
      await page.goto(`?design=${id}`);
      const p = pane(page);
      await p.locator('[data-action="new"]').first().click();
      await expect(p.locator('[data-form="entry"]')).toBeVisible();
      expect(query(page).get('screen')).toBe('form');
      await expect(page.locator('#lab-screen')).toHaveValue('form');
      await expect(p.locator('[data-focus="heading"]')).toBeFocused();

      const reports = p.locator('[data-action="nav"][data-target="settings"]');
      if (!(await reports.isVisible())) await p.locator('[data-action="toggle-ui"]').first().click();
      await reports.click();
      await expect(p.locator('.pane__root')).toContainText('「設定」画面');
      await p.locator('[data-action="dismiss-notice"]').click();
      await expect(p.locator('.pane__root')).not.toContainText('「設定」画面');

      await p.locator('[data-action="nav"][data-target="applications"]').first().click();
      await expect(rows(p)).toHaveCount(TOTAL);
      expect(query(page).get('screen')).toBeNull();
    });
  }
});

test('デザインを切り替えても検索条件・並び・詳細を維持する', async ({ page }) => {
  await page.goto('?design=dads');
  const p = pane(page);
  await search(page, p, '補助金');
  await setStatus(p, 'reviewing');
  await p.locator('[data-action="sort"][data-key="applicant"]').click();
  const pick = (id) => page.locator(`.lab-wide-only input[name="design"][value="${id}"]`).check();

  for (const id of DESIGNS.slice(1)) {
    await pick(id);
    await expect(p).toHaveAttribute('data-design', id);
    await expect(keyword(p)).toHaveValue('補助金');
    await expect(rows(p)).toHaveCount(countOf({ keyword: '補助金', status: 'reviewing' }));
    await expect(p.locator('th[aria-sort="ascending"]')).toContainText('申請者');
  }

  await p.locator('[data-action="open-detail"][data-id="2026-01033"]').click();
  for (const id of DESIGNS) {
    await pick(id);
    await expect(p).toHaveAttribute('data-design', id);
    await expect(p.locator('.pane__root')).toContainText('住宅政策課');
    const q = query(page);
    expect([q.get('design'), q.get('q'), q.get('status'), q.get('sort'), q.get('detail')]).toEqual([
      id,
      '補助金',
      'reviewing',
      'applicant',
      '2026-01033',
    ]);
  }
});

test('左右比較：独立したデザイン選択・共通の条件・入れ替え', async ({ page }) => {
  await page.goto('?design=carbon');
  await page.getByRole('radio', { name: '左右比較' }).check();
  const left = pane(page, 0);
  const right = pane(page, 1);
  await expect(right).toBeVisible();
  await expect(left).toHaveAttribute('data-design', 'carbon');
  await expect(right).not.toHaveAttribute('data-design', 'carbon');

  await page.locator('#lab-right').selectOption('govuk');
  await expect(right).toHaveAttribute('data-design', 'govuk');
  await search(page, left, '道路');
  await expect(rows(left)).toHaveCount(countOf({ keyword: '道路' }));
  await expect(rows(right)).toHaveCount(countOf({ keyword: '道路' }));
  await expect(keyword(right)).toHaveValue('道路');
  await setStatus(right, 'approved');
  await expect(rows(left)).toHaveCount(countOf({ keyword: '道路', status: 'approved' }));
  await expect(rows(right)).toHaveCount(countOf({ keyword: '道路', status: 'approved' }));

  await page.getByRole('button', { name: '入れ替え' }).click();
  await expect(left).toHaveAttribute('data-design', 'govuk');
  await expect(right).toHaveAttribute('data-design', 'carbon');
  await expect(page.locator('#lab-left')).toHaveValue('govuk');
  expect([query(page).get('left'), query(page).get('right')]).toEqual(['govuk', 'carbon']);
  await expect(rows(right)).toHaveCount(countOf({ keyword: '道路', status: 'approved' }));

  await page.getByRole('radio', { name: '単独表示' }).check();
  await expect(right).toBeHidden();
  await expect(left).toHaveAttribute('data-design', 'govuk');
});

test('URL から比較状態を復元する', async ({ page }) => {
  await page.goto('?mode=compare&left=uswds&right=fluent&width=1024&q=%E4%BF%9D%E8%82%B2&status=reviewing&sort=id&order=desc&detail=2026-01016');
  await expect(page.getByRole('radio', { name: '左右比較' })).toBeChecked();
  await expect(page.locator('#lab-left')).toHaveValue('uswds');
  await expect(page.locator('#lab-right')).toHaveValue('fluent');
  await expect(page.locator('#lab-width')).toHaveValue('1024');
  for (const index of [0, 1]) {
    const p = pane(page, index);
    await expect(p.locator('.pane__root')).toContainText('小林 彩');
    await expect(p.locator('[data-modal]')).toBeVisible();
    expect(await p.locator('.pane__frame').evaluate((el) => el.getBoundingClientRect().width)).toBe(1024);
  }
  await pane(page, 1).locator('[data-modal] [data-action="close-detail"]').first().click();
  await expect(pane(page, 0).locator('[data-modal]')).toHaveCount(0);
  await expect(rows(pane(page, 0))).toHaveCount(countOf({ keyword: '保育', status: 'reviewing' }));
  await expect(keyword(pane(page, 1))).toHaveValue('保育');
});

test('ブラウザの戻る操作で前の状態に戻る', async ({ page }) => {
  await page.goto('?design=dads');
  await page.locator('.lab-wide-only input[name="design"][value="fluent"]').check();
  await expect(pane(page)).toHaveAttribute('data-design', 'fluent');
  await page.goBack();
  await expect(pane(page)).toHaveAttribute('data-design', 'dads');
  await expect(page.locator('.lab-wide-only input[name="design"][value="dads"]')).toBeChecked();
});

test('キーボードでデザインを切り替えられる', async ({ page }) => {
  await page.goto('?design=dads');
  await page.locator('.lab-wide-only input[name="design"][value="dads"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(pane(page)).toHaveAttribute('data-design', 'carbon');
  await expect(page.locator('.lab-wide-only input[name="design"][value="carbon"]')).toBeFocused();
});

test('モーダル表示中は Tab がダイアログ内を循環する', async ({ page }) => {
  await page.goto('?design=uswds&detail=2026-01042');
  const modal = pane(page).locator('[data-modal]');
  await modal.locator('[data-focus="detail"]').focus();
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
});

test.describe('主要な画面幅でレイアウトが破綻しない', () => {
  for (const width of [375, 768, 1280, 1920]) {
    test(`幅 ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of ['single', 'compare']) {
        for (const id of DESIGNS) {
          const params = mode === 'single' ? `design=${id}` : `mode=compare&left=${id}&right=${DESIGNS[(DESIGNS.indexOf(id) + 1) % DESIGNS.length]}`;
          await page.goto(`?${params}`);
          await expect(rows(pane(page))).toHaveCount(TOTAL);
          const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            const scrollers = [...document.querySelectorAll('section.pane:not([hidden]) .pane__scroll')];
            return {
              page: doc.scrollWidth - doc.clientWidth,
              panes: scrollers.map((el) => el.scrollWidth - el.clientWidth),
              frames: [...document.querySelectorAll('section.pane:not([hidden]) .pane__frame')].map((el) => el.clientWidth),
            };
          });
          expect(overflow.page, `${mode}/${id}: ページ全体の横はみ出し`).toBeLessThanOrEqual(0);
          for (const value of overflow.panes) expect(value, `${mode}/${id}: サンプル画面の横はみ出し`).toBeLessThanOrEqual(1);
          if (mode === 'compare') for (const w of overflow.frames) expect(w, '比較時の最小幅').toBeGreaterThanOrEqual(600);
        }
      }
    });
  }
});
