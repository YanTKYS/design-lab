import { countOf } from './expected.mjs';
import { expect, test } from './fixtures.mjs';

const DESIGNS = ['dads', 'carbon', 'fluent', 'govuk', 'uswds', 'plain'];

const pane = (page, index = 0) => page.locator('section.pane').nth(index);
const root = (page, index = 0) => pane(page, index).locator('.pane__root');
const field = (page, name, index = 0) => pane(page, index).locator(`[data-field="${name}"]`);
const invalid = (page, index = 0) => pane(page, index).locator('[data-field][aria-invalid="true"]');
const query = (page) => new URL(page.url()).searchParams;
const submitButton = (page, index = 0) => pane(page, index).locator('[data-form="entry"] [type="submit"]');

const INPUT = {
  name: '山田 太郎',
  kana: 'やまだ たろう',
  email: 'taro.yamada@example.com',
  phone: '03-1234-5678',
  type: '犬の登録申請',
  date: '2026-12-01',
  body: '一行目の内容\n二行目の内容',
};

const MESSAGES = {
  name: '申請者氏名を入力してください',
  kana: 'ふりがなを入力してください',
  kanaFormat: 'ふりがなは、ひらがなで入力してください',
  email: 'メールアドレスを入力してください',
  emailFormat: 'メールアドレスは、半角で「sakura@example.com」の形式で入力してください',
  phoneFormat: '電話番号は、数字とハイフンで10桁または11桁を入力してください',
  type: '申請種別を選択してください',
  date: '希望日を入力してください',
  body: '申請内容を入力してください',
  agree: '確認事項に同意してください',
};

async function fillAll(page, index = 0, values = INPUT) {
  await field(page, 'name', index).fill(values.name);
  await field(page, 'kana', index).fill(values.kana);
  await field(page, 'email', index).fill(values.email);
  await field(page, 'phone', index).fill(values.phone);
  await field(page, 'type', index).selectOption(values.type);
  await field(page, 'date', index).fill(values.date);
  await field(page, 'body', index).fill(values.body);
  await field(page, 'agree', index).check();
}

async function expectValues(page, index = 0, values = INPUT, agree = true) {
  for (const [name, value] of Object.entries(values)) await expect(field(page, name, index)).toHaveValue(value);
  if (agree) await expect(field(page, 'agree', index)).toBeChecked();
  else await expect(field(page, 'agree', index)).not.toBeChecked();
}

async function expectEmpty(page, index = 0) {
  await expectValues(page, index, { name: '', kana: '', email: '', phone: '', type: '', date: '', body: '' }, false);
}

test.describe('各デザインの入力フォーム', () => {
  for (const id of DESIGNS) {
    test(`${id}: 全項目をラベルから入力でき、確認→修正→完了まで進める`, async ({ page }) => {
      await page.goto(`?design=${id}&screen=form`);
      const p = pane(page);
      await expect(p).toHaveAttribute('data-design', id);
      await expect(page.locator('#lab-screen')).toHaveValue('form');
      await expect(p.locator('[data-focus="heading"]')).toContainText('新規申請');

      // ラベルと入力欄の対応（ラベル経由で操作できる）
      await p.getByLabel('申請者氏名').fill(INPUT.name);
      await p.getByLabel('ふりがな').fill(INPUT.kana);
      await p.getByLabel('メールアドレス').fill(INPUT.email);
      await p.getByLabel('電話番号').fill(INPUT.phone);
      await p.getByLabel('申請種別').selectOption(INPUT.type);
      await p.getByLabel('希望日').fill(INPUT.date);
      await p.getByLabel('申請内容', { exact: false }).fill(INPUT.body);
      await p.getByRole('checkbox').check();
      await expectValues(page);

      // 確認画面
      await submitButton(page).click();
      await expect(p.locator('[data-form="entry"]')).toHaveCount(0);
      await expect(p.locator('[data-focus="heading"]')).toBeFocused();
      await expect(p.locator('[data-focus="heading"]')).toContainText('確認');
      for (const text of ['山田 太郎', 'やまだ たろう', 'taro.yamada@example.com', '03-1234-5678', '犬の登録申請', '2026年12月1日', '一行目の内容', '二行目の内容', '同意する']) {
        await expect(root(page)).toContainText(text);
      }

      // 編集へ戻っても入力値が維持される
      await p.locator('[data-action="form-back"]').first().click();
      await expect(p.locator('[data-form="entry"]')).toBeVisible();
      await expectValues(page);

      // 修正して再度確認、完了
      await field(page, 'name').fill('山田 次郎');
      await submitButton(page).click();
      await expect(root(page)).toContainText('山田 次郎');
      await p.locator('[data-action="form-confirm"]').click();
      await expect(p.locator('[data-focus="heading"]')).toBeFocused();
      await expect(root(page)).toContainText('デモ');
      expect(query(page).get('screen')).toBe('form');

      // 続けて入力すると空のフォームになる
      await p.locator('[data-action="form-restart"]').click();
      await expectEmpty(page);
    });

    test(`${id}: 空のまま送信すると必須エラーを表示し、デザインごとの方法でフォーカスを移す`, async ({ page }) => {
      await page.goto(`?design=${id}&screen=form`);
      const p = pane(page);
      await expect(invalid(page)).toHaveCount(0);
      await submitButton(page).click();

      await expect(invalid(page)).toHaveCount(7); // 電話番号は任意なのでエラーにならない
      await expect(field(page, 'phone')).not.toHaveAttribute('aria-invalid', 'true');
      for (const key of ['name', 'kana', 'email', 'type', 'date', 'body', 'agree']) {
        await expect(root(page)).toContainText(MESSAGES[key]);
      }
      // エラーは aria-describedby で入力欄と結びつく
      for (const name of ['name', 'email', 'agree']) {
        const describedBy = await field(page, name).getAttribute('aria-describedby');
        const errorId = describedBy.split(' ').find((v) => v.endsWith('-error'));
        await expect(p.locator(`[id="${errorId}"]`)).toBeVisible();
      }
      // フォーカス：GOV.UK はエラーサマリー、ほかは最初のエラー項目
      if (id === 'govuk') await expect(p.locator('[data-focus="error-summary"]')).toBeFocused();
      else await expect(field(page, 'name')).toBeFocused();
      await expect(page.locator('#lab-live')).toContainText('7件');
      // 確認画面へは進まない
      await expect(p.locator('[data-form="entry"]')).toBeVisible();
    });

    test(`${id}: 形式エラー（ふりがな・メール・電話）と未同意を検出し、修正すると消える`, async ({ page }) => {
      await page.goto(`?design=${id}&screen=form`);
      const p = pane(page);
      await fillAll(page, 0, { ...INPUT, kana: 'ヤマダ タロウ', email: 'taro#example.com', phone: '03-12' });
      await field(page, 'agree').uncheck();
      await submitButton(page).click();

      await expect(invalid(page)).toHaveCount(4);
      for (const key of ['kanaFormat', 'emailFormat', 'phoneFormat', 'agree']) await expect(root(page)).toContainText(MESSAGES[key]);
      for (const name of ['name', 'type', 'date', 'body']) await expect(field(page, name)).not.toHaveAttribute('aria-invalid', 'true');

      // 修正すると、その項目のエラーだけが消える
      await field(page, 'kana').fill('やまだ たろう');
      await expect(invalid(page)).toHaveCount(3);
      await expect(root(page)).not.toContainText(MESSAGES.kanaFormat);
      await field(page, 'email').fill('taro@example.com');
      await field(page, 'phone').fill('');
      await field(page, 'agree').check();
      await expect(invalid(page)).toHaveCount(0);

      await submitButton(page).click();
      await expect(p.locator('[data-action="form-confirm"]')).toBeVisible();
    });

    test(`${id}: Enter キーで送信でき、エラー後に修正して確認へ進める`, async ({ page }) => {
      await page.goto(`?design=${id}&screen=form`);
      const p = pane(page);
      await field(page, 'name').focus();
      await page.keyboard.press('Enter');
      await expect(invalid(page)).toHaveCount(7);

      await fillAll(page);
      await field(page, 'email').press('Enter');
      await expect(p.locator('[data-action="form-confirm"]')).toBeVisible();
      await expect(p.locator('[data-focus="heading"]')).toBeFocused();
    });

    test(`${id}: 共有バーの入力例・エラーを再現・クリア`, async ({ page }) => {
      await page.goto(`?design=${id}&screen=form`);
      await page.getByRole('button', { name: '入力例' }).click();
      await expect(field(page, 'name')).toHaveValue('桜井 はるか');
      await expect(field(page, 'agree')).toBeChecked();
      await expect(invalid(page)).toHaveCount(0);
      await expect(field(page, 'body')).toHaveValue(/第2希望：さくら野第二保育園/);

      await page.getByRole('button', { name: 'エラーを再現' }).click();
      await expect(invalid(page)).toHaveCount(7);
      await expect(root(page)).toContainText(MESSAGES.kanaFormat);
      await expect(root(page)).toContainText(MESSAGES.emailFormat);
      await expect(page.locator('#lab-live')).toContainText('入力エラーを再現しました');

      await page.getByRole('button', { name: 'クリア' }).click();
      await expectEmpty(page);
      await expect(invalid(page)).toHaveCount(0);

      // 入力例からそのまま確認へ進める
      await page.getByRole('button', { name: '入力例' }).click();
      await submitButton(page).click();
      await expect(root(page)).toContainText('haruka.sakurai@example.com');
    });

    test(`${id}: キャンセルで一覧へ戻っても入力内容は保持される`, async ({ page }) => {
      await page.goto(`?design=${id}&screen=form`);
      const p = pane(page);
      await fillAll(page);
      await p.locator('[data-action="nav"][data-target="applications"]').first().click();
      await expect(p.locator('[data-bind="keyword"]')).toBeVisible();
      expect(query(page).get('screen')).toBeNull();
      await page.locator('#lab-screen').selectOption('form');
      await expectValues(page);
    });
  }
});

test.describe('画面の切り替えと URL', () => {
  test('画面セレクターで切り替えても、デザイン・表示モード・幅・一覧の条件を維持する', async ({ page }) => {
    await page.goto('?mode=compare&left=carbon&right=govuk&width=1280&q=%E9%81%93%E8%B7%AF&status=approved&sort=id&order=asc');
    await expect(pane(page, 0).locator('[data-bind="keyword"]')).toHaveValue('道路');
    await expect(page.locator('#lab-formbar')).toBeHidden();

    await page.locator('#lab-screen').selectOption('form');
    await expect(pane(page, 0).locator('[data-form="entry"]')).toBeVisible();
    await expect(pane(page, 1).locator('[data-form="entry"]')).toBeVisible();
    await expect(pane(page, 0)).toHaveAttribute('data-design', 'carbon');
    await expect(pane(page, 1)).toHaveAttribute('data-design', 'govuk');
    await expect(page.getByRole('radio', { name: '左右比較' })).toBeChecked();
    await expect(page.locator('#lab-width')).toHaveValue('1280');
    await expect(page.locator('#lab-formbar')).toBeVisible();
    const q = query(page);
    expect([q.get('screen'), q.get('mode'), q.get('left'), q.get('right'), q.get('width'), q.get('q'), q.get('status'), q.get('sort')]).toEqual([
      'form', 'compare', 'carbon', 'govuk', '1280', '道路', 'approved', 'id',
    ]);

    // デザインを変えても画面は維持される
    await page.locator('#lab-left').selectOption('dads');
    await expect(pane(page, 0)).toHaveAttribute('data-design', 'dads');
    await expect(pane(page, 0).locator('[data-form="entry"]')).toBeVisible();

    // 一覧へ戻ると、検索条件がそのまま残っている
    await page.locator('#lab-screen').selectOption('list');
    await expect(pane(page, 0).locator('[data-bind="keyword"]')).toHaveValue('道路');
    await expect(pane(page, 1).locator('[data-bind="keyword"]')).toHaveValue('道路');
    await expect(pane(page, 0).locator('.pane__root [data-id]')).toHaveCount(countOf({ keyword: '道路', status: 'approved' }));
    expect(query(page).get('screen')).toBeNull();
    await expect(page.locator('#lab-formbar')).toBeHidden();
  });

  test('URL から画面と比較状態を復元し、再読み込みしてもフォームの入力は持ち越さない', async ({ page }) => {
    await page.goto('?screen=form&mode=compare&left=uswds&right=plain&width=1024');
    await expect(page.locator('#lab-screen')).toHaveValue('form');
    await expect(pane(page, 0)).toHaveAttribute('data-design', 'uswds');
    await expect(pane(page, 1)).toHaveAttribute('data-design', 'plain');
    await expect(pane(page, 0).locator('[data-form="entry"]')).toBeVisible();
    await expect(pane(page, 1).locator('[data-form="entry"]')).toBeVisible();
    expect(await pane(page, 0).locator('.pane__frame').evaluate((el) => el.getBoundingClientRect().width)).toBe(1024);

    await fillAll(page);
    await page.reload();
    await expect(page.locator('#lab-screen')).toHaveValue('form');
    await expectEmpty(page, 0);
    await expectEmpty(page, 1);
  });

  test('screen のない既存の URL は従来どおり一覧を表示する', async ({ page }) => {
    await page.goto('?design=fluent&q=%E4%BF%9D%E8%82%B2&status=reviewing&sort=applicant&order=asc&detail=2026-01016');
    await expect(page.locator('#lab-screen')).toHaveValue('list');
    await expect(pane(page).locator('[data-bind="keyword"]')).toHaveValue('保育');
    await expect(pane(page).locator('[data-modal]')).toBeVisible();
  });

  test('ブラウザの戻る・進む操作で画面が切り替わり、入力内容は残る', async ({ page }) => {
    await page.goto('?design=govuk');
    await pane(page).locator('[data-action="new"]').click();
    await field(page, 'name').fill('戻る確認');
    await page.goBack();
    await expect(pane(page).locator('[data-bind="keyword"]')).toBeVisible();
    await expect(page.locator('#lab-screen')).toHaveValue('list');
    await page.goForward();
    await expect(field(page, 'name')).toHaveValue('戻る確認');
    await expect(page.locator('#lab-screen')).toHaveValue('form');
  });
});

test.describe('エラー・確認画面からの移動', () => {
  test('GOV.UK：エラーサマリーのリンクで該当の入力欄へ移動できる', async ({ page }) => {
    await page.goto('?design=govuk&screen=form');
    await submitButton(page).click();
    const p = pane(page);
    await expect(p.locator('[data-focus="error-summary"]')).toBeFocused();
    await p.locator('[data-action="focus-field"][data-goto-field="email"]').click();
    await expect(field(page, 'email')).toBeFocused();
    await p.locator('[data-action="focus-field"][data-goto-field="agree"]').press('Enter');
    await expect(field(page, 'agree')).toBeFocused();
  });

  test('GOV.UK：確認画面の「変更」リンクで該当項目の編集へ戻り、入力値を維持する', async ({ page }) => {
    await page.goto('?design=govuk&screen=form');
    await page.getByRole('button', { name: '入力例' }).click();
    await submitButton(page).click();
    const p = pane(page);
    await p.locator('[data-action="form-back"][data-goto-field="email"]').click();
    await expect(field(page, 'email')).toBeFocused();
    await expect(field(page, 'email')).toHaveValue('haruka.sakurai@example.com');
    await expect(field(page, 'name')).toHaveValue('桜井 はるか');
  });

  test('Fluent：MessageBar の「最初の項目へ」で最初のエラー項目へ移動できる', async ({ page }) => {
    await page.goto('?design=fluent&screen=form');
    await field(page, 'name').fill('山田 太郎');
    await submitButton(page).click();
    await expect(field(page, 'kana')).toBeFocused();
    await field(page, 'type').focus();
    await pane(page).getByRole('button', { name: '最初の項目へ' }).click();
    await expect(field(page, 'kana')).toBeFocused();
  });

  test('フォーム画面では「設計上の特徴」がフォーム用の観点に切り替わる', async ({ page }) => {
    await page.goto('?design=carbon');
    await pane(page).locator('summary').click();
    await expect(pane(page).locator('.pane__trait-list')).toContainText('情報密度と余白');
    await page.locator('#lab-screen').selectOption('form');
    const list = pane(page).locator('.pane__trait-list');
    await expect(list).toBeVisible();
    for (const label of ['レイアウトと余白', 'ラベル・補足・必須表記', '入力エラー', '確認・操作']) await expect(list).toContainText(label);
    await expect(list).not.toContainText('情報密度と余白');
  });
});

test.describe('左右比較とデザイン切り替え', () => {
  test('どちらで編集しても左右の入力値が同期する', async ({ page }) => {
    await page.goto('?screen=form&mode=compare&left=dads&right=carbon');
    await field(page, 'name', 0).fill('左で入力');
    await expect(field(page, 'name', 1)).toHaveValue('左で入力');
    await field(page, 'kana', 1).fill('みぎでにゅうりょく');
    await expect(field(page, 'kana', 0)).toHaveValue('みぎでにゅうりょく');

    await field(page, 'type', 1).selectOption('道路占用許可申請');
    await expect(field(page, 'type', 0)).toHaveValue('道路占用許可申請');
    await field(page, 'date', 0).fill('2026-11-20');
    await expect(field(page, 'date', 1)).toHaveValue('2026-11-20');
    await field(page, 'body', 0).fill('一行目\n二行目');
    await expect(field(page, 'body', 1)).toHaveValue('一行目\n二行目');
    await field(page, 'agree', 1).check();
    await expect(field(page, 'agree', 0)).toBeChecked();
    await field(page, 'agree', 1).uncheck();
    await expect(field(page, 'agree', 0)).not.toBeChecked();
  });

  test('入力エラーの状態と修正が左右で同期し、確認・編集への遷移も共通', async ({ page }) => {
    await page.goto('?screen=form&mode=compare&left=govuk&right=fluent');
    await submitButton(page, 0).click();
    await expect(invalid(page, 0)).toHaveCount(7);
    await expect(invalid(page, 1)).toHaveCount(7);
    await expect(pane(page, 0).locator('[data-focus="error-summary"]')).toBeFocused();
    await expect(root(page, 1)).toContainText(MESSAGES.name);

    // 右で修正すると左のエラーも消える
    await field(page, 'name', 1).fill('山田 太郎');
    await expect(invalid(page, 0)).toHaveCount(6);
    await expect(invalid(page, 1)).toHaveCount(6);
    await expect(root(page, 0)).not.toContainText(MESSAGES.name);
    for (const [name, value] of Object.entries({ kana: INPUT.kana, email: INPUT.email, phone: INPUT.phone, type: INPUT.type, date: INPUT.date, body: INPUT.body })) {
      if (name === 'type') await field(page, name, 0).selectOption(value);
      else await field(page, name, 0).fill(value);
    }
    await field(page, 'agree', 1).check();
    await expect(invalid(page, 0)).toHaveCount(0);
    await expect(invalid(page, 1)).toHaveCount(0);

    // 右で送信すると左右とも確認画面になり、左で戻ると左右とも編集に戻る
    await submitButton(page, 1).click();
    await expect(pane(page, 0).locator('[data-action="form-confirm"]')).toBeVisible();
    await expect(pane(page, 1).locator('[data-action="form-confirm"]')).toBeVisible();
    await expect(pane(page, 1).locator('[data-focus="heading"]')).toBeFocused();
    await pane(page, 0).locator('[data-action="form-back"]').first().click();
    await expectValues(page, 0);
    await expectValues(page, 1);
  });

  test('共有バーの操作は左右の両方に反映され、左右の入れ替えでも値を維持する', async ({ page }) => {
    await page.goto('?screen=form&mode=compare&left=plain&right=uswds');
    await page.getByRole('button', { name: 'エラーを再現' }).click();
    await expect(invalid(page, 0)).toHaveCount(7);
    await expect(invalid(page, 1)).toHaveCount(7);
    await page.getByRole('button', { name: '入れ替え' }).click();
    await expect(pane(page, 0)).toHaveAttribute('data-design', 'uswds');
    await expect(invalid(page, 0)).toHaveCount(7);
    await expect(invalid(page, 1)).toHaveCount(7);
    await expect(field(page, 'kana', 0)).toHaveValue('サクライ ハルカ');
    await expect(field(page, 'email', 1)).toHaveValue('haruka.sakurai#example.com');

    await page.getByRole('button', { name: '入力例' }).click();
    await expect(field(page, 'name', 0)).toHaveValue('桜井 はるか');
    await expect(field(page, 'name', 1)).toHaveValue('桜井 はるか');
    await expect(invalid(page, 0)).toHaveCount(0);
  });

  test('単独表示でデザインを切り替えても、入力値・エラー・確認ステップを維持する', async ({ page }) => {
    await page.goto('?design=dads&screen=form');
    const pick = (id) => page.locator(`.lab-wide-only input[name="design"][value="${id}"]`).check();
    await fillAll(page, 0, { ...INPUT, kana: 'ヤマダ タロウ' });
    await submitButton(page).click();
    await expect(invalid(page)).toHaveCount(1);

    for (const id of DESIGNS) {
      await pick(id);
      await expect(pane(page)).toHaveAttribute('data-design', id);
      await expect(invalid(page)).toHaveCount(1);
      await expect(field(page, 'kana')).toHaveValue('ヤマダ タロウ');
      await expect(field(page, 'body')).toHaveValue(INPUT.body);
      await expect(field(page, 'agree')).toBeChecked();
      expect(query(page).get('design')).toBe(id);
    }

    await field(page, 'kana').fill('やまだ たろう');
    await submitButton(page).click();
    for (const id of DESIGNS) {
      await pick(id);
      await expect(pane(page)).toHaveAttribute('data-design', id);
      await expect(root(page)).toContainText('やまだ たろう');
      await expect(pane(page).locator('[data-action="form-confirm"]')).toBeVisible();
    }
  });

  test('左右のデザインを個別に切り替えても入力値が維持される', async ({ page }) => {
    await page.goto('?screen=form&mode=compare&left=dads&right=carbon');
    await fillAll(page, 1);
    for (const [side, id] of [['left', 'fluent'], ['right', 'govuk'], ['left', 'plain'], ['right', 'uswds']]) {
      await page.locator(`#lab-${side}`).selectOption(id);
      await expect(pane(page, side === 'left' ? 0 : 1)).toHaveAttribute('data-design', id);
      await expectValues(page, 0);
      await expectValues(page, 1);
    }
  });
});

test.describe('入力を妨げない（IME・フォーカス・キャレット）', () => {
  test('IME の変換中は状態を更新せず、確定すると反映する（フォーカスと変換中の文字を壊さない）', async ({ page }) => {
    await page.goto('?screen=form&mode=compare&left=dads&right=plain');
    const client = await page.context().newCDPSession(page);
    const name = field(page, 'name', 0);
    await name.focus();

    await client.send('Input.imeSetComposition', { text: 'や', selectionStart: 1, selectionEnd: 1 });
    await client.send('Input.imeSetComposition', { text: 'やま', selectionStart: 2, selectionEnd: 2 });
    await expect(name).toBeFocused();
    await expect(name).toHaveValue('やま');
    await expect(field(page, 'name', 1)).toHaveValue('', '変換中は他方へ反映しない');

    // 変換中に再描画が走っても、変換中の入力欄は書き換えない（popstate による全体の再描画で代用）
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await expect(name).toBeFocused();
    await expect(name).toHaveValue('やま');

    await client.send('Input.imeSetComposition', { text: '山', selectionStart: 1, selectionEnd: 1 });
    await client.send('Input.insertText', { text: '山田' });
    await expect(name).toHaveValue('山田');
    await expect(field(page, 'name', 1)).toHaveValue('山田');
    await expect(name).toBeFocused();

    // 続けて入力してもキャレットが先頭へ戻らない
    await page.keyboard.type('太郎');
    await expect(name).toHaveValue('山田太郎');
    await expect(field(page, 'name', 1)).toHaveValue('山田太郎');
  });

  test('変換確定の Enter（keyCode 229 / 変換中）ではフォームを送信しない', async ({ page }) => {
    await page.goto('?screen=form&design=dads');
    await page.getByRole('button', { name: '入力例' }).click();
    const prevented = await field(page, 'name').evaluate((el) =>
      [{ isComposing: true, keyCode: 0 }, { isComposing: false, keyCode: 229 }, { isComposing: false, keyCode: 13 }].map((init) => {
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    );
    expect(prevented, '変換中・変換確定の Enter は既定動作（送信）を止め、通常の Enter は止めない').toEqual([true, true, false]);
    await expect(pane(page).locator('[data-form="entry"]')).toBeVisible();
  });

  test('textarea の途中に入力してもキャレットが移動せず、左右が同期する', async ({ page }) => {
    await page.goto('?screen=form&mode=compare&left=carbon&right=fluent');
    const body = field(page, 'body', 0);
    await body.fill('先頭末尾');
    await body.focus();
    await body.evaluate((el) => el.setSelectionRange(2, 2));
    await page.keyboard.type('XY');
    await expect(body).toHaveValue('先頭XY末尾');
    expect(await body.evaluate((el) => el.selectionStart)).toBe(4);
    await expect(field(page, 'body', 1)).toHaveValue('先頭XY末尾');
  });

  test('1 文字ずつ入力しても、入力中の欄のフォーカスが外れない（エラー表示中を含む）', async ({ page }) => {
    for (const id of DESIGNS) {
      await page.goto(`?design=${id}&screen=form`);
      await submitButton(page).click();
      const email = field(page, 'email');
      await email.focus();
      await page.keyboard.type('taro@example.com', { delay: 5 });
      await expect(email).toBeFocused();
      await expect(email).toHaveValue('taro@example.com');
      await expect(email).not.toHaveAttribute('aria-invalid', 'true');
    }
  });
});

test.describe('入力内容を URL・履歴・ストレージに残さない', () => {
  for (const id of DESIGNS) {
    test(`${id}: 入力・エラー・確認・完了を通じて URL に入力内容が含まれない`, async ({ page }) => {
      await page.goto(`?design=${id}&screen=form`);
      const before = await page.evaluate(() => history.length);
      const secrets = [INPUT.name, INPUT.kana, INPUT.email, INPUT.phone, '二行目の内容', 'taro', 'yamada', encodeURIComponent(INPUT.name)];
      const check = async () => {
        const url = decodeURIComponent(page.url());
        for (const secret of secrets) expect(url, `URL に ${secret} が含まれる`).not.toContain(secret);
        expect(await page.evaluate(() => history.length), '入力で履歴が増えない').toBe(before);
        expect(await page.evaluate(() => history.state)).toBeNull();
        expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie])).toEqual([0, 0, '']);
      };

      await fillAll(page);
      await check();
      await submitButton(page).click();
      await expect(pane(page).locator('[data-action="form-confirm"]')).toBeVisible();
      await check();
      await pane(page).locator('[data-action="form-back"]').first().click();
      await field(page, 'email').fill('bad');
      await submitButton(page).click();
      await expect(invalid(page)).toHaveCount(1);
      await check();
      await field(page, 'email').fill(INPUT.email);
      await submitButton(page).click();
      await pane(page).locator('[data-action="form-confirm"]').click();
      await check();
      expect(query(page).get('screen')).toBe('form');
      expect([...query(page).keys()].sort()).toEqual(['design', 'screen']);

      // 共有用ボタンでコピーされる URL にも含まれない
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('#lab-copy').click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      for (const secret of secrets) expect(decodeURIComponent(copied)).not.toContain(secret);
    });
  }
});

test.describe('主要な画面幅でフォームが破綻しない', () => {
  for (const width of [375, 768, 1280, 1920]) {
    test(`幅 ${width}px：入力・エラー・確認の各状態で横にはみ出さず、送信できる`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const overflow = () =>
        page.evaluate(() => {
          const doc = document.documentElement;
          const panes = [...document.querySelectorAll('section.pane:not([hidden]) .pane__scroll')];
          return { page: doc.scrollWidth - doc.clientWidth, panes: panes.map((el) => el.scrollWidth - el.clientWidth) };
        });
      const expectFits = async (label) => {
        const o = await overflow();
        expect(o.page, `${label}: ページ全体`).toBeLessThanOrEqual(0);
        for (const v of o.panes) expect(v, `${label}: サンプル画面`).toBeLessThanOrEqual(1);
      };

      for (const mode of ['single', 'compare']) {
        for (const id of DESIGNS) {
          const right = DESIGNS[(DESIGNS.indexOf(id) + 1) % 6];
          await page.goto(mode === 'single' ? `?screen=form&design=${id}` : `?screen=form&mode=compare&left=${id}&right=${right}`);
          const label = `${mode}/${id}`;
          await expect(field(page, 'name')).toBeVisible();
          await expectFits(`${label} 入力`);

          await page.getByRole('button', { name: 'エラーを再現' }).click();
          await expect(invalid(page)).toHaveCount(7);
          await expectFits(`${label} エラー`);

          await page.getByRole('button', { name: '入力例' }).click();
          await submitButton(page).scrollIntoViewIfNeeded();
          await submitButton(page).click(); // 実際の操作でも押せる（ほかの要素に隠れていない）
          await expect(pane(page).locator('[data-action="form-confirm"]')).toBeVisible();
          await expectFits(`${label} 確認`);

          await pane(page).locator('[data-action="form-confirm"]').click();
          await expect(pane(page).locator('[data-action="form-restart"]')).toBeVisible();
          await expectFits(`${label} 完了`);
        }
      }
    });
  }
});
