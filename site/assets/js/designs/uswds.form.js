// U.S. Web Design System の考え方を参考にした新規申請フォーム。
// 上部の分割式ステップインジケーター、「＊は必須項目です」の注記と必須項目のラベル右の赤い「＊」、
// ラベル → ヒント → エラー → 入力欄の順、エラー項目の左側の赤い帯、上部の赤いアラート（件数と項目名の一覧）、
// 主ボタン＋アウトラインボタンが特徴。幅を絞った入力欄（usa-form の最大幅）で縦に並べる。

import { cx, html } from '../html.js';
import { icon } from '../icons.js';
import { control, describedBy, fieldId } from './form-control.js';

const TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '入力が完了しました' };

function stepIndicator(form) {
  const step = form.steps[form.stepIndex];
  return html`
    <div class="usa-step-indicator" role="group" aria-label="申請の進行状況">
      <ol class="usa-step-indicator__segments">
        ${form.steps.map(
          (s) => html`<li class="usa-step-indicator__segment ${s.current ? 'usa-step-indicator__segment--current' : s.done ? 'usa-step-indicator__segment--complete' : ''}" ${s.current ? html`aria-current="step"` : ''}><span class="visually-hidden">${s.label}（${s.done ? '完了' : s.current ? '現在のステップ' : '未完了'}）</span></li>`,
        )}
      </ol>
      <p class="usa-step-indicator__header">
        <span class="usa-step-indicator__heading-counter"><span class="usa-step-indicator__current-step">${step.number}</span><span class="usa-step-indicator__total-steps"> / ${form.steps.length}</span></span>
        <span class="usa-step-indicator__heading-text">${step.label}</span>
      </p>
    </div>`;
}

function alert(kind, heading, body, list = []) {
  return html`
    <div class="usa-alert usa-alert--${kind} usa-alert--form">
      <div class="usa-alert__body">
        <h3 class="usa-alert__heading">${heading}</h3>
        <p class="usa-alert__text">${body}</p>
        ${list.length ? html`<ul class="usa-alert__list">${list.map((l) => html`<li>${l}</li>`)}</ul>` : ''}
      </div>
    </div>`;
}

const errorMessage = (f, errId) =>
  f.error ? html`<span class="usa-error-message" id="${errId}"><span class="visually-hidden">エラー：</span>${f.error.text}</span>` : '';

function group(f, ctx) {
  const id = fieldId(ctx, 'usa', f.name);
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const cls = {
    input: cx('usa-input', f.error && 'usa-input--error'),
    select: cx('usa-select', f.error && 'usa-input--error'),
    textarea: cx('usa-textarea', f.error && 'usa-input--error'),
  };
  return html`
    <div class="usa-form-group ${f.error ? 'usa-form-group--error' : ''}">
      <label class="usa-label ${f.error ? 'usa-label--error' : ''}" for="${id}">${f.label}${f.required ? html`<abbr title="必須" class="usa-hint usa-hint--required"> *</abbr>` : ''}</label>
      <span class="usa-hint" id="${hintId}">${[f.hint, f.example].filter(Boolean).join(' ')}</span>
      ${errorMessage(f, errId)}
      ${control(f, { id, describedBy: describedBy(f.error && errId, hintId), cls })}
    </div>`;
}

function consent(f, ctx) {
  const id = fieldId(ctx, 'usa', f.name);
  const errId = `${id}-error`;
  return html`
    <div class="usa-form-group ${f.error ? 'usa-form-group--error' : ''}">
      <fieldset class="usa-fieldset" ${f.error ? html`aria-describedby="${errId}"` : ''}>
        <legend class="usa-legend ${f.error ? 'usa-label--error' : ''}">${f.label}<abbr title="必須" class="usa-hint usa-hint--required"> *</abbr></legend>
        ${errorMessage(f, errId)}
        <div class="usa-checkbox">
          ${control(f, { id, describedBy: f.error ? errId : '', cls: { checkbox: 'usa-checkbox__input' } })}
          <label class="usa-checkbox__label" for="${id}">${f.checkLabel}</label>
        </div>
      </fieldset>
    </div>`;
}

function editPage(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`
    ${form.errorCount
      ? alert('error', '入力内容に問題があります', `${form.errorCount}件の項目を修正してください。`, form.errorList.map((e) => e.label))
      : ''}
    <form class="usa-form usa-form--large" data-form="entry" novalidate aria-label="新規申請フォーム">
      <p class="usa-form__note"><abbr class="usa-hint usa-hint--required">*</abbr> は必須項目です。</p>
      <fieldset class="usa-fieldset">
        <legend class="usa-legend usa-legend--large">申請者の情報</legend>
        ${group(by.name, ctx)} ${group(by.kana, ctx)} ${group(by.email, ctx)} ${group(by.phone, ctx)}
      </fieldset>
      <fieldset class="usa-fieldset">
        <legend class="usa-legend usa-legend--large">申請の内容</legend>
        ${group(by.type, ctx)} ${group(by.date, ctx)} ${group(by.body, ctx)}
      </fieldset>
      <fieldset class="usa-fieldset">
        <legend class="usa-legend usa-legend--large">確認事項</legend>
        ${consent(by.agree, ctx)}
      </fieldset>
      <div class="usa-form__actions">
        <button type="submit" class="usa-button">確認へ</button>
        <button type="button" class="usa-button usa-button--outline" data-action="nav" data-target="applications">キャンセル</button>
      </div>
    </form>`;
}

function confirmPage(form) {
  return html`
    <div class="usa-table-container usa-table-container--form">
      <table class="usa-table usa-table--borderless usa-table--confirm">
        <caption>入力内容</caption>
        <tbody>
          ${form.fields.map((f) => html`<tr><th scope="row">${f.label}</th><td class="usa-pre">${f.display}</td></tr>`)}
        </tbody>
      </table>
    </div>
    <div class="usa-form__actions">
      <button type="button" class="usa-button" data-action="form-confirm">${icon('check', { size: 20, stroke: 2.5 })}申請する</button>
      <button type="button" class="usa-button usa-button--outline" data-action="form-back">修正する</button>
    </div>`;
}

function donePage() {
  return html`
    ${alert('success', '入力が完了しました', 'デモのため、申請は送信・登録されていません。')}
    <div class="usa-form__actions">
      <button type="button" class="usa-button" data-action="nav" data-target="applications">申請一覧へ</button>
      <button type="button" class="usa-button usa-button--outline" data-action="form-restart">続けて入力する</button>
    </div>`;
}

/** extra: 通知アラートなど、デザイン共通の枠が差し込む HTML */
export function formPage(model, ctx, extra = '') {
  const form = model.form;
  return html`
    ${extra} ${stepIndicator(form)}
    <div class="usa-page-head">
      <h2 class="usa-page-title" tabindex="-1" data-focus="heading">${TITLES[form.step]}</h2>
    </div>
    ${form.step === 'edit' ? editPage(form, ctx) : form.step === 'confirm' ? confirmPage(form) : donePage()}`;
}
