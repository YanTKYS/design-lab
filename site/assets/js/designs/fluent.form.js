// Microsoft Fluent 2 の考え方を参考にした新規申請フォーム。
// 白いカードの中の 2 カラム、ラベル右の赤い「＊」、欄の下に「アイコン付きの検証メッセージ→ヒント」を置く Field、
// 上部の MessageBar（最初のエラー項目へ移動するボタン付き）、左寄せの主ボタンが特徴。

import { html } from '../html.js';
import { icon } from '../icons.js';
import { control, describedBy, fieldId } from './form-control.js';

const CLS = { input: 'fui-input', select: 'fui-input fui-input--select', textarea: 'fui-input fui-input--textarea', checkbox: 'fui-checkbox__input' };

const TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '入力が完了しました' };

function messageBar(intent, body, action = '') {
  return html`
    <div class="fui-messagebar fui-messagebar--${intent}">
      ${icon(intent === 'error' ? 'alert' : 'checkCircle', { size: 20, stroke: 1.5, className: 'fui-messagebar__icon' })}
      <p class="fui-messagebar__body">${body}</p>
      ${action}
    </div>`;
}

function field(f, ctx, wide = false) {
  const id = fieldId(ctx, 'fui', f.name);
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  return html`
    <div class="fui-field ${f.error ? 'is-invalid' : ''} ${wide ? 'fui-field--wide' : ''}">
      <label class="fui-field__label" for="${id}">${f.label}${f.required ? html`<span class="fui-field__required" aria-hidden="true"> *</span>` : ''}</label>
      ${control(f, { id, describedBy: describedBy(f.error && errId, hintId), cls: CLS })}
      ${f.error
        ? html`<p class="fui-field__validation" id="${errId}">${icon('alert', { size: 12, stroke: 2.25 })}<span><span class="visually-hidden">エラー：</span>${f.error.text}</span></p>`
        : ''}
      <p class="fui-field__hint" id="${hintId}">${[f.hint, f.example].filter(Boolean).join(' ')}</p>
    </div>`;
}

function consent(f, ctx) {
  const id = fieldId(ctx, 'fui', f.name);
  const errId = `${id}-error`;
  const labelId = `${id}-legend`;
  return html`
    <div class="fui-field fui-field--wide ${f.error ? 'is-invalid' : ''}" role="group" aria-labelledby="${labelId}" ${f.error ? html`aria-describedby="${errId}"` : ''}>
      <span class="fui-field__label" id="${labelId}">${f.label}<span class="fui-field__required" aria-hidden="true"> *</span></span>
      <span class="fui-checkbox">
        ${control(f, { id, describedBy: f.error ? errId : '', cls: CLS })}
        <label class="fui-checkbox__label" for="${id}">${f.checkLabel}</label>
      </span>
      ${f.error
        ? html`<p class="fui-field__validation" id="${errId}">${icon('alert', { size: 12, stroke: 2.25 })}<span><span class="visually-hidden">エラー：</span>${f.error.text}</span></p>`
        : ''}
    </div>`;
}

function editPage(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  const first = form.errorList[0];
  return html`
    ${form.errorCount
      ? messageBar(
          'error',
          html`<strong>${form.errorCount}件の項目を確認してください。</strong> 各項目のメッセージに従って修正すると、確認へ進めます。`,
          html`<button type="button" class="fui-button fui-button--subtle" data-action="focus-field" data-goto-field="${first.name}">最初の項目へ</button>`,
        )
      : ''}
    <section class="fui-card fui-formcard" aria-label="新規申請">
      <form data-form="entry" novalidate aria-label="新規申請フォーム">
        <h3 class="fui-subtitle">申請者</h3>
        <div class="fui-form-grid">${field(by.name, ctx)} ${field(by.kana, ctx)} ${field(by.email, ctx)} ${field(by.phone, ctx)}</div>
        <h3 class="fui-subtitle">申請内容</h3>
        <div class="fui-form-grid">${field(by.type, ctx)} ${field(by.date, ctx)} ${field(by.body, ctx, true)}</div>
        <h3 class="fui-subtitle">確認事項</h3>
        <div class="fui-form-grid">${consent(by.agree, ctx)}</div>
        <div class="fui-form-footer">
          <button type="submit" class="fui-button fui-button--primary">確認へ</button>
          <button type="button" class="fui-button fui-button--secondary" data-action="nav" data-target="applications">キャンセル</button>
        </div>
      </form>
    </section>`;
}

function confirmPage(form) {
  return html`
    <section class="fui-card fui-formcard" aria-label="入力内容">
      <dl class="fui-summary">
        ${form.fields.map((f) => html`<div class="fui-summary__row"><dt>${f.label}</dt><dd class="fui-pre">${f.display}</dd></div>`)}
      </dl>
      <div class="fui-form-footer">
        <button type="button" class="fui-button fui-button--primary" data-action="form-confirm">申請する</button>
        <button type="button" class="fui-button fui-button--secondary" data-action="form-back">戻って修正</button>
      </div>
    </section>`;
}

function donePage() {
  return html`
    ${messageBar('success', html`<strong>入力が完了しました。</strong> デモのため、申請は送信・登録されていません。`)}
    <section class="fui-card fui-formcard" aria-label="完了">
      <p class="fui-done">申請の入力から確認までの流れは以上です。</p>
      <div class="fui-form-footer">
        <button type="button" class="fui-button fui-button--primary" data-action="nav" data-target="applications">申請一覧へ</button>
        <button type="button" class="fui-button fui-button--secondary" data-action="form-restart">続けて入力する</button>
      </div>
    </section>`;
}

export function formPage(model, ctx) {
  const form = model.form;
  const step = form.steps[form.stepIndex];
  return html`
    <div class="fui-page-head">
      <h2 class="fui-title" tabindex="-1" data-focus="heading">${TITLES[form.step]}</h2>
      <p class="fui-caption">手順 ${step.number} / ${form.steps.length}：${step.label}</p>
    </div>
    ${form.step === 'edit' ? editPage(form, ctx) : form.step === 'confirm' ? confirmPage(form) : donePage()}`;
}
