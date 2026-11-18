import { expect, test } from './fixtures.mjs';
import { COLUMNS } from '../../site/assets/js/data.js';
import { TOTAL, countOf } from './expected.mjs';

const pane = (page, i = 0) => page.locator('section.pane').nth(i);
const field = (page, name, i = 0) => pane(page, i).locator(`[data-field="${name}"]`);
const invalid = (page, i) => pane(page, i).locator('[aria-invalid="true"][data-field]');
const params = (page) => new URL(page.url()).searchParams;

test('Astryx: 全列の並べ替えと右側シートのキーボード操作', async ({ page }) => {
  await page.goto('?design=astryx');
  const p = pane(page);
  for (const c of COLUMNS) {
    const button = p.locator(`[data-action="sort"][data-key="${c.key}"]`);
    await button.click();
    await expect(button.locator('..')).toHaveAttribute('aria-sort', c.key === 'receivedAt' ? 'descending' : 'ascending');
    await button.click();
    await expect(button.locator('..')).toHaveAttribute('aria-sort', c.key === 'receivedAt' ? 'ascending' : 'descending');
    expect(params(page).get('sort') ?? 'receivedAt').toBe(c.key);
  }
  const trigger = p.locator('[data-action="open-detail"][data-id="2026-01041"]');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const sheet = p.getByRole('dialog', { name: '申請の詳細' });
  await expect(sheet.locator('[data-focus="detail"]')).toBeFocused();
  await expect(p.locator('.ax-app')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('button', { name: '閉じる', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('button', { name: '閉じる', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(p.getByRole('dialog')).toHaveCount(0);
});

test('Astryx: 絞り込み中のバナー・表の下の内訳・空の結果を、条件のクリアで元へ戻せる', async ({ page }) => {
  await page.goto('?design=astryx');
  const p = pane(page);
  await expect(p.locator('.ax-banner--warning')).toHaveCount(0);
  await expect(p.locator('.ax-summary__item')).not.toHaveCount(0);

  await p.locator('[data-bind="keyword"]').fill('保育');
  await p.locator('[data-bind="status"]').selectOption('reviewing');
  const shown = countOf({ keyword: '保育', status: 'reviewing' });
  const banner = p.locator('.ax-banner--warning');
  await expect(banner).toContainText(`${TOTAL}件のうち ${shown}件を表示`);
  await expect(p.locator('.ax-summary__item')).toHaveCount(1); // 表示中の行だけが内訳に入る
  await expect(p.locator('.ax-summary__item b')).toHaveText(String(shown));

  await banner.getByRole('button', { name: '条件をクリア' }).click();
  await expect(banner).toHaveCount(0);
  await expect(p.locator('[data-action="open-detail"]')).toHaveCount(TOTAL);
  expect(params(page).has('q') || params(page).has('status')).toBe(false);

  await p.locator('[data-bind="keyword"]').fill('該当なし');
  await expect(p.getByText('条件に一致する申請はありません')).toBeVisible();
  await p.locator('.ax-empty').getByRole('button', { name: '条件をクリア' }).click();
  await expect(p.locator('[data-action="open-detail"]')).toHaveCount(TOTAL);
});

test('Astryx: 必須を標準にして「任意」だけを示し、チェックだけ個別に「必須」と示す', async ({ page }) => {
  await page.goto('?design=astryx&screen=form');
  const p = pane(page);
  await expect(p.getByText('「任意」と表示のない項目は必須です。')).toBeVisible();
  await expect(p.locator('.ax-optional')).toHaveCount(1);
  await expect(p.locator('label[for$="-phone"] .ax-optional')).toHaveText('任意');
  await expect(p.locator('.ax-required')).toHaveCount(1);
  for (const name of ['name', 'kana', 'email', 'type', 'date', 'body', 'agree']) {
    await expect(field(page, name)).toHaveAttribute('aria-required', 'true');
  }
  await expect(field(page, 'phone')).not.toHaveAttribute('aria-required', 'true');
  await expect(p.getByRole('list', { name: /入力の手順/ }).locator('[aria-current="step"]')).toContainText('入力');
});

test('Astryx: 左右のエラー・入力・ステップを同期し、入替後も保持する', async ({ page }) => {
  await page.goto('?screen=form&mode=compare&left=astryx&right=govuk');
  await pane(page).locator('[type="submit"]').click();
  await expect(field(page, 'name')).toBeFocused();
  await expect(invalid(page, 0)).toHaveCount(7);
  await expect(invalid(page, 1)).toHaveCount(7);
  await field(page, 'name', 1).fill('山田 太郎');
  await expect(field(page, 'name')).toHaveValue('山田 太郎');
  await expect(invalid(page, 0)).toHaveCount(6);
  await page.getByRole('button', { name: '入れ替え' }).click();
  await expect(pane(page, 1)).toHaveAttribute('data-design', 'astryx');
  await expect(field(page, 'name', 1)).toHaveValue('山田 太郎');
  await expect(invalid(page, 1)).toHaveCount(6);
  await page.getByRole('button', { name: '入力例', exact: true }).click();
  await pane(page, 1).locator('[type="submit"]').click();
  for (const i of [0, 1]) await expect(pane(page, i).locator('[data-action="form-confirm"]')).toBeVisible();
  await expect(pane(page, 1).getByRole('list', { name: /入力の手順/ }).locator('[aria-current="step"]')).toContainText('確認');
  await pane(page, 1).locator('[data-action="form-back"]').click();
  await expect(field(page, 'name')).toHaveValue('桜井 はるか');
  await pane(page, 1).locator('[type="submit"]').click();
  await pane(page, 1).locator('[data-action="form-confirm"]').click();
  for (const i of [0, 1]) await expect(pane(page, i).locator('[data-action="form-restart"]')).toBeVisible();
});

for (const target of ['name', 'keyword']) {
  test(`Astryx: ${target} の IME 変換・フォーカス・キャレットと左右同期`, async ({ page }) => {
    await page.goto(`?${target === 'name' ? 'screen=form&' : ''}mode=compare&left=astryx&right=plain`);
    const selector = target === 'name' ? '[data-field="name"]' : '[data-bind="keyword"]';
    const left = pane(page).locator(selector);
    const right = pane(page, 1).locator(selector);
    const client = await page.context().newCDPSession(page);
    await left.focus();
    await client.send('Input.imeSetComposition', { text: 'やま', selectionStart: 2, selectionEnd: 2 });
    await expect(left).toHaveValue('やま');
    await expect(right).toHaveValue('');
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await expect(left).toBeFocused();
    await expect(left).toHaveValue('やま');
    await client.send('Input.insertText', { text: '山田' });
    await expect(right).toHaveValue('山田');
    await page.keyboard.type('太郎');
    await expect(left).toHaveValue('山田太郎');
    await expect(right).toHaveValue('山田太郎');
    await expect(left).toBeFocused();
    if (target === 'name') expect(params(page).has('name')).toBe(false);
  });
}

test('Astryx: ダッシュボードの条件・指標から一覧への遷移と、共有URLの復元・戻る・進む', async ({ page }) => {
  await page.goto('?screen=dashboard&mode=compare&left=astryx&right=dads&period=q2&dept=市民課&width=1024');
  await expect(pane(page).locator('[data-bind="period"]')).toHaveValue('q2');
  await expect(pane(page, 1).locator('[data-bind="dept"]')).toHaveValue('市民課');
  await pane(page).locator('[data-bind="period"]').selectOption('m3');
  await page.goBack();
  await expect(pane(page).locator('[data-bind="period"]')).toHaveValue('q2');
  await page.goForward();
  await expect(pane(page, 1).locator('[data-bind="period"]')).toHaveValue('m3');
  await pane(page).getByRole('button', { name: '条件をリセット' }).click();
  await expect(pane(page, 1).locator('[data-bind="dept"]')).toHaveValue('');

  await page.goto('?screen=dashboard&design=astryx');
  await pane(page).locator('.ax-tile').nth(1).getByRole('link', { name: /一覧を表示/ }).click();
  await expect(pane(page).locator('[data-scope]')).toContainText('処理待ち');
  await expect(pane(page).locator('.ax-badge').first()).toBeVisible();
});

test('Astryx: 375pxでナビ・検索・表スクロール・詳細を操作できる', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('?design=astryx');
  const p = pane(page);
  await expect(p.getByRole('navigation')).toBeHidden();
  const menu = p.getByRole('button', { name: 'ナビゲーション', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(p.getByRole('navigation')).toBeVisible();
  await p.getByRole('link', { name: 'ダッシュボード', exact: true }).click();
  await expect(p.locator('[data-kpi="total"]')).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false'); // 移動したらメニューは閉じる
  await expect(p.getByRole('navigation')).toBeHidden();
  await menu.click();
  await p.getByRole('link', { name: '申請一覧', exact: true }).click();
  await p.locator('[data-bind="keyword"]').fill('道路');
  await expect.poll(() => params(page).get('q')).toBe('道路');
  const scroll = p.getByRole('region', { name: '申請一覧の表（横スクロール可）' });
  expect(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await scroll.focus();
  await page.keyboard.press('End');
  await p.locator('[data-action="open-detail"]').first().click();
  await expect(p.getByRole('dialog')).toBeVisible();
  await p.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(p.locator('[data-action="open-detail"]').first()).toBeFocused();
});

test('Astryx: 外部通信をせず、主要な文字・境界・状態バッジのコントラストを保つ', async ({ page }) => {
  const external = [];
  page.on('request', (r) => {
    if (new URL(r.url()).origin !== 'http://localhost:4173') external.push(r.url());
  });
  const channels = (rgb) => rgb.match(/[\d.]+/g).slice(0, 3).map(Number);
  const luminance = (rgb) => {
    const [r, g, b] = channels(rgb).map((x) => x / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };
  const ratio = (fg, bg) => {
    const a = luminance(fg);
    const b = luminance(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  for (const screen of ['list', 'form', 'dashboard']) {
    await page.goto(`?design=astryx&screen=${screen}`);
    const colors = await pane(page)
      .locator('.ds-astryx')
      .evaluate((el) => {
        const s = (sel, prop) => getComputedStyle(el.querySelector(sel))[prop];
        const out = {
          text: s('.ax-content', 'color'),
          surface: s('.ax-content', 'backgroundColor'),
          secondary: s('.ax-sub', 'color'),
          badges: [...el.querySelectorAll('.ax-badge')].map((b) => [getComputedStyle(b).color, getComputedStyle(b).backgroundColor]),
        };
        const control = el.querySelector('.ax-input, .ax-search, .ax-select-field select');
        if (control) out.control = getComputedStyle(control).borderTopColor;
        const primary = el.querySelector('.ax-button--primary');
        if (primary) out.primary = [getComputedStyle(primary).color, getComputedStyle(primary).backgroundColor];
        return out;
      });
    expect(ratio(colors.text, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(colors.secondary, colors.surface)).toBeGreaterThanOrEqual(4.5);
    if (colors.control) expect(ratio(colors.control, colors.surface)).toBeGreaterThanOrEqual(3);
    if (colors.primary) expect(ratio(...colors.primary)).toBeGreaterThanOrEqual(4.5);
    for (const [fg, bg] of colors.badges) expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  }
  expect(external).toEqual([]);
});
