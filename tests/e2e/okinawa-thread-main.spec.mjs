// 比較サイト本体の9番目のデザイン「糸の交点」（okinawa-thread）。全デザイン共通のテストに加え、固有の代表操作だけを確かめる。
import { expect, test } from './fixtures.mjs';
import { TOTAL, countOf } from './expected.mjs';

const pane = (page, i = 0) => page.locator('section.pane').nth(i);
const query = (page) => new URL(page.url()).searchParams;

test('糸の交点：左右比較のどちらにも置け、入れ替えても一覧の条件と詳細を保つ', async ({ page }) => {
  await page.goto('?mode=compare&left=okinawa-thread&right=carbon&width=1280&q=%E9%81%93%E8%B7%AF&status=reviewing&detail=2026-01041');
  const left = pane(page, 0);
  await expect(left).toHaveAttribute('data-design', 'okinawa-thread');
  await expect(left.locator('.pane__root')).toContainText(`${TOTAL}件中 ${countOf({ keyword: '道路', status: 'reviewing' })}件`);
  await expect(left.locator('.ot-detail')).toContainText('2026/10/29');
  // 公式のデザインシステムではないので、見出しのリンクは「設計と着想」
  await expect(left.locator('.pane__link')).toContainText('設計と着想');
  await expect(pane(page, 1).locator('.pane__link')).toContainText('公式サイト');

  await page.getByRole('button', { name: '入れ替え' }).click();
  await expect(pane(page, 1)).toHaveAttribute('data-design', 'okinawa-thread');
  expect(query(page).get('right')).toBe('okinawa-thread');
  await expect(pane(page, 1).locator('.ot-detail')).toContainText('2026/10/29');
  await pane(page, 1).locator('.ot-detail [data-action="close-detail"]').click();
  await expect.poll(() => query(page).get('detail')).toBeNull();
  await expect(pane(page, 1).locator('[data-action="open-detail"][data-id="2026-01041"]')).toBeFocused();
});

test('糸の交点 375px のペイン：表を行ごとのラベル付きの縦の台帳で読み、メニューを開閉できる', async ({ page }) => {
  await page.goto('?design=okinawa-thread&width=375&q=%E9%81%93%E8%B7%AF');
  const p = pane(page);
  const row = p.locator('.ot-ledger-row').first();
  const label = await row.locator('td[data-label="申請者"]').evaluate((el) => getComputedStyle(el, '::before').content);
  expect(label).toBe('"申請者"');
  expect(await p.locator('.pane__scroll').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const menu = p.locator('[data-action="toggle-ui"][aria-controls]');
  await expect(p.locator('.ot-nav')).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await p.locator('.ot-nav [data-target="dashboard"]').click();
  await expect(p.locator('[data-kpi="pending"]')).toHaveText('19');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('糸の交点 ダッシュボード：行型の指標から処理待ちの一覧へ移り、完了率はリンクにしない', async ({ page }) => {
  await page.goto('?design=okinawa-thread&screen=dashboard');
  const p = pane(page);
  await expect(p.locator('.ot-kpi')).toHaveCount(4);
  await expect(p.locator('.ot-kpi').nth(3).getByRole('link')).toHaveCount(0);
  await p.locator('.ot-kpi').nth(1).getByRole('link', { name: /一覧を見る/ }).click();
  await expect(p.locator('[data-focus="heading"]')).toHaveText('申請一覧');
  await expect(p.locator('.pane__root [data-id]')).toHaveCount(19);
  await expect(p.locator('[data-scope]')).toContainText('処理待ち');
  await p.locator('[data-action="clear-scope"]').click();
  await expect(p.locator('.pane__root [data-id]')).toHaveCount(TOTAL);
});
