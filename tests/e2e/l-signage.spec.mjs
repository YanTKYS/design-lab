// 標示盤（l-signage）だけが持つ動き。共通の検索・絞り込み・詳細・フォーム・ダッシュボードは
// 各デザイン共通のテスト（site / form / dashboard）で確かめている。ここでは、状態の盤面から絞り込み→詳細→閉じる、
// 盤面の件数の読み上げが1回だけであること、375px のフォームのエラーと手順、ダッシュボードから一覧への引き継ぎだけを確かめる。
// （独立した試作のフォームは l-signage-form.spec.mjs で別に確かめている）
import { countOf } from './expected.mjs';
import { expect, test } from './fixtures.mjs';

const pane = (page) => page.locator('section.pane').first();

test('標示盤：盤面の区画で処理状態を選ぶと絞り込み、行を開いて閉じるとフォーカスが戻る', async ({ page }) => {
  await page.goto('?design=l-signage');
  const p = pane(page);
  const approved = p.locator('.ll-cell').filter({ hasText: '承認済' });
  await expect(approved).toContainText(`${countOf({ status: 'approved' })}件`); // ドット文字の横に文字の件数がある
  const snapshot = await p.locator('.ll-board').ariaSnapshot();
  expect(snapshot).toContain(`承認済 ${countOf({ status: 'approved' })}件`);
  expect(snapshot).not.toMatch(/\d+件 \d+件/);

  await approved.click();
  await expect(p.locator('[data-bind="status"][value="approved"]')).toBeChecked();
  await expect(p.locator('.pane__root [data-id]')).toHaveCount(countOf({ status: 'approved' }));
  expect(new URL(page.url()).searchParams.get('status')).toBe('approved');

  const first = p.locator('[data-action="open-detail"]').first();
  const id = await first.getAttribute('data-id');
  await first.click();
  await expect(p.locator('tr.is-open + tr.ll-detail-row [data-focus="detail"]')).toBeFocused(); // 詳細は選んだ行の直下
  await p.locator('.ll-detail [data-action="close-detail"]').click();
  await expect(p.locator(`[data-action="open-detail"][data-id="${id}"]`)).toBeFocused();
});

test('標示盤 375px：フォームのエラーの一覧へ移り、項目へ移動でき、操作がはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('?design=l-signage&screen=form');
  const p = pane(page);
  await expect(p.locator('.ls-now')).toContainText('手順 1 / 3');
  await p.locator('button[type="submit"]').click();
  const summary = p.locator('[data-focus="error-summary"]');
  await expect(summary).toBeFocused();
  await expect(summary).toBeInViewport();
  await summary.getByRole('button', { name: '申請者氏名' }).click();
  await expect(p.locator('[data-field="name"]')).toBeFocused();
  const overflow = await p.locator('.pane__scroll').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('標示盤：ダッシュボードの処理待ちから一覧へ移ると、条件を引き継ぎ、解除できる', async ({ page }) => {
  await page.goto('?design=l-signage&screen=dashboard&period=q2');
  const p = pane(page);
  await p.locator('.ld-kpi--pending [data-action="open-list"]').click();
  const scope = p.locator('[data-scope]');
  await expect(scope).toContainText('第2四半期');
  await expect(scope).toContainText('処理待ち');
  await p.locator('[data-action="clear-scope"]').click();
  await expect(scope).toHaveCount(0);
});
