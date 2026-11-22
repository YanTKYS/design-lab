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

  // エラーの同意欄へキーボードで移ると、赤いエラーの輪とは別に、生成りのフォーカスの外枠が付く
  const toAgree = summary.getByRole('button', { name: '確認事項への同意' });
  await toAgree.focus();
  await page.keyboard.press('Enter');
  const agree = p.locator('[data-field="agree"]');
  await expect(agree).toBeFocused();
  const ring = await agree.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { outline: `${cs.outlineStyle} ${cs.outlineColor}`, shadow: cs.boxShadow };
  });
  expect(ring.outline).toBe('solid rgb(255, 250, 240)'); // --ls-focus
  expect(ring.shadow).toContain('rgb(255, 159, 143)'); // --ls-error のエラーの輪も残る
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

test('標示盤：強制カラー（明るい配色）でも、目盛りの点灯と消灯、指標のドット数字が見分けられる', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', colorScheme: 'light' });
  await page.goto('?design=l-signage&screen=dashboard');
  const p = pane(page);
  const april = p.locator('.ld-table--months tbody tr').first();
  await expect(april.locator('[data-month]')).toHaveText('6');
  const ticks = await april.locator('.ld-ticks i').evaluateAll((els) => els.map((el) => ({ on: el.classList.contains('on'), bg: getComputedStyle(el).backgroundColor })));
  const onColors = new Set(ticks.filter((t) => t.on).map((t) => t.bg));
  const offColors = new Set(ticks.filter((t) => !t.on).map((t) => t.bg));
  expect(ticks.filter((t) => t.on)).toHaveLength(6);
  expect(onColors.size).toBe(1);
  expect([...offColors].some((c) => onColors.has(c))).toBe(false); // 点灯と消灯が別の色
  for (const key of ['total', 'rate']) {
    const contrast = await p.locator(`.ld-kpi--${key}`).evaluate((kpi) => {
      const lum = (c) => {
        const [r, g, b] = c.match(/\d+/g).slice(0, 3).map((v) => {
          const x = Number(v) / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const on = getComputedStyle(kpi.querySelector('.l-dots .on'));
      const off = getComputedStyle(kpi.querySelector('.l-dots .off'));
      const [a, b] = [lum(on.fill), lum(getComputedStyle(kpi).backgroundColor)].sort((x, y) => y - x);
      return { ratio: (a + 0.05) / (b + 0.05), off: Number(off.opacity) };
    });
    expect(contrast.ratio).toBeGreaterThanOrEqual(3); // 点灯のドットが地の色から読める
    expect(contrast.off).toBeLessThan(0.5); // 消灯は薄い
  }
});
