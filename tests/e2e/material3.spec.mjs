import { expect, test } from './fixtures.mjs';
import { COLUMNS } from '../../site/assets/js/data.js';

const pane = (page, i = 0) => page.locator('section.pane').nth(i);
const field = (page, name, i = 0) => pane(page, i).locator(`[data-field="${name}"]`);
const invalid = (page, i) => pane(page, i).locator('[aria-invalid="true"][data-field]');
const params = (page) => new URL(page.url()).searchParams;

test('Material 3: 全列の並べ替えと中央ダイアログのキーボード操作', async ({ page }) => {
  await page.goto('?design=material3');
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
  const modal = p.getByRole('dialog', { name: '申請の詳細' });
  await expect(modal.locator('[data-focus="detail"]')).toBeFocused();
  await expect(p.locator('.m3-app')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await expect(modal.getByRole('button', { name: '閉じる' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(modal.getByRole('button', { name: '閉じる' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(modal.getByRole('button', { name: '閉じる' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('Material 3: 左右のエラー・入力・ステップを同期し、入替後も保持する', async ({ page }) => {
  await page.goto('?screen=form&mode=compare&left=material3&right=govuk');
  await pane(page).locator('[type="submit"]').click();
  await expect(field(page, 'name')).toBeFocused();
  await expect(invalid(page, 0)).toHaveCount(7);
  await expect(invalid(page, 1)).toHaveCount(7);
  await field(page, 'name', 1).fill('山田 太郎');
  await expect(field(page, 'name')).toHaveValue('山田 太郎');
  await expect(invalid(page, 0)).toHaveCount(6);
  await expect(invalid(page, 1)).toHaveCount(6);
  await page.getByRole('button', { name: '入れ替え' }).click();
  await expect(pane(page, 1)).toHaveAttribute('data-design', 'material3');
  await expect(field(page, 'name', 1)).toHaveValue('山田 太郎');
  await expect(invalid(page, 1)).toHaveCount(6);
  await page.getByRole('button', { name: '入力例', exact: true }).click();
  await pane(page, 1).locator('[type="submit"]').click();
  for (const i of [0, 1]) await expect(pane(page, i).locator('[data-action="form-confirm"]')).toBeVisible();
  await pane(page, 1).locator('[data-action="form-back"]').click();
  await expect(field(page, 'name')).toHaveValue('桜井 はるか');
  await expect(field(page, 'name', 1)).toHaveValue('桜井 はるか');
  await pane(page, 1).locator('[type="submit"]').click();
  await pane(page, 1).locator('[data-action="form-confirm"]').click();
  for (const i of [0, 1]) await expect(pane(page, i).locator('[data-action="form-restart"]')).toBeVisible();
});

for (const target of ['name', 'keyword']) {
  test(`Material 3: ${target} の IME 変換・フォーカス・キャレットと左右同期`, async ({ page }) => {
    await page.goto(`?${target === 'name' ? 'screen=form&' : ''}mode=compare&left=material3&right=plain`);
    const selector = target === 'name' ? '[data-field="name"]' : '[data-bind="keyword"]';
    const left = pane(page).locator(selector),
      right = pane(page, 1).locator(selector);
    const client = await page.context().newCDPSession(page);
    await left.focus();
    await client.send('Input.imeSetComposition', {
      text: 'やま',
      selectionStart: 2,
      selectionEnd: 2,
    });
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

test('Material 3: 共有URLの復元、戻る・進むと状態を保った幅変更', async ({ page }) => {
  await page.goto('?screen=dashboard&mode=compare&left=material3&right=dads&period=q2&dept=市民課&width=768');
  await expect(pane(page).locator('[data-bind="period"]')).toHaveValue('q2');
  await expect(pane(page, 1).locator('[data-bind="dept"]')).toHaveValue('市民課');
  await pane(page).locator('[data-bind="period"]').selectOption('m3');
  await page.goBack();
  await expect(pane(page).locator('[data-bind="period"]')).toHaveValue('q2');
  await page.goForward();
  await expect(pane(page, 1).locator('[data-bind="period"]')).toHaveValue('m3');
  await page.reload();
  await expect(pane(page)).toHaveAttribute('data-design', 'material3');
  for (const width of ['375', '1024', '1280']) {
    await page.locator('#lab-width').selectOption(width);
    await expect(pane(page).locator('[data-bind="period"]')).toHaveValue('m3');
    await expect(pane(page).locator('.pane__frame')).toHaveCSS('width', `${width}px`);
  }
});

test('Material 3: 375pxでナビ・検索・表スクロール・詳細を操作できる', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('?design=material3');
  const p = pane(page);
  await expect(p.getByRole('navigation')).toBeHidden();
  await p.getByRole('button', { name: 'ナビゲーション', exact: true }).click();
  await expect(p.getByRole('navigation')).toBeVisible();
  await p.getByRole('link', { name: 'ダッシュボード', exact: true }).click();
  await expect(p.locator('[data-kpi="total"]')).toBeVisible();
  await p.getByRole('link', { name: '申請一覧', exact: true }).click();
  await p.locator('[data-bind="keyword"]').fill('道路');
  await expect.poll(() => params(page).get('q')).toBe('道路');
  const scroll = p.getByRole('region', {
    name: '申請一覧の表（横スクロール可）',
  });
  expect(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await scroll.focus();
  await page.keyboard.press('End');
  await p.locator('[data-action="open-detail"]').first().click();
  await expect(p.getByRole('dialog')).toBeVisible();
  await p.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(p.locator('[data-action="open-detail"]').first()).toBeFocused();
});

test('Material 3: 外部通信をせず、主要な文字色のコントラストを保つ', async ({ page }) => {
  const external = [];
  page.on('request', (r) => {
    if (new URL(r.url()).origin !== 'http://localhost:4173') external.push(r.url());
  });
  const luminance = (hex) => {
    const parts = hex
      .slice(1)
      .match(/../g)
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return parts[0] * 0.2126 + parts[1] * 0.7152 + parts[2] * 0.0722;
  };
  for (const screen of ['list', 'form', 'dashboard']) {
    await page.goto(`?design=material3&screen=${screen}`);
    const color = await pane(page)
      .locator('.ds-material3')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        const read = (n) => s.getPropertyValue(`--m3-${n}`).trim();
        return [
          'primary',
          'on-primary',
          'surface',
          'on-surface',
          'on-surface-variant',
          'surface-high',
          'primary-container',
          'on-primary-container',
          'error',
        ].map(read);
      });
    // White is expanded to six digits to keep the ratio helper explicit.
    const [primary, , surface, text, muted, high, container, onContainer, error] = color;
    for (const [fg, bg] of [
      [primary, '#ffffff'],
      [text, surface],
      [muted, high],
      [onContainer, container],
      [error, high],
    ]) {
      const a = luminance(fg),
        b = luminance(bg);
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  }
  expect(external).toEqual([]);
});
