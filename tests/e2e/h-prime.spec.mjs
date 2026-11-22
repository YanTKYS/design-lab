// 折本（h-prime）だけが持つ動き：8件ずつの見開き送り。共通の検索・絞り込み・詳細・フォーム・ダッシュボードは
// 各デザイン共通のテスト（site / form / dashboard）で確かめている。ここでは見開きの送り・戻し、条件変更で1見開き目へ戻ること、
// 共有 URL の詳細が載る見開きを開くことだけを確かめる。
import { TOTAL, countOf } from './expected.mjs';
import { expect, test } from './fixtures.mjs';

const pane = (page) => page.locator('section.pane').first();
const visibleRows = (p) => p.locator('.hp-panels:not([hidden]) [data-id]');
const pageText = (p) => p.locator('.hp-pager__now');

test('折本：8件ずつの見開き送り、条件変更で1見開き目へ、共有 URL の詳細はその見開きを開く', async ({ page }) => {
  await page.goto('?design=h-prime');
  const p = pane(page);
  const pages = Math.ceil(TOTAL / 8);
  await expect(p.locator('.pane__root [data-id]')).toHaveCount(TOTAL); // 全件は画面の中にあり、見えるのは現在の見開きだけ
  await expect(visibleRows(p)).toHaveCount(8);
  await expect(pageText(p)).toHaveText(`1〜8件目 ／ 1・${pages}見開き`);
  const first = await visibleRows(p).first().getAttribute('data-id');

  // 「← 次の8件」で2見開き目へ。フォーカスは新しい見開きの先頭へ移り、URL は変わらない
  const url = page.url();
  await p.getByRole('button', { name: '← 次の8件' }).click();
  await expect(pageText(p)).toHaveText(`9〜16件目 ／ 2・${pages}見開き`);
  const top = p.locator('.hp-panels:not([hidden]) [data-focus="page-top"]');
  await expect(top).toBeFocused(); // 新しい見開きの先頭の受付番号
  await expect(top).toContainText('2026-');
  await expect(page.locator('#lab-live')).toHaveText('2見開き目を表示しています'); // 表示中の見開きと同じ番号を読み上げる
  expect(page.url()).toBe(url);
  await expect(visibleRows(p).first()).not.toHaveAttribute('data-id', first);
  await p.getByRole('button', { name: '前の8件 →' }).click();
  await expect(visibleRows(p).first()).toHaveAttribute('data-id', first);

  // 見開きを送ったあとで条件を変えると、1見開き目に戻る（範囲外の見開きにならない）
  await p.getByRole('button', { name: '← 次の8件' }).click();
  await p.getByRole('button', { name: '← 次の8件' }).click();
  await p.locator('[data-bind="status"][value="approved"]').check();
  const approved = countOf({ status: 'approved' });
  await expect(pageText(p)).toHaveText(`1〜8件目 ／ 1・${Math.ceil(approved / 8)}見開き`);
  await expect(visibleRows(p)).toHaveCount(8);

  // 共有 URL で後ろの見開きの申請の詳細を開くと、その見開きを表示し、閉じると元の面へフォーカスが戻る
  await page.goto('?design=h-prime&detail=2026-00770');
  await expect(p.locator('[data-focus="detail"]')).toBeVisible();
  await expect(pageText(p)).toContainText(`${pages}・${pages}見開き`);
  await p.locator('.hp-detail [data-action="close-detail"]').click();
  await expect(p.locator('[data-action="open-detail"][data-id="2026-00770"]')).toBeFocused();
});

test('折本 375px：見開きを送ると、新しい見開きの先頭（9件目）の受付番号が見える位置にフォーカスが移る', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('?design=h-prime');
  const p = pane(page);
  const next = p.getByRole('button', { name: '← 次の8件' });
  await next.scrollIntoViewIfNeeded(); // 縦に積んだ8件の下にある
  await next.click();
  const top = p.locator('.hp-panels:not([hidden]) [data-focus="page-top"]');
  await expect(top).toBeFocused();
  await expect(top).toBeInViewport();
  await expect(pageText(p)).toContainText('9〜16件目');
});
