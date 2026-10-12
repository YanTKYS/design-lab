// デジタル庁デザインシステムの考え方を参考にした新規申請フォーム。
// 「※必須」「任意」をラベルの横に明示し、補足をラベルの直下・エラーを入力欄の直下（＊付き）に置く。
// 入力→確認→完了をステップで示し、エラー時は通知バナーで件数を知らせて最初のエラー項目へ移動する。

import { html } from '../html.js';
import { icon } from '../icons.js';
import { control, describedBy, fieldId } from './form-control.js';

const WIDTHS = { name: 'md', kana: 'md', email: 'lg', phone: 'sm', type: 'lg', date: 'sm', body: 'full' };
const CLS = { input: 'dads-input-text__input', select: 'dads-form-select', textarea: 'dads-textarea', checkbox: 'dads-checkbox__input' };

const TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '申請を受け付けました' };
const LEADS = {
  edit: '必要事項を入力してください。「※必須」の項目はすべて入力が必要です。',
  confirm: '内容に誤りがなければ「この内容で申請する」を押してください。修正する場合は入力画面に戻ります。',
  done: 'デモのため、実際には申請の送信・登録は行われていません。',
};

function steps(form) {
  return html`
    <ol class="dads-steps" aria-label="申請の進行状況">
      ${form.steps.map(
        (s) => html`
          <li class="dads-steps__item" data-state="${s.current ? 'current' : s.done ? 'done' : 'todo'}" ${s.current ? html`aria-current="step"` : ''}>
            <span class="dads-steps__number" aria-hidden="true">${s.done ? icon('check', { size: 20, stroke: 2.5 }) : s.number}</span>
            <span class="dads-steps__title"><span class="visually-hidden">ステップ${s.number}：</span>${s.label}</span>
          </li>`,
      )}
    </ol>`;
}

function banner(type, heading, body, list = []) {
  return html`
    <div class="dads-notification dads-notification--form" data-type="${type}">
      <h3 class="dads-notification__heading">
        ${icon(type === 'error' ? 'alert' : 'checkCircle', { size: 24, label: type === 'error' ? 'エラー' : '完了' })}<span>${heading}</span>
      </h3>
      <p class="dads-notification__body">${body}</p>
      ${list.length ? html`<ul class="dads-notification__list">${list.map((l) => html`<li>${l}</li>`)}</ul>` : ''}
    </div>`;
}

const requirement = (f) =>
  html`<span class="dads-form-control-label__requirement" data-required="${f.required ? 'true' : 'false'}">${f.required ? '※必須' : '任意'}</span>`;

function field(f, ctx) {
  const id = fieldId(ctx, 'dads', f.name);
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const hint = [f.hint, f.example].filter(Boolean).join(' ');
  return html`
    <div class="dads-form-control-label" data-size="md" data-width="${WIDTHS[f.name]}">
      <label class="dads-form-control-label__label" for="${id}">${f.label}${requirement(f)}</label>
      <p class="dads-form-control-label__support-text" id="${hintId}">${hint}</p>
      <div>
        ${control(f, { id, describedBy: describedBy(f.error && errId, hintId), cls: CLS })}
        ${f.error
          ? html`<p class="dads-form-control-label__error-text" id="${errId}"><span class="visually-hidden">エラー：</span>＊${f.error.text}</p>`
          : ''}
      </div>
    </div>`;
}

function consent(f, ctx) {
  const id = fieldId(ctx, 'dads', f.name);
  const errId = `${id}-error`;
  return html`
    <fieldset class="dads-form-control-label" data-size="md" ${f.error ? html`aria-describedby="${errId}"` : ''}>
      <legend class="dads-form-control-label__label">${f.label}${requirement(f)}</legend>
      <p class="dads-form-control-label__support-text">内容を確認し、同意する場合はチェックを入れてください。</p>
      <div>
        <label class="dads-checkbox" data-size="md">
          <span class="dads-checkbox__checkbox">${control(f, { id, describedBy: f.error ? errId : '', cls: CLS })}</span>
          <span class="dads-checkbox__label">${f.checkLabel}</span>
        </label>
      </div>
      ${f.error ? html`<p class="dads-form-control-label__error-text" id="${errId}"><span class="visually-hidden">エラー：</span>＊${f.error.text}</p>` : ''}
    </fieldset>`;
}

function section(title, children) {
  return html`<section class="dads-form-section"><h3 class="dads-section-title">${title}</h3>${children}</section>`;
}

function editPage(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`
    ${form.errorCount
      ? banner('error', '入力内容に誤りがあります', `次の${form.errorCount}件の項目を確認し、修正してください。`, form.errorList.map((e) => e.label))
      : ''}
    <form class="dads-form" data-form="entry" novalidate aria-label="新規申請フォーム">
      ${section('申請者の情報', [field(by.name, ctx), field(by.kana, ctx), field(by.email, ctx), field(by.phone, ctx)])}
      ${section('申請の内容', [field(by.type, ctx), field(by.date, ctx), field(by.body, ctx)])}
      ${section('確認事項', consent(by.agree, ctx))}
      <div class="dads-form-actions">
        <button type="submit" class="dads-button" data-type="solid-fill" data-size="lg">確認画面へ進む</button>
        <button type="button" class="dads-button" data-type="outline" data-size="lg" data-action="nav" data-target="applications">申請一覧に戻る</button>
      </div>
    </form>`;
}

function confirmPage(form) {
  return html`
    <div class="dads-table-wrap" role="region" aria-label="入力内容" tabindex="0">
      <table class="dads-table dads-table--rows">
        <tbody>
          ${form.fields.map((f) => html`<tr><th scope="row">${f.label}</th><td class="dads-pre">${f.display}</td></tr>`)}
        </tbody>
      </table>
    </div>
    <div class="dads-form-actions">
      <button type="button" class="dads-button" data-type="solid-fill" data-size="lg" data-action="form-confirm">この内容で申請する</button>
      <button type="button" class="dads-button" data-type="outline" data-size="lg" data-action="form-back">入力画面に戻って修正する</button>
    </div>`;
}

function donePage() {
  return html`
    ${banner('success', '申請の入力が完了しました', 'これはデモです。入力内容はどこにも送信・保存されません。')}
    <div class="dads-form-actions">
      <button type="button" class="dads-button" data-type="solid-fill" data-size="lg" data-action="nav" data-target="applications">申請一覧へ</button>
      <button type="button" class="dads-button" data-type="outline" data-size="lg" data-action="form-restart">続けて入力する</button>
    </div>`;
}

export function formPage(model, ctx) {
  const form = model.form;
  return html`
    ${steps(form)}
    <h2 class="dads-heading" tabindex="-1" data-focus="heading">${TITLES[form.step]}</h2>
    <p class="dads-lead">${LEADS[form.step]}</p>
    ${form.step === 'edit' ? editPage(form, ctx) : form.step === 'confirm' ? confirmPage(form) : donePage()}`;
}
