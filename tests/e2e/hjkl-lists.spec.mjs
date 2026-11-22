// 実験中の独立した試作：H′・J・K・L（いずれも仮称）の申請一覧。共通の query.js で動くため、
// 全件への到達・検索・状態の絞り込み・並べ替え・代表の詳細・閉じる・条件の解除・375px を同じ手順で確かめる。
import { expect, test } from './fixtures.mjs';

const POCS = [
  { name: '折本', url: 'experiments/h-prime-list/', paged: true },
  { name: '二色刷り', url: 'experiments/j-risograph-list/' },
  { name: '汀線', url: 'experiments/k-shoreline-list/' },
  { name: '標示盤', url: 'experiments/l-signage-list/' },
];
const toggles = (page) => page.locator('[data-action="toggle-detail"]');
const toggleOf = (page, id) => page.locator(`[data-action="toggle-detail"][data-id="${id}"]`);

for (const poc of POCS) {
  test(`${poc.name}の一覧：全71件、検索・絞り込み・並べ替え・2026-01041 の詳細・閉じる・解除、375px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(poc.url);

    // 全71件へ到達できる（折本は8面ずつのページ送り、ほかは表に全件）
    if (poc.paged) {
      await expect(toggles(page)).toHaveCount(8);
      for (let i = 0; i < 8; i += 1) await page.getByRole('button', { name: '← 次の8件' }).click();
      await expect(page.getByText('65〜71件目')).toBeVisible();
      await expect(toggleOf(page, '2026-00770')).toBeVisible(); // 最も古い申請
      await expect(page.getByRole('button', { name: '← 次の8件' })).toBeDisabled();
    } else {
      await expect(toggles(page)).toHaveCount(71);
    }

    // 検索 → 処理状態 → 並べ替え
    const kw = page.locator('#poc-kw');
    await kw.fill('道路');
    await kw.press('Enter');
    await expect(page.locator('[role="status"]').first()).toContainText('12');
    await page.locator('[data-action="status"][data-status="reviewing"]').click();
    await expect(page.locator('[data-action="status"][data-status="reviewing"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(toggles(page)).toHaveCount(1);
    await kw.fill('');
    await kw.press('Enter');
    await expect(toggles(page)).toHaveCount(8);
    if (poc.paged) await page.locator('[data-bind="sort-key"]').selectOption('id');
    else await page.locator('th').getByRole('button', { name: /受付番号/ }).click();
    await expect(toggles(page).first()).toHaveAttribute('data-id', '2026-00917'); // 受付番号の昇順

    // 代表の申請の詳細 → 閉じるとボタンへ戻る
    await toggleOf(page, '2026-01041').click();
    const title = page.locator('#poc-detail-title');
    await expect(title).toBeFocused();
    const detail = page.locator('[data-detail]');
    for (const text of ['株式会社さくら野建設', '道路占用許可申請', '道路管理課', '窓口', '2026/10/29', '工事期間：11月中旬〜12月末']) await expect(detail).toContainText(text);
    await expect(toggleOf(page, '2026-01041')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggleOf(page, '2026-01041')).toBeFocused();
    await expect(detail).toHaveCount(0);

    // 0件 → 条件をクリア
    await kw.fill('該当しない語');
    await kw.press('Enter');
    await expect(page.getByText('条件に合う申請はありません')).toBeVisible();
    await page.locator('[data-action="clear"]').first().click();
    await expect(kw).toBeFocused();
    await expect(toggles(page)).toHaveCount(poc.paged ? 8 : 71);

    // 375px：横にはみ出さず、並べ替えを画面から操作でき、詳細を開ける
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('[data-action="status"][data-status="reviewing"]').click();
    const sortKey = page.locator('[data-bind="sort-key"]');
    await expect(sortKey).toBeVisible();
    await expect(page.locator('th button')).toHaveCount(0); // 見えない列見出しに Tab が入らない
    await sortKey.selectOption('receivedAt');
    await sortKey.selectOption('id'); // 受付番号・昇順
    await expect(toggles(page).first()).toHaveAttribute('data-id', '2026-00917');
    const dir = page.locator('[data-action="sort-dir"]');
    await dir.focus();
    await page.keyboard.press('Enter');
    await expect(dir).toBeFocused();
    await expect(dir).toHaveAccessibleName(/降順/);
    await expect(toggles(page).first()).toHaveAttribute('data-id', '2026-01041');
    await toggleOf(page, '2026-01041').click();
    await expect(page.locator('[data-detail]')).toContainText('2026/10/29');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test('折本の一覧：2段の幅では上の段の右端から読み、375px では上から下へ。ページ送り後は新しい面の先頭へ', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('experiments/h-prime-list/');
  const boxes = await toggles(page).evaluateAll((els) => els.map((el) => el.closest('li').getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y })));
  expect(boxes[0].y).toBe(boxes[3].y); // 1〜4件目が同じ段
  expect(boxes[0].x).toBeGreaterThan(boxes[1].x); // 右から左へ
  expect(boxes[4].y).toBeGreaterThan(boxes[0].y); // 5件目は次の段
  await expect(page.locator('.hp-sort__note')).toHaveText('右から左・上の段から', { useInnerText: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('.hp-sort__note')).toHaveText('上から下へ', { useInnerText: true });
  await page.getByRole('button', { name: '← 次の8件' }).click();
  const list = page.locator('#hp-panels');
  await expect(list).toBeFocused();
  await expect(toggles(page).first()).toBeInViewport();
  await expect(page.getByText('9〜16件目')).toBeAttached();
});

test('一覧の検索は IME 変換中に絞り込まず、確定後に反映する（4案共通の制御）', async ({ page }) => {
  await page.goto('experiments/j-risograph-list/');
  const client = await page.context().newCDPSession(page);
  await page.locator('#poc-kw').focus();
  await client.send('Input.imeSetComposition', { text: 'どうろ', selectionStart: 3, selectionEnd: 3 });
  await expect(page.locator('#poc-kw')).toHaveValue('どうろ');
  await expect(toggles(page)).toHaveCount(71);
  await client.send('Input.insertText', { text: '道路' });
  await expect(toggles(page)).toHaveCount(12);
  await expect(page.locator('#poc-kw')).toBeFocused();
});
