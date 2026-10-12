// 装飾を抑えた素の HTML のフォーム。fieldset / legend / label とブラウザ標準の部品だけで組む。
// 必須はラベルの「（必須）」、補足は small、エラーは欄の後ろの「エラー：…」の文字で表す。

import { html } from '../html.js';
import { control, describedBy, fieldId } from './form-control.js';

const TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '入力が完了しました' };

function errors(form) {
  if (!form.errorCount) return '';
  return html`
    <div class="plain-errors" role="alert">
      <p><strong>入力エラーが${form.errorCount}件あります。</strong></p>
      <ul>${form.errorList.map((e) => html`<li>${e.text}</li>`)}</ul>
    </div>`;
}

function row(f, ctx) {
  const id = fieldId(ctx, 'plain', f.name);
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  return html`
    <p>
      <label for="${id}">${f.label}${f.required ? '（必須）' : '（任意）'}</label><br />
      ${control(f, { id, describedBy: describedBy(f.error && errId, hintId) })}<br />
      <small id="${hintId}">${[f.hint, f.example].filter(Boolean).join(' ')}</small>
      ${f.error ? html`<br /><span class="plain-error" id="${errId}">エラー：${f.error.text}</span>` : ''}
    </p>`;
}

function consent(f, ctx) {
  const id = fieldId(ctx, 'plain', f.name);
  const errId = `${id}-error`;
  return html`
    <p>
      ${control(f, { id, describedBy: f.error ? errId : '' })}
      <label for="${id}">${f.checkLabel}（必須）</label>
      ${f.error ? html`<br /><span class="plain-error" id="${errId}">エラー：${f.error.text}</span>` : ''}
    </p>`;
}

function editPage(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`
    ${errors(form)}
    <form data-form="entry" novalidate aria-label="新規申請フォーム">
      <fieldset>
        <legend>申請者</legend>
        ${row(by.name, ctx)} ${row(by.kana, ctx)} ${row(by.email, ctx)} ${row(by.phone, ctx)}
      </fieldset>
      <fieldset>
        <legend>申請内容</legend>
        ${row(by.type, ctx)} ${row(by.date, ctx)} ${row(by.body, ctx)}
      </fieldset>
      <fieldset>
        <legend>確認事項への同意</legend>
        ${consent(by.agree, ctx)}
      </fieldset>
      <p>
        <button type="submit">確認へ</button>
        <button type="button" data-action="nav" data-target="applications">キャンセル</button>
      </p>
    </form>`;
}

function confirmPage(form) {
  return html`
    <dl>${form.fields.map((f) => html`<dt>${f.label}</dt><dd class="plain-pre">${f.display}</dd>`)}</dl>
    <p>
      <button type="button" data-action="form-confirm">この内容で申請する</button>
      <button type="button" data-action="form-back">修正する</button>
    </p>`;
}

function donePage() {
  return html`
    <p>入力が完了しました。デモのため、申請は送信・登録されていません。</p>
    <p>
      <button type="button" data-action="nav" data-target="applications">申請一覧へ</button>
      <button type="button" data-action="form-restart">続けて入力する</button>
    </p>`;
}

export function formPage(model, ctx) {
  const form = model.form;
  const step = form.steps[form.stepIndex];
  return html`
    <h2 tabindex="-1" data-focus="heading">${TITLES[form.step]}</h2>
    <p>手順 ${step.number} / ${form.steps.length}：${step.label}</p>
    ${form.step === 'edit' ? editPage(form, ctx) : form.step === 'confirm' ? confirmPage(form) : donePage()}`;
}
