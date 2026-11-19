// 実験中の独立した試作（沖縄テーマB案「糸の交点」・仮称）。3画面の代表の操作だけを確かめる。
import { expect, test } from './fixtures.mjs';
import { APPLICATIONS, TOTAL } from './expected.mjs';
import { aggregate } from '../../site/assets/js/dashboard.js';

const URL = 'experiments/okinawa-thread/';
const nav = (page) => page.getByRole('navigation', { name: '画面の切替' });

test('糸の交点 申請一覧：道路→審査中→詳細をキーボードで開閉し、375px では5項目を縦に読む', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await expect(nav(page).getByRole('button', { name: '申請一覧' })).toHaveAttribute('aria-current', 'page');
  await page.locator('#th-kw').fill('道路');
  await expect(page.locator('.th-count__num')).toHaveText('12');
  await page.getByRole('group', { name: '処理状態' }).getByRole('radio', { name: /審査中/ }).check();
  await expect(page.locator('.th-count__num')).toHaveText('1');

  const toggle = page.locator('[data-action="toggle-detail"][data-id="2026-01041"]');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#th-detail-title-2026-01041')).toBeFocused();
  await expect(page.locator('.th-detail')).toContainText('2026/10/29');
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('#th-app')).toHaveAttribute('data-layout', 'narrow');
  const card = page.locator('.th-card');
  await expect(card).toHaveCount(1);
  for (const label of ['受付番号', '処理状態', '申請者', '申請種別', '受付日']) await expect(card.locator('dt', { hasText: label })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: '条件をクリア' }).click();
  await expect(page.locator('#th-kw')).toBeFocused();
  await expect(page.locator('.th-card')).toHaveCount(TOTAL);
});

test('糸の交点 新規申請：画面を行き来しても入力を保ち、エラー→修正→確認→項目の修正→完了まで進む', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await nav(page).getByRole('button', { name: '新規申請' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('新規申請');
  await page.getByRole('button', { name: '入力例を入れる' }).click();
  await page.locator('[data-field="phone"]').fill('');
  await page.locator('[data-field="kana"]').fill('サクライ ハルカ');
  await nav(page).getByRole('button', { name: 'ダッシュボード' }).click();
  await nav(page).getByRole('button', { name: '新規申請' }).click();
  await expect(page.locator('[data-field="kana"]')).toHaveValue('サクライ ハルカ');
  expect(page.url()).not.toContain('kana');

  await page.getByRole('button', { name: '確認へ' }).click();
  const summary = page.locator('[data-focus="error-summary"]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('入力エラーが1件あります');
  await summary.getByRole('button', { name: 'ふりがな' }).click();
  await expect(page.locator('[data-field="kana"]')).toBeFocused();
  await page.locator('[data-field="kana"]').fill('さくらい はるか');
  await expect(summary).toHaveCount(0);

  await page.getByRole('button', { name: '確認へ' }).click();
  await expect(page.locator('#th-sheet-title')).toBeFocused();
  await expect(page.locator('.th-axis--confirm > div', { hasText: '電話番号' })).toContainText('入力なし');
  await page.getByRole('button', { name: /^修正\s*（メールアドレス）$/ }).click();
  await expect(page.locator('[data-field="email"]')).toBeFocused();
  await page.getByRole('button', { name: '確認へ' }).click();
  await page.getByRole('button', { name: '申請する' }).click();
  await expect(page.getByRole('heading', { name: /申請が完了しました/ })).toBeFocused();
});

test('糸の交点 ダッシュボード：既定の集計と行型の指標、条件の連動、処理待ちから同じ条件の一覧へ', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await nav(page).getByRole('button', { name: 'ダッシュボード' }).click();
  for (const [key, value] of [['total', '71'], ['pending', '19'], ['done', '52'], ['rate', '73.2%']]) {
    await expect(page.locator(`[data-kpi="${key}"]`)).toHaveText(value);
  }
  await expect(page.locator('[data-month="2026-09"]')).toHaveText('15');
  // 完了率は一覧へのリンクを持たない（操作できる場所は下線の「一覧を見る」だけ）
  await expect(page.locator('.th-kpi').nth(3).getByRole('link')).toHaveCount(0);

  await page.getByLabel('担当課').selectOption('道路管理課');
  const a = aggregate(APPLICATIONS, { period: 'fy', dept: '道路管理課' });
  await expect(page.locator('[data-kpi="pending"]')).toHaveText(String(a.pending));
  await page.locator('.th-kpi').nth(1).getByRole('link', { name: /一覧を見る/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('申請一覧');
  await expect(page.locator('.th-count__num')).toHaveText(String(a.pending));
  await expect(page.locator('[data-scope]')).toContainText('道路管理課');
  await page.getByRole('button', { name: '引き継ぎを解除' }).click();
  await expect(page.locator('.th-count__num')).toHaveText(String(TOTAL));
});
