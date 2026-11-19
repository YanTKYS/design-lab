// 実験中の独立した試作（琉球モダンの申請一覧）。比較サイトとは別ページで、代表の操作だけを確かめる。
import { expect, test } from './fixtures.mjs';
import { APPLICATIONS, TOTAL, countOf } from './expected.mjs';
import { aggregate } from '../../site/assets/js/dashboard.js';

const URL = 'experiments/ryukyu-modern/';

test('琉球モダン試作（彩）1280px：横索引の件数で絞り込み、行の直後の詳細をキーボードで開閉する', async ({ page }) => {
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
  await expect(page.locator('.rm-count__num')).toHaveText(String(countOf({ keyword: '道路' })));
  await expect(keyword).toBeFocused();

  const index = page.getByRole('group', { name: '処理状態' });
  for (const [label, n] of [['すべて', 12], ['受付済', 0], ['審査中', 1], ['補正依頼', 1], ['承認済', 8], ['却下', 2]]) {
    await expect(index.locator('.rm-index__item', { hasText: label })).toContainText(`${n}件`);
  }
  await index.getByRole('radio', { name: /審査中/ }).check();
  await expect(page.locator('.rm-count__num')).toHaveText('1');
  await expect(page.locator('.rm-index__item.is-selected')).toContainText('審査中'); // 選択は塗りだけでなくチェックと太字でも示す
  await expect(page.locator('.rm-index__item.is-selected svg')).toHaveCount(1);

  const toggle = page.getByRole('button', { name: /^詳細\s*（2026-01041）$/ });
  await toggle.focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('region', { name: /^申請詳細\s*（2026-01041）$/ });
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

test('琉球モダン試作（彩）375px：件数付きセレクトと縦の台帳で、型が情報に重ならず読める', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL);
  await expect(page.locator('#rm-app')).toHaveAttribute('data-layout', 'narrow');
  await expect(page.locator('.rm-card')).toHaveCount(TOTAL);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  // 見出しの型は右側の限定領域に収まり、見出しの文字と重ならない
  const [title, pattern] = await Promise.all([page.locator('.rm-hero__title').boundingBox(), page.locator('.rm-hero__pattern').boundingBox()]);
  expect(title.x + title.width).toBeLessThanOrEqual(pattern.x);

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
  await page.getByRole('button', { name: '条件をクリア' }).click();
  await expect(page.locator('#rm-kw')).toBeFocused();
  await expect(page.locator('.rm-card')).toHaveCount(TOTAL);
});

test('琉球モダン試作（彩）新規申請：画面を行き来しても入力を保ち、エラー→修正→確認→該当欄の修正→完了まで進む', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  const nav = page.getByRole('navigation', { name: '画面の切替' });
  await nav.getByRole('button', { name: '新規申請' }).click();
  await expect(nav.getByRole('button', { name: '新規申請' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('新規申請');

  await page.getByRole('button', { name: '入力例を入れる' }).click();
  await page.locator('[data-field="phone"]').fill(''); // 任意の電話番号を空にして進める
  await page.locator('[data-field="kana"]').fill('サクライ ハルカ');
  await page.locator('[data-field="email"]').fill('haruka.sakurai#example.com');
  // 一覧へ移って戻っても、入力中の値はページを開いている間だけ保つ（URL には載せない）
  await nav.getByRole('button', { name: '申請一覧' }).click();
  await nav.getByRole('button', { name: '新規申請' }).click();
  await expect(page.locator('[data-field="kana"]')).toHaveValue('サクライ ハルカ');
  expect(page.url()).not.toContain('kana');

  await page.getByRole('button', { name: '確認へ' }).click();
  const summary = page.locator('[data-focus="error-summary"]');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('入力エラーが2件あります');
  await expect(page.locator('[aria-invalid="true"][data-field]')).toHaveCount(2);
  await summary.getByRole('button', { name: 'メールアドレス' }).click();
  await expect(page.locator('[data-field="email"]')).toBeFocused();
  await page.locator('[data-field="email"]').fill('haruka.sakurai@example.com');
  await page.locator('[data-field="kana"]').fill('さくらい はるか');
  await expect(summary).toHaveCount(0);

  await page.getByRole('button', { name: '確認へ' }).click();
  await expect(page.getByRole('heading', { name: '入力内容の確認' })).toBeFocused();
  const confirm = page.locator('.rm-confirm');
  await expect(confirm.locator('tr', { hasText: '電話番号' })).toContainText('入力なし');
  await expect(confirm.locator('tr', { hasText: '確認事項への同意' })).toContainText('同意する');
  await confirm.getByRole('button', { name: /^修正\s*（ふりがな）$/ }).click();
  await expect(page.locator('[data-field="kana"]')).toBeFocused();
  await expect(page.locator('[data-field="kana"]')).toHaveValue('さくらい はるか');
  await page.getByRole('button', { name: '確認へ' }).click();
  await page.getByRole('button', { name: '申請する' }).click();
  await expect(page.getByRole('heading', { name: '申請が完了しました' })).toBeFocused();
  await expect(page.locator('.rm-steps [aria-current="step"]')).toContainText('完了');
});

test('琉球モダン試作（彩）ダッシュボード：既定の集計、条件の連動とリセット、指標・状態・種別から同じ条件の一覧へ', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await page.locator('#rm-kw').fill('保育'); // 一覧の検索語は、集計から移るときに空にする
  await page.getByRole('navigation', { name: '画面の切替' }).getByRole('button', { name: 'ダッシュボード' }).click();
  for (const [key, value] of [['total', '71'], ['pending', '19'], ['done', '52'], ['rate', '73.2%']]) {
    await expect(page.locator(`[data-kpi="${key}"]`)).toHaveText(value);
  }
  await expect(page.locator('[data-status="reviewing"]')).toHaveText('8');
  await expect(page.locator('[data-status-share="reviewing"]')).toHaveText('11.3%');

  await page.getByLabel('対象期間').selectOption('q2');
  const q2 = aggregate(APPLICATIONS, { period: 'q2', dept: '' });
  await expect(page.locator('[data-kpi="total"]')).toHaveText(String(q2.total));
  await page.getByRole('button', { name: /^リセット/ }).click();
  await expect(page.locator('[data-kpi="total"]')).toHaveText('71');
  await expect(page.getByLabel('対象期間')).toHaveValue('fy');

  // 処理待ち件数の「一覧を見る」→ 同じ件数の一覧。引き継いだ条件を表示し、検索語は空
  await page.locator('.rm-kpi--pending').getByRole('link', { name: /一覧を見る/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('申請一覧');
  await expect(page.locator('.rm-count__num')).toHaveText('19');
  await expect(page.locator('[data-scope]')).toContainText('処理待ち');
  await expect(page.locator('#rm-kw')).toHaveValue('');

  // 種別名から一覧へ → 件数が集計と一致し、引き継ぎを解除すると全件に戻る
  await page.getByRole('navigation', { name: '画面の切替' }).getByRole('button', { name: 'ダッシュボード' }).click();
  await page.locator('.rm-types').getByRole('link', { name: /^道路占用許可申請/ }).click();
  await expect(page.locator('.rm-count__num')).toHaveText('12');
  await page.getByRole('button', { name: '引き継ぎを解除' }).click();
  await expect(page.locator('[data-scope]')).toHaveCount(0);
  await expect(page.locator('.rm-count__num')).toHaveText(String(TOTAL));

  // 375px：指標は2列、ページ全体は横にはみ出さない
  await page.getByRole('navigation', { name: '画面の切替' }).getByRole('button', { name: 'ダッシュボード' }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('#rm-app')).toHaveAttribute('data-layout', 'narrow');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
