// Astryx の Form wizard（上部に固定した横向きの進行表示）と、必須を標準とするフィールドの考え方を参考にした入力フォーム。
import { attr, html } from '../html.js';
import { icon } from '../icons.js';
import { control, describedBy, fieldId } from './form-control.js';

const CLS = {
  input: 'ax-input',
  select: 'ax-input',
  textarea: 'ax-input ax-input--textarea',
  checkbox: 'ax-checkbox',
};
const TITLES = {
  edit: '新規申請',
  confirm: '入力内容の確認',
  done: '入力が完了しました',
};
const SUBS = {
  edit: '申請者の情報と申請内容を入力します。',
  confirm: '内容を確認し、修正が必要な場合は戻って編集してください。',
  done: 'デモのため、申請は送信・登録されていません。',
};

/** 必須が標準のため、必須でない項目にだけ「任意」を示す。チェックボックスは標準の対象外で、個別に「必須」を示す。 */
function field(f, ctx) {
  const id = fieldId(ctx, 'ax', f.name);
  const hint = `${id}-hint`;
  const error = `${id}-error`;
  const wide = f.name === 'body';
  const describe = describedBy(hint, f.error && error);
  const status = f.error
    ? html`<p class="ax-field__error" id="${error}">${icon('alert', { size: 16 })}<span>エラー：${f.error.text}</span></p>`
    : '';
  if (f.control === 'checkbox') {
    return html`<div class="ax-field ax-field--wide ${f.error ? 'is-invalid' : ''}">
      <p class="ax-label">${f.label}<span class="ax-required">必須</span></p>
      <p class="ax-hint" id="${hint}">${[f.hint, f.example].filter(Boolean).join(' ')}</p>
      <div class="ax-check">${control(f, { id, describedBy: describe, cls: CLS })}<label for="${id}">${f.checkLabel}</label></div>
      ${status}
    </div>`;
  }
  return html`<div class="ax-field ${wide ? 'ax-field--wide' : ''} ${f.error ? 'is-invalid' : ''}">
    <label class="ax-label" for="${id}">${f.label}${f.required ? '' : html`<span class="ax-optional">任意</span>`}</label>
    <p class="ax-hint" id="${hint}">${[f.hint, f.example].filter(Boolean).join(' ')}</p>
    ${control(f, { id, describedBy: describe, cls: CLS })}${status}
  </div>`;
}

function section(title, description, names, by, ctx) {
  const id = `${ctx.uid}-ax-sec-${names[0]}`;
  return html`<fieldset class="ax-section" aria-describedby="${id}">
    <legend>${title}</legend>
    <p class="ax-section__desc" id="${id}">${description}</p>
    <div class="ax-grid">${names.map((n) => field(by[n], ctx))}</div>
  </fieldset>`;
}

function edit(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`${form.errorCount
      ? html`<div class="ax-banner ax-banner--error" role="alert">
          ${icon('alert', { size: 18 })}
          <p><strong>${form.errorCount}件の項目を確認してください。</strong>各項目の理由を確認し、入力を修正してください。</p>
          <button type="button" class="ax-button ax-button--secondary" data-action="focus-field" data-goto-field="${form.errorList[0].name}">
            最初の項目へ
          </button>
        </div>`
      : ''}
    <p class="ax-rule">「任意」と表示のない項目は必須です。</p>
    <form data-form="entry" novalidate aria-label="新規申請フォーム">
      ${section('申請者', '申請を行う方の氏名と連絡先です。', ['name', 'kana', 'email', 'phone'], by, ctx)}
      ${section('申請内容', '申請の種類と内容を選んで入力します。', ['type', 'date', 'body'], by, ctx)}
      ${section('確認事項', '送信前に内容を確認します。', ['agree'], by, ctx)}
      <div class="ax-actions">
        <button type="submit" class="ax-button ax-button--primary ax-button--lg">確認へ${icon('arrowRight', { size: 18 })}</button
        ><button type="button" class="ax-button ax-button--ghost ax-button--lg" data-action="nav" data-target="applications">キャンセル</button>
      </div>
    </form>`;
}

function confirm(form) {
  return html`<dl class="ax-meta ax-meta--stack">
      ${form.fields.map(
        (f) =>
          html`<div>
            <dt>${f.label}</dt>
            <dd>${f.display}</dd>
          </div>`,
      )}
    </dl>
    <div class="ax-actions">
      <button type="button" class="ax-button ax-button--primary ax-button--lg" data-action="form-confirm">申請する</button
      ><button type="button" class="ax-button ax-button--secondary ax-button--lg" data-action="form-back">戻って修正</button>
    </div>`;
}

function done() {
  return html`<div class="ax-complete">
      ${icon('checkCircle', { size: 40 })}
      <h3>入力を確認しました</h3>
      <p>デモのため、申請は送信・登録されていません。</p>
    </div>
    <div class="ax-actions ax-actions--center">
      <button type="button" class="ax-button ax-button--primary ax-button--lg" data-action="nav" data-target="applications">申請一覧へ</button
      ><button type="button" class="ax-button ax-button--secondary ax-button--lg" data-action="form-restart">続けて入力する</button>
    </div>`;
}

export function formPage(model, ctx) {
  const f = model.form;
  return html`<div class="ax-masthead">
      <div>
        <h2 tabindex="-1" data-focus="heading">${TITLES[f.step]}</h2>
        <p class="ax-sub">${SUBS[f.step]}</p>
      </div>
    </div>
    <ol class="ax-stepper" aria-label="入力の手順（${f.steps.length}段階）">
      ${f.steps.map(
        (s, i) =>
          html`<li class="${i < f.stepIndex ? 'is-done' : ''}" ${attr('aria-current', i === f.stepIndex && 'step')}>
            <span class="ax-stepper__mark">${i < f.stepIndex ? icon('check', { size: 14, stroke: 2.25 }) : s.number}</span>
            <span class="ax-stepper__label">${s.label}</span>
          </li>`,
      )}
    </ol>
    <section class="ax-card ax-form-card" aria-label="${TITLES[f.step]}">
      ${f.step === 'edit' ? edit(f, ctx) : f.step === 'confirm' ? confirm(f) : done()}
    </section>`;
}
