// IBM Carbon Design System の考え方を参考にした新規申請フォーム。
// 2 カラムのフォームグリッド、欄の中の入力例（プレースホルダー）と欄の下のヘルパーテキスト、
// 任意の項目だけを「（任意）」と示すラベル、エラー時はヘルパーを置き換えるメッセージと欄内のアイコン、
// 上部のインライン通知、左右が隙間なく並ぶボタンセット、進行インジケーター、構造化リストの確認画面が特徴。

import { html } from '../html.js';
import { icon } from '../icons.js';
import { control, fieldId } from './form-control.js';

const CLS = {
  input: 'cds-input',
  select: 'cds-input cds-input--select',
  textarea: 'cds-input cds-input--textarea',
  checkbox: 'cds-checkbox__input',
};

const TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '申請の入力が完了しました' };
const DESCRIPTIONS = {
  edit: '申請に必要な情報を入力してください。「任意」と書かれた項目以外は入力が必要です。',
  confirm: '内容を確認し、問題がなければ申請してください。',
  done: 'これはデモです。入力内容はどこにも送信・保存されません。',
};

function progress(form) {
  return html`
    <ol class="cds-progress" aria-label="申請の進行状況">
      ${form.steps.map(
        (s) => html`
          <li class="cds-progress__step" data-state="${s.current ? 'current' : s.done ? 'complete' : 'incomplete'}" ${s.current ? html`aria-current="step"` : ''}>
            <span class="cds-progress__icon" aria-hidden="true">${s.done ? icon('check', { size: 12, stroke: 3 }) : ''}</span>
            <span class="cds-progress__label">${s.label}<span class="visually-hidden">（${s.done ? '完了' : s.current ? '現在のステップ' : '未完了'}）</span></span>
          </li>`,
      )}
    </ol>`;
}

function notification(kind, title, text) {
  return html`
    <div class="cds-inline-notification cds-inline-notification--${kind}">
      ${icon(kind === 'error' ? 'xCircle' : 'checkCircle', { size: 20, stroke: 1.75, className: 'cds-inline-notification__icon' })}
      <div class="cds-inline-notification__text">
        <p class="cds-inline-notification__title">${title}</p>
        <p class="cds-inline-notification__subtitle">${text}</p>
      </div>
    </div>`;
}

function field(f, ctx, span = false) {
  const id = fieldId(ctx, 'cds', f.name);
  const helperId = `${id}-helper`;
  const errId = `${id}-error`;
  return html`
    <div class="cds-field ${f.error ? 'is-invalid' : ''} ${span ? 'cds-field--wide' : ''}">
      <label class="cds-label" for="${id}">${f.label}${f.required ? '' : html`<span class="cds-label__optional">（任意）</span>`}</label>
      <div class="cds-field__box">
        ${control(f, { id, describedBy: f.error ? errId : helperId, cls: CLS, placeholder: f.example ? f.example.replace(/^例：/, '') : '' })}
        ${f.error ? icon('alert', { size: 16, stroke: 2, className: 'cds-field__error-icon' }) : ''}
      </div>
      ${f.error
        ? html`<p class="cds-form-requirement" id="${errId}"><span class="visually-hidden">エラー：</span>${f.error.text}</p>`
        : html`<p class="cds-form-helper" id="${helperId}">${f.hint}</p>`}
    </div>`;
}

function consent(f, ctx) {
  const id = fieldId(ctx, 'cds', f.name);
  const errId = `${id}-error`;
  return html`
    <fieldset class="cds-field cds-field--wide cds-field--check ${f.error ? 'is-invalid' : ''}" ${f.error ? html`aria-describedby="${errId}"` : ''}>
      <legend class="cds-label">${f.label}</legend>
      <div class="cds-checkbox">
        ${control(f, { id, describedBy: f.error ? errId : '', cls: CLS })}
        <label class="cds-checkbox__label" for="${id}">${f.checkLabel}</label>
      </div>
      ${f.error ? html`<p class="cds-form-requirement" id="${errId}"><span class="visually-hidden">エラー：</span>${f.error.text}</p>` : ''}
    </fieldset>`;
}

function editPage(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`
    ${form.errorCount ? notification('error', '入力エラー', `${form.errorCount}件の項目に問題があります。各項目のメッセージを確認してください。`) : ''}
    <form class="cds-form" data-form="entry" novalidate aria-label="新規申請フォーム">
      <fieldset class="cds-fieldset">
        <legend class="cds-fieldset__legend">申請者</legend>
        <div class="cds-form-grid">${field(by.name, ctx)} ${field(by.kana, ctx)} ${field(by.email, ctx)} ${field(by.phone, ctx)}</div>
      </fieldset>
      <fieldset class="cds-fieldset">
        <legend class="cds-fieldset__legend">申請内容</legend>
        <div class="cds-form-grid">${field(by.type, ctx)} ${field(by.date, ctx)} ${field(by.body, ctx, true)}</div>
      </fieldset>
      <fieldset class="cds-fieldset">
        <legend class="cds-fieldset__legend">確認事項</legend>
        <div class="cds-form-grid">${consent(by.agree, ctx)}</div>
      </fieldset>
      <div class="cds-btn-set">
        <button type="button" class="cds-btn cds-btn--secondary" data-action="nav" data-target="applications">キャンセル</button>
        <button type="submit" class="cds-btn cds-btn--primary">確認へ${icon('arrowRight', { size: 16, stroke: 1.75, className: 'cds-btn__icon' })}</button>
      </div>
    </form>`;
}

function confirmPage(form) {
  return html`
    <div class="cds-structured-wrap" role="region" aria-label="入力内容" tabindex="0">
      <table class="cds-structured-list">
        <thead><tr><th scope="col">項目</th><th scope="col">入力内容</th></tr></thead>
        <tbody>
          ${form.fields.map((f) => html`<tr><th scope="row">${f.label}</th><td class="cds-pre">${f.display}</td></tr>`)}
        </tbody>
      </table>
    </div>
    <div class="cds-btn-set">
      <button type="button" class="cds-btn cds-btn--secondary" data-action="form-back">修正する</button>
      <button type="button" class="cds-btn cds-btn--primary" data-action="form-confirm">申請する${icon('check', { size: 16, stroke: 2, className: 'cds-btn__icon' })}</button>
    </div>`;
}

function donePage() {
  return html`
    ${notification('success', '入力が完了しました', 'デモのため、申請は送信・登録されていません。')}
    <div class="cds-btn-set">
      <button type="button" class="cds-btn cds-btn--secondary" data-action="form-restart">続けて入力する</button>
      <button type="button" class="cds-btn cds-btn--primary" data-action="nav" data-target="applications">申請一覧へ${icon('arrowRight', { size: 16, stroke: 1.75, className: 'cds-btn__icon' })}</button>
    </div>`;
}

export function formPage(model, ctx) {
  const form = model.form;
  return html`
    <h2 class="cds-page-title" tabindex="-1" data-focus="heading">${TITLES[form.step]}</h2>
    <p class="cds-page-desc">${DESCRIPTIONS[form.step]}</p>
    ${progress(form)}
    ${form.step === 'edit' ? editPage(form, ctx) : form.step === 'confirm' ? confirmPage(form) : donePage()}`;
}
