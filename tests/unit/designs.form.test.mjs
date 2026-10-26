// 登録済みの全デザインで、同じ項目・同じ入力・同じエラー・同じ操作が使えることを描画結果で確認する。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DESIGNS } from '../../site/assets/js/designs/index.js';
import { FIELD_NAMES, FORM_FIELDS, MESSAGES, back, createForm, fillSample, setValue, submit } from '../../site/assets/js/form.js';
import { buildAppModel } from '../../site/assets/js/model.js';
import { DEFAULT_SORT } from '../../site/assets/js/data.js';

const state = { screen: 'form', keyword: '', status: '', sort: DEFAULT_SORT, detail: null, notice: null };
const ctx = () => ({ uid: 'p0', ui: {}, href: () => '?', navHref: () => '?' });
const render = (design, form, extra = {}) => design.render(buildAppModel({ ...state, ...extra }, form), ctx()).toString();

/** 属性値を取り出す簡易ヘルパー（描画結果は html ヘルパーが整形した 1 要素ずつの文字列）。 */
const tags = (out, name) => [...out.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const attrOf = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const controls = (out) => [...tags(out, 'input'), ...tags(out, 'select'), ...tags(out, 'textarea')].filter((t) => attrOf(t, 'data-field'));
const ids = (out) => new Set([...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

const valid = fillSample('valid');
const invalid = fillSample('invalid');

for (const design of DESIGNS) {
  test(`${design.id}: エラー時のフォーカス方式を宣言している`, () => {
    assert.ok(['summary', 'field'].includes(design.errorFocus));
  });

  test(`${design.id}: 8 項目すべての部品がラベルと対応づけられている`, () => {
    const out = render(design, createForm());
    const found = controls(out);
    assert.deepEqual(found.map((t) => attrOf(t, 'data-field')).sort(), [...FIELD_NAMES].sort());

    const labelFor = new Set([...out.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
    const ownLabels = [...out.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)];
    for (const tag of found) {
      const id = attrOf(tag, 'id');
      assert.ok(id, `${attrOf(tag, 'data-field')}: id`);
      const wrapped = ownLabels.some((m) => m[0].includes(`id="${id}"`)); // label が部品を内包する形
      assert.ok(labelFor.has(id) || wrapped, `${attrOf(tag, 'data-field')}: label 対応`);
    }
    // id の重複がない（左右比較でも uid で区別される）
    const all = [...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(all.length, new Set(all).size, 'id が重複している');
  });

  test(`${design.id}: 必須は aria-required、種類ごとの部品とボタンがある`, () => {
    const out = render(design, createForm());
    const byField = Object.fromEntries(controls(out).map((t) => [attrOf(t, 'data-field'), t]));
    for (const f of FORM_FIELDS) {
      assert.equal(attrOf(byField[f.name], 'aria-required'), f.required ? 'true' : undefined, `${f.name}: aria-required`);
    }
    assert.match(byField.email, /type="email"/);
    assert.match(byField.phone, /type="tel"/);
    assert.match(byField.date, /type="date"/);
    assert.match(byField.agree, /type="checkbox"/);
    assert.ok(byField.type.startsWith('<select'));
    assert.ok(byField.body.startsWith('<textarea'));
    assert.match(out, /<form\b[^>]*data-form="entry"[^>]*novalidate/);
    assert.match(out, /<button[^>]*type="submit"/);
    assert.ok(out.includes('data-focus="heading"'));
    assert.match(out, /data-action="nav"[^>]*data-target="applications"/, 'キャンセル／戻る操作');
    // 補足（ヒント）が aria-describedby で参照されている
    const idSet = ids(out);
    for (const tag of Object.values(byField)) {
      for (const ref of (attrOf(tag, 'aria-describedby') ?? '').split(' ').filter(Boolean)) assert.ok(idSet.has(ref), `aria-describedby=${ref} が存在しない`);
    }
  });

  test(`${design.id}: 入力値が部品に反映される`, () => {
    const out = render(design, valid);
    assert.ok(out.includes('value="桜井 はるか"'));
    assert.ok(out.includes('value="さくらい はるか"'));
    assert.ok(out.includes('value="haruka.sakurai@example.com"'));
    assert.ok(out.includes('value="090-1234-5678"'));
    assert.ok(out.includes('value="2026-11-02"'));
    assert.match(out, /<option value="保育所等入所申込" selected>/);
    assert.match(out, /type="checkbox"[^>]*\schecked/);
    assert.ok(out.includes('第1希望：さくら野第一保育園'));
    assert.ok(!/aria-invalid/.test(out), '正常な入力にエラー表示がない');
  });

  test(`${design.id}: すべてのエラーを項目に結びつけて表示する`, () => {
    const out = render(design, invalid);
    for (const [name, code] of Object.entries(invalid.errors)) {
      assert.ok(out.includes(MESSAGES[name][code]), `${name}: メッセージ`);
    }
    const byField = Object.fromEntries(controls(out).map((t) => [attrOf(t, 'data-field'), t]));
    for (const name of Object.keys(invalid.errors)) {
      assert.equal(attrOf(byField[name], 'aria-invalid'), 'true', `${name}: aria-invalid`);
      const refs = (attrOf(byField[name], 'aria-describedby') ?? '').split(' ');
      assert.ok(refs.some((r) => r.endsWith('-error')), `${name}: エラーが aria-describedby に含まれる`);
    }
    assert.equal(attrOf(byField.phone, 'aria-invalid'), undefined, '任意の電話番号にエラー表示がない');
    // 最初のエラー項目（フォーカス先）が 1 つだけある。サマリーにフォーカスするデザインはサマリーがある
    assert.equal([...out.matchAll(/data-focus="first-error"/g)].length, 1);
    assert.equal(attrOf(byField.name, 'data-focus'), 'first-error');
    if (design.errorFocus === 'summary') assert.ok(out.includes('data-focus="error-summary"'));
    else assert.ok(!out.includes('data-focus="error-summary"'));
    if (design.id !== 'govuk') assert.ok(out.includes('7件'), 'エラー件数の表示'); // GOV.UK は件数ではなくリンクの一覧で示す
    else assert.equal([...out.matchAll(/data-action="focus-field"/g)].length, 7, 'サマリーの各項目へのリンク');
  });

  test(`${design.id}: 修正してエラーが消えると表示も消える`, () => {
    let form = invalid;
    for (const [name, value] of Object.entries(fillSample('valid').values)) form = setValue(form, name, value);
    const out = render(design, form);
    assert.ok(!/aria-invalid/.test(out));
    for (const text of Object.values(MESSAGES).flatMap((m) => Object.values(m))) assert.ok(!out.includes(text), text);
  });

  test(`${design.id}: 確認画面に全項目と戻る・申請する操作がある`, () => {
    const confirmForm = submit(valid);
    const out = render(design, confirmForm);
    assert.equal(controls(out).length, 0, '確認画面に入力欄はない');
    for (const text of ['桜井 はるか', 'さくらい はるか', 'haruka.sakurai@example.com', '090-1234-5678', '保育所等入所申込', '2026年11月2日', '同意する']) {
      assert.ok(out.includes(text), text);
    }
    assert.ok(out.includes('第2希望：さくら野第二保育園'), '改行を含む申請内容');
    assert.ok(out.includes('data-action="form-back"'));
    assert.ok(out.includes('data-action="form-confirm"'));
    assert.ok(out.includes('data-focus="heading"'));
    assert.ok(out.includes('確認'));
    // 電話番号が空のときは「入力なし」と表示する
    assert.ok(render(design, submit(setValue(valid, 'phone', ''))).includes('入力なし'));
  });

  test(`${design.id}: 完了画面から一覧へ戻る・続けて入力する操作がある`, () => {
    const out = render(design, { ...submit(valid), step: 'done' });
    assert.ok(out.includes('data-action="form-restart"'));
    assert.match(out, /data-action="nav"[^>]*data-target="applications"/);
    assert.ok(out.includes('data-focus="heading"'));
    assert.ok(out.includes('デモ'));
  });

  test(`${design.id}: 編集へ戻ると入力値が維持される`, () => {
    const out = render(design, back(submit(valid)));
    assert.ok(out.includes('value="桜井 はるか"') && out.includes('value="haruka.sakurai@example.com"'));
    assert.equal(controls(out).length, 8);
  });

  test(`${design.id}: 入力値はエスケープされる（スクリプト・属性の注入を防ぐ）`, () => {
    const form = setValue(setValue(createForm(), 'name', '"><script>alert(1)</script>'), 'body', '</textarea><script>alert(2)</script>');
    const out = render(design, form);
    assert.ok(!out.includes('<script>alert'));
    assert.ok(out.includes('&lt;script&gt;alert(1)'));
    assert.ok(out.includes('&lt;/textarea&gt;'));
  });

  test(`${design.id}: 一覧画面の通知はフォーム画面でも表示できる`, () => {
    const out = render(design, createForm(), { notice: { title: '通知タイトル', text: '通知本文' } });
    assert.ok(out.includes('通知タイトル') && out.includes('通知本文'));
    assert.ok(out.includes('data-action="dismiss-notice"'));
  });
}

test('全デザインでフォームの構造（見出し・必須表記・エラー表示）が互いに異なる', () => {
  const outputs = DESIGNS.map((d) => render(d, invalid));
  const signature = (out) => [
    /※必須/.test(out), // デジタル庁：ラベルの「※必須」
    /（任意）/.test(out) && !/（必須）/.test(out), // Carbon / GOV.UK：任意のみ明示
    /<abbr[^>]*必須/.test(out) || / \*</.test(out), // USWDS / Fluent：赤い＊
    /（必須）/.test(out), // Plain
    /role="alert"/.test(out),
    /data-focus="error-summary"/.test(out),
  ].join();
  assert.equal(new Set(outputs.map(signature)).size >= 4, true, '必須・エラーの示し方に違いがある');
  // フォームのマークアップが共通化されていない（class の接頭辞が全て異なる）
  const prefixes = outputs.map((o) => o.match(/class="(ds-\w+)"/)[1]);
  assert.equal(new Set(prefixes).size, DESIGNS.length);
});
