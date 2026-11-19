// 実験中の独立した試作（琉球モダンの申請一覧）。比較サイトとは別ページで、代表の操作だけを確かめる。
import { expect, test } from './fixtures.mjs';
import { TOTAL, countOf } from './expected.mjs';

const URL = 'experiments/ryukyu-modern/';

test('琉球モダン試作 1280px：索引の件数で絞り込み、行の直後の詳細をキーボードで開閉する', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await expect(page.locator('.rm-count')).toContainText(`全${TOTAL}件`);

  // IME 変換中は結果を更新せず、確定で反映する
  const keyword = page.locator('#rm-kw');
  const client = await page.context().newCDPSession(page);
  await keyword.focus();
  await client.send('Input.imeSetComposition', { text: 'どうろ', selectionStart: 3, selectionEnd: 3 });
  await expect(keyword).toHaveValue('どうろ');
  await expect(page.locator('.rm-count')).toContainText(`全${TOTAL}件`);
  await client.send('Input.insertText', { text: '道路' });
  await expect(page.locator('.rm-count')).toContainText(`${TOTAL}件中 ${countOf({ keyword: '道路' })}件`);
  await expect(keyword).toBeFocused();

  const index = page.getByRole('group', { name: '処理状態' });
  for (const [label, n] of [['すべて', 12], ['受付済', 0], ['審査中', 1], ['補正依頼', 1], ['承認済', 8], ['却下', 2]]) {
    await expect(index.locator('.rm-index__item', { hasText: label })).toContainText(`${n}件`);
  }
  await index.getByRole('radio', { name: /審査中/ }).check();
  await expect(page.locator('.rm-count')).toContainText(`${TOTAL}件中 1件`);

  const toggle = page.getByRole('button', { name: /^詳細\s*（2026-01041）$/ });
  await toggle.focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('region', { name: '申請詳細（2026-01041）' });
  await expect(detail.getByRole('heading')).toBeFocused();
  await expect(detail).toContainText('2026/10/29');
  await expect(page.locator('[data-action="toggle-detail"][data-id="2026-01041"]')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
  await expect(page.locator('[data-action="toggle-detail"][data-id="2026-01041"]')).toBeFocused();
  await expect(page.locator('[data-action="toggle-detail"][data-id="2026-01041"]')).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: '受付日' }).click();
  await expect(page.locator('th[aria-sort="ascending"]')).toContainText('受付日');
});

test('琉球モダン試作 375px：件数付きセレクトと縦の台帳で、横にはみ出さず読める', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL);
  await expect(page.locator('#rm-app')).toHaveAttribute('data-layout', 'narrow');
  await expect(page.locator('.rm-card')).toHaveCount(TOTAL);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  await page.locator('#rm-kw').fill('道路');
  await page.getByLabel('処理状態').selectOption('reviewing');
  await expect(page.getByLabel('処理状態').locator('option:checked')).toHaveText('審査中（1件）');
  const card = page.locator('.rm-card');
  await expect(card).toHaveCount(1);
  for (const label of ['受付番号', '申請者', '申請種別', '受付日', '処理状態']) await expect(card.locator('dt', { hasText: label })).toBeVisible();
  await card.getByRole('button', { name: /詳細/ }).click();
  await expect(card.getByRole('region')).toContainText('2026/10/29');

  await page.locator('#rm-kw').fill('架空ゼロ');
  await expect(page.getByText('一致する申請はありません')).toBeVisible();
  await page.getByRole('button', { name: '検索条件をクリア' }).click();
  await expect(page.locator('#rm-kw')).toBeFocused();
  await expect(page.locator('.rm-card')).toHaveCount(TOTAL);
});
