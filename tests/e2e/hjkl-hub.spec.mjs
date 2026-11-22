// 実験中の独立した試作：H′・J・K・L（いずれも仮称）の4案×3画面の比較ハブ。
// ハブから各案の一覧を開き、メニューで 一覧 → 新規申請 → ダッシュボード → 一覧 と同じ案の中を回り、
// 各画面の「比較ハブ」から戻れることを、4案の小さなループで確かめる（9デザインの比較サイトへは移らない）。
import { expect, test } from './fixtures.mjs';

const DESIGNS = [
  { name: '折本・H′', dir: 'h-prime' },
  { name: '二色刷り・J', dir: 'j-risograph' },
  { name: '汀線・K', dir: 'k-shoreline' },
  { name: '標示盤・L', dir: 'l-signage' },
];
/** 隠し文字（案名）を添えたリンクの名前。読み上げでは「申請一覧 （折本・H′）」のように間が空く。 */
const cell = (label, d) => new RegExp(`^${label}\\s*（${d.name}）$`);
/** 画面を移る前に読み込み（アイコン・モジュール）を終える。読み込み中に移ると取得が中断され、フィクスチャがエラーとして数える。 */
const settle = (page) => page.waitForLoadState('networkidle');
const SCREENS = [
  ['申請一覧', 'list'],
  ['新規申請', 'form'],
  ['ダッシュボード', 'dashboard'],
];

test('比較ハブ：12画面への入口と、各案の 一覧 → 新規申請 → ダッシュボード → 一覧 の回遊', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('experiments/hjkl/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('4案×3画面の比較ハブ');
  await expect(page.getByText('4案とも未採用の実験的なデザイン')).toBeVisible();
  await expect(page.getByText('12画面はそれぞれ独立した試作')).toBeVisible();
  await expect(page.getByRole('link', { name: '← 9デザインの比較サイトへ戻る' })).toHaveAttribute('href', '../../');

  // 4×3 のリンクが、それぞれの案・画面の試作を指す
  const grid = page.locator('table.hb-grid');
  await expect(grid.locator('tbody a')).toHaveCount(12);
  for (const d of DESIGNS) {
    for (const [label, screen] of SCREENS) {
      await expect(grid.getByRole('link', { name: cell(label, d) })).toHaveAttribute('href', `../${d.dir}-${screen}/`);
    }
  }

  for (const d of DESIGNS) {
    // ハブ → 一覧（キーボードで選ぶ）
    await page.goto('experiments/hjkl/');
    await settle(page);
    const entry = grid.getByRole('link', { name: cell('申請一覧', d) });
    await entry.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/experiments/${d.dir}-list/$`));
    await settle(page);

    // 一覧 → 新規申請 → ダッシュボード → 一覧（メニューは同じ案の試作だけを指し、現在地は aria-current）
    const nav = page.getByRole('navigation', { name: 'メインメニュー' });
    for (const [label, screen] of [...SCREENS.slice(1), SCREENS[0]]) {
      await nav.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/experiments/${d.dir}-${screen}/$`));
      await expect(nav.locator('[aria-current="page"]')).toHaveText(label);
      for (const [other, s] of SCREENS) {
        if (other !== label) await expect(nav.getByRole('link', { name: other, exact: true })).toHaveAttribute('href', `../${d.dir}-${s}/`);
      }
      // 各画面に「比較ハブ」と「比較サイト」を別のリンクとして置く
      await expect(page.getByRole('link', { name: '4案×3画面の比較ハブ' })).toHaveAttribute('href', '../hjkl/');
      await expect(page.getByRole('link', { name: '比較サイトへ戻る' })).toHaveAttribute('href', '../../');
      await settle(page);
    }

    // フォームの「申請一覧に戻る」も同じ案の一覧へ
    await nav.getByRole('link', { name: '新規申請', exact: true }).click();
    await expect(page.getByRole('link', { name: '← 申請一覧に戻る' })).toHaveAttribute('href', `../${d.dir}-list/`);
    await settle(page);

    // 比較ハブへ戻る
    await page.getByRole('link', { name: '4案×3画面の比較ハブ' }).click();
    await expect(page).toHaveURL(/\/experiments\/hjkl\/$/);
    await settle(page);
  }

  // 375px：横にはみ出さず、12のリンクがそのまま選べる
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(grid.locator('tbody a')).toHaveCount(12);
  for (const a of await grid.locator('tbody a').all()) await expect(a).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
