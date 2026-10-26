// Filled text field と、手順・補足を分離したデスクトップ向けフォーム。
import { attr, html } from '../html.js';
import { icon } from '../icons.js';
import { control, describedBy, fieldId } from './form-control.js';

const CLS = {
  input: 'm3-input',
  select: 'm3-input',
  textarea: 'm3-input m3-input--textarea',
  checkbox: 'm3-checkbox',
};
const TITLES = {
  edit: '新規申請',
  confirm: '入力内容の確認',
  done: '入力が完了しました',
};

function field(f, ctx) {
  const id = fieldId(ctx, 'm3', f.name);
  const hint = `${id}-hint`,
    error = `${id}-error`;
  return html`<div class="m3-field ${f.error ? 'is-invalid' : ''} ${f.name === 'body' || f.name === 'agree' ? 'm3-field--wide' : ''}">
    ${f.control === 'checkbox'
      ? html`<div class="m3-consent">
          <p>${f.label} <small>必須</small></p>
          <div>
            ${control(f, {
              id,
              describedBy: describedBy(hint, f.error && error),
              cls: CLS,
            })}<label for="${id}">${f.checkLabel}</label>
          </div>
        </div>`
      : html`<div class="m3-filled">
          <label for="${id}">${f.label}<small>${f.required ? '必須' : '任意'}</small></label
          >${control(f, {
            id,
            describedBy: describedBy(hint, f.error && error),
            cls: CLS,
          })}
        </div>`}
    <p class="m3-field__hint" id="${hint}">${[f.hint, f.example].filter(Boolean).join(' ')}</p>
    ${f.error ? html`<p class="m3-field__error" id="${error}">${icon('alert', { size: 16 })}<span>エラー：${f.error.text}</span></p>` : ''}
  </div>`;
}

function edit(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`${form.errorCount
      ? html`<div class="m3-error-notice" role="alert">
          ${icon('alert')}
          <div>
            <strong>${form.errorCount}件の項目を確認してください。</strong>
            <p>各項目の理由を確認し、入力を修正してください。</p>
            <button type="button" class="m3-button" data-action="focus-field" data-goto-field="${form.errorList[0].name}">
              最初の項目へ
            </button>
          </div>
        </div>`
      : ''}
    <form data-form="entry" novalidate aria-label="新規申請フォーム">
      <fieldset>
        <legend>申請者</legend>
        <div class="m3-form-grid">${['name', 'kana', 'email', 'phone'].map((n) => field(by[n], ctx))}</div>
      </fieldset>
      <fieldset>
        <legend>申請内容</legend>
        <div class="m3-form-grid">${['type', 'date', 'body'].map((n) => field(by[n], ctx))}</div>
      </fieldset>
      <fieldset>
        <legend>確認事項</legend>
        ${field(by.agree, ctx)}
      </fieldset>
      <div class="m3-actions">
        <button type="submit" class="m3-button m3-button--filled">確認へ${icon('arrowRight', { size: 18 })}</button
        ><button type="button" class="m3-button" data-action="nav" data-target="applications">キャンセル</button>
      </div>
    </form>`;
}

function confirm(form) {
  return html`<p>内容を確認し、修正が必要な場合は戻って編集してください。</p>
    <dl class="m3-summary">
      ${form.fields.map(
        (f) =>
          html`<div>
            <dt>${f.label}</dt>
            <dd>${f.display}</dd>
          </div>`,
      )}
    </dl>
    <div class="m3-actions">
      <button type="button" class="m3-button m3-button--filled" data-action="form-confirm">申請する</button
      ><button type="button" class="m3-button m3-button--outlined" data-action="form-back">戻って修正</button>
    </div>`;
}

function done() {
  return html`<div class="m3-complete">
      ${icon('checkCircle', { size: 48 })}
      <h3>入力を確認しました</h3>
      <p>デモのため、申請は送信・登録されていません。</p>
    </div>
    <div class="m3-actions">
      <button type="button" class="m3-button m3-button--filled" data-action="nav" data-target="applications">申請一覧へ</button
      ><button type="button" class="m3-button m3-button--outlined" data-action="form-restart">続けて入力する</button>
    </div>`;
}

export function formPage(model, ctx) {
  const f = model.form;
  return html`<div class="m3-page-head">
      <div>
        <h2 tabindex="-1" data-focus="heading">${TITLES[f.step]}</h2>
        <p class="m3-support">手順 ${f.stepIndex + 1} / ${f.steps.length}</p>
      </div>
    </div>
    <div class="m3-form-layout">
      <aside class="m3-form-guide" aria-label="入力の手順">
        <ol class="m3-steps">
          ${f.steps.map(
            (s, i) =>
              html`<li ${attr('aria-current', i === f.stepIndex && 'step')}>
                <span>${i < f.stepIndex ? icon('check', { size: 18 }) : s.number}</span>${s.label}
              </li>`,
          )}
        </ol>
        <p>必須の項目を入力してください。電話番号は任意です。</p>
        <p>入力内容は保存・送信されません。</p>
      </aside>
      <section class="m3-surface m3-form-surface" aria-label="${TITLES[f.step]}">
        ${f.step === 'edit' ? edit(f, ctx) : f.step === 'confirm' ? confirm(f) : done()}
      </section>
    </div>`;
}
