import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FORM_SAMPLES } from '../../site/assets/js/data.js';
import {
  EMPTY_VALUES,
  FIELD_NAMES,
  FORM_FIELDS,
  MESSAGES,
  back,
  buildFormModel,
  complete,
  createForm,
  fillSample,
  hasErrors,
  setValue,
  submit,
  validate,
} from '../../site/assets/js/form.js';

const valid = FORM_SAMPLES.valid;

test('項目は仕様どおり（必須・任意・種類）で定義されている', () => {
  assert.deepEqual(FIELD_NAMES, ['name', 'kana', 'email', 'phone', 'type', 'date', 'body', 'agree']);
  const required = Object.fromEntries(FORM_FIELDS.map((f) => [f.name, f.required]));
  assert.deepEqual(required, { name: true, kana: true, email: true, phone: false, type: true, date: true, body: true, agree: true });
  const control = Object.fromEntries(FORM_FIELDS.map((f) => [f.name, f.control]));
  assert.equal(control.type, 'select');
  assert.equal(control.date, 'date');
  assert.equal(control.body, 'textarea');
  assert.equal(control.agree, 'checkbox');
});

test('入力例は検証を通り、エラー例はすべての種類のエラーを含む', () => {
  assert.deepEqual(validate(valid), {});
  const errors = validate(FORM_SAMPLES.invalid);
  assert.equal(errors.name, 'required');
  assert.equal(errors.kana, 'format');
  assert.equal(errors.email, 'format');
  assert.equal(errors.type, 'required');
  assert.equal(errors.date, 'required');
  assert.equal(errors.body, 'required');
  assert.equal(errors.agree, 'consent');
  assert.ok(!('phone' in errors), '任意の電話番号は空でもエラーにならない');
});

test('空の入力は必須項目すべてがエラーになる', () => {
  assert.deepEqual(validate(EMPTY_VALUES), {
    name: 'required',
    kana: 'required',
    email: 'required',
    type: 'required',
    date: 'required',
    body: 'required',
    agree: 'consent',
  });
  assert.equal(validate({ ...valid, name: '   ' }).name, 'required', '空白のみは未入力');
});

test('ふりがなはひらがな（長音・空白可）のみ受け付ける', () => {
  for (const ok of ['さくらい はるか', 'さくらい　はるか', 'らーめん', 'あ']) assert.equal(validate({ ...valid, kana: ok }).kana, undefined, ok);
  for (const ng of ['サクライ', '桜井', 'sakurai', 'さくらい１', 'さくらい@']) assert.equal(validate({ ...valid, kana: ng }).kana, 'format', ng);
});

test('メールアドレスの形式を検証する', () => {
  for (const ok of ['a@example.com', 'a.b+c@example.co.jp', ' a@example.com ']) assert.equal(validate({ ...valid, email: ok }).email, undefined, ok);
  for (const ng of ['a', 'a@', '@example.com', 'a@example', 'a b@example.com', 'a#example.com', 'a@@example.com', 'a@example..com', 'ａ＠example.com']) {
    assert.equal(validate({ ...valid, email: ng }).email, 'format', ng);
  }
});

test('電話番号は任意で、入力した場合のみ形式を検証する', () => {
  for (const ok of ['', '090-1234-5678', '09012345678', '03-1234-5678', '０９０－１２３４－５６７８']) assert.equal(validate({ ...valid, phone: ok }).phone, undefined, ok);
  for (const ng of ['090-12', '12345', 'abc', '190-1234-5678', '090-1234-56789']) assert.equal(validate({ ...valid, phone: ng }).phone, 'format', ng);
});

test('確認事項は同意（true）が必要', () => {
  assert.equal(validate({ ...valid, agree: false }).agree, 'consent');
  assert.equal(validate({ ...valid, agree: true }).agree, undefined);
});

test('すべてのエラーに表示文言がある', () => {
  for (const [name, code] of Object.entries(validate(EMPTY_VALUES)).concat(Object.entries(validate(FORM_SAMPLES.invalid)))) {
    assert.ok(MESSAGES[name][code], `${name}.${code}`);
  }
});

test('送信を試みるまでエラーは出ず、試みた後は修正に合わせて更新される', () => {
  let form = createForm();
  form = setValue(form, 'name', '桜井');
  assert.deepEqual(form.errors, {}, '送信前は検証結果を出さない');

  form = submit(form);
  assert.equal(form.step, 'edit');
  assert.ok(form.submitted && hasErrors(form.errors));
  assert.equal(form.errors.name, undefined);
  assert.equal(form.errors.kana, 'required');

  form = setValue(form, 'kana', 'サクライ');
  assert.equal(form.errors.kana, 'format', '入力に応じてエラーが変わる');
  form = setValue(form, 'kana', 'さくらい');
  assert.equal(form.errors.kana, undefined, '修正するとエラーが消える');
});

test('エラーを修正すると確認へ進め、戻っても入力値が維持される', () => {
  let form = fillSample('invalid');
  assert.equal(form.step, 'edit');
  assert.ok(hasErrors(form.errors));
  assert.equal(submit(form).step, 'edit');

  for (const [name, value] of Object.entries(valid)) form = setValue(form, name, value);
  assert.deepEqual(form.errors, {});
  form = submit(form);
  assert.equal(form.step, 'confirm');
  assert.deepEqual(form.values, valid);

  form = back(form);
  assert.equal(form.step, 'edit');
  assert.deepEqual(form.values, valid, '編集に戻っても値は維持');

  form = complete(submit(form));
  assert.equal(form.step, 'done');
  assert.equal(complete(createForm()).step, 'edit', '確認前に完了へは進めない');
});

test('値が変わらない更新は同じ状態を返す（不要な再描画を避ける）', () => {
  const form = createForm();
  assert.equal(setValue(form, 'name', ''), form);
  assert.equal(setValue(form, 'unknown', 'x'), form, '未知の項目は無視');
});

test('入力例・エラー例・クリア', () => {
  const sample = fillSample('valid');
  assert.deepEqual(sample.values, valid);
  assert.deepEqual(sample.errors, {});
  assert.equal(sample.submitted, false);
  const bad = fillSample('invalid');
  assert.equal(bad.submitted, true);
  assert.equal(Object.keys(bad.errors).length, 7);
  assert.deepEqual(createForm().values, EMPTY_VALUES);
});

test('buildFormModel：表示値・最初のエラー・エラー一覧・ステップ', () => {
  const model = buildFormModel(fillSample('invalid'));
  assert.equal(model.errorCount, 7);
  assert.deepEqual(model.errorList.map((e) => e.name), ['name', 'kana', 'email', 'type', 'date', 'body', 'agree']);
  assert.deepEqual(model.fields.filter((f) => f.first).map((f) => f.name), ['name'], '最初のエラー項目だけに印');
  assert.equal(model.fields.find((f) => f.name === 'email').error.text, MESSAGES.email.format);
  assert.deepEqual(model.steps.map((s) => [s.label, s.current, s.done]), [['入力', true, false], ['確認', false, false], ['完了', false, false]]);

  const confirmModel = buildFormModel(submit(fillSample('valid')));
  assert.equal(confirmModel.step, 'confirm');
  assert.equal(confirmModel.stepIndex, 1);
  assert.deepEqual(confirmModel.steps.map((s) => s.done), [true, false, false]);
  const display = Object.fromEntries(confirmModel.fields.map((f) => [f.name, f.display]));
  assert.equal(display.date, '2026年11月2日');
  assert.equal(display.agree, '同意する');
  assert.equal(display.name, '桜井 はるか');
  assert.equal(buildFormModel(createForm()).fields.find((f) => f.name === 'phone').display, '入力なし');
});
