// GOV.UK Design System の考え方を参考にした新規申請フォーム。
// 1 列・1 画面 1 つの流れで、ラベル → ヒント → エラー → 入力欄を縦に積み、任意の項目だけを「（任意）」と示す。
// エラー時は先頭に「問題があります」のエラーサマリーを出してフォーカスを移し、各項目へのリンクを示す。
// 確認は「回答内容の確認」画面で、各行の「変更」リンクから該当項目へ戻る。

import { cx, html } from '../html.js';
import { control, describedBy, fieldId } from './form-control.js';

const WIDTHS = { name: 'gvk-input--w20', kana: 'gvk-input--w20', email: 'gvk-input--w30', phone: 'gvk-input--w10', date: 'gvk-input--w10' };

function classes(f) {
  return {
    input: cx('gvk-input', WIDTHS[f.name], f.error && 'gvk-input--error'),
    select: cx('gvk-select', f.error && 'gvk-select--error'),
    textarea: cx('gvk-textarea', f.error && 'gvk-textarea--error'),
    checkbox: 'gvk-checkboxes__input',
  };
}

function errorSummary(form, ctx) {
  if (!form.errorCount) return '';
  return html`
    <div class="gvk-error-summary" role="alert" tabindex="-1" data-focus="error-summary" aria-labelledby="${ctx.uid}-gvk-error-title">
      <h2 class="gvk-error-summary__title" id="${ctx.uid}-gvk-error-title">問題があります</h2>
      <ul class="gvk-list gvk-error-summary__list">
        ${form.errorList.map(
          (e) => html`<li><a href="#${fieldId(ctx, 'gvk', e.name)}" data-action="focus-field" data-goto-field="${e.name}">${e.text}</a></li>`,
        )}
      </ul>
    </div>`;
}

const errorMessage = (f, errId) =>
  f.error ? html`<p class="gvk-error-message" id="${errId}"><span class="visually-hidden">エラー：</span>${f.error.text}</p>` : '';

function group(f, ctx) {
  const id = fieldId(ctx, 'gvk', f.name);
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  return html`
    <div class="gvk-form-group ${f.error ? 'gvk-form-group--error' : ''}">
      <label class="gvk-label gvk-label--s" for="${id}">${f.label}${f.required ? '' : '（任意）'}</label>
      <div class="gvk-hint" id="${hintId}">${[f.hint, f.example].filter(Boolean).join(' ')}</div>
      ${errorMessage(f, errId)}
      ${control(f, { id, describedBy: describedBy(hintId, f.error && errId), cls: classes(f) })}
    </div>`;
}

function consent(f, ctx) {
  const id = fieldId(ctx, 'gvk', f.name);
  const errId = `${id}-error`;
  return html`
    <div class="gvk-form-group ${f.error ? 'gvk-form-group--error' : ''}">
      <fieldset class="gvk-fieldset" ${f.error ? html`aria-describedby="${errId}"` : ''}>
        <legend class="gvk-fieldset__legend">${f.label}</legend>
        ${errorMessage(f, errId)}
        <div class="gvk-checkboxes__item">
          ${control(f, { id, describedBy: f.error ? errId : '', cls: classes(f) })}
          <label class="gvk-label gvk-checkboxes__label" for="${id}">${f.checkLabel}</label>
        </div>
      </fieldset>
    </div>`;
}

function editPage(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`
    <form class="gvk-form" data-form="entry" novalidate aria-label="新規申請フォーム">
      ${group(by.name, ctx)} ${group(by.kana, ctx)} ${group(by.email, ctx)} ${group(by.phone, ctx)}
      ${group(by.type, ctx)} ${group(by.date, ctx)} ${group(by.body, ctx)} ${consent(by.agree, ctx)}
      <div class="gvk-button-group">
        <button type="submit" class="gvk-button">確認へ進む</button>
        <a class="gvk-link" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">キャンセル</a>
      </div>
    </form>`;
}

function confirmPage(form, ctx) {
  return html`
    <dl class="gvk-summary-list">
      ${form.fields.map(
        (f) => html`
          <div class="gvk-summary-list__row">
            <dt class="gvk-summary-list__key">${f.label}</dt>
            <dd class="gvk-summary-list__value gvk-pre">${f.display}</dd>
            <dd class="gvk-summary-list__actions">
              <a class="gvk-link" href="${ctx.href({})}" data-action="form-back" data-goto-field="${f.name}">変更<span class="visually-hidden">（${f.label}）</span></a>
            </dd>
          </div>`,
      )}
    </dl>
    <h3 class="gvk-heading-m">申請する</h3>
    <p class="gvk-body">「この内容で申請する」を押すと入力が完了します。これはデモのため、内容は送信・保存されません。</p>
    <button type="button" class="gvk-button" data-action="form-confirm">この内容で申請する</button>`;
}

function donePage(ctx) {
  return html`
    <div class="gvk-panel">
      <h2 class="gvk-panel__title" tabindex="-1" data-focus="heading">申請の入力が完了しました</h2>
      <div class="gvk-panel__body">デモのため、申請は送信・登録されていません</div>
    </div>
    <h3 class="gvk-heading-m">次にできること</h3>
    <ul class="gvk-list gvk-list--bullet">
      <li><a class="gvk-link" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">申請一覧に戻る</a></li>
      <li><button type="button" class="gvk-link-button" data-action="form-restart">続けて別の申請を入力する</button></li>
    </ul>`;
}

/** extra: 通知バナーなど、デザイン共通の枠が差し込む HTML */
export function formPage(model, ctx, extra = '') {
  const form = model.form;
  const back =
    form.step === 'confirm'
      ? html`<a class="gvk-back-link" href="${ctx.href({})}" data-action="form-back">戻る</a>`
      : form.step === 'edit'
        ? html`<a class="gvk-back-link" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">戻る</a>`
        : '';
  if (form.step === 'done') {
    return html`<div class="gvk-main">${extra} ${donePage(ctx)}</div>`;
  }
  return html`
    ${back}
    <div class="gvk-main">
      ${extra} ${errorSummary(form, ctx)}
      <span class="gvk-caption-l">${model.system.name}</span>
      <h2 class="gvk-heading-l" tabindex="-1" data-focus="heading">${form.step === 'edit' ? '新規申請' : '回答内容を確認してください'}</h2>
      <div class="gvk-form-column">${form.step === 'edit' ? editPage(form, ctx) : confirmPage(form, ctx)}</div>
    </div>`;
}
