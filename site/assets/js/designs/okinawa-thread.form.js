// 糸の交点：新規申請フォーム。「章｜項目名｜入力欄」の3本の軸で、1行に1項目を読む。
// 項目・検証・状態遷移は共通の form.js、入力部品の属性は form-control.js を使う。
import { attr, html } from '../html.js';
import { icon } from '../icons.js';
import { control, describedBy, fieldId } from './form-control.js';
import { mark } from './okinawa-thread.js';

const CLS = { input: 'ot-input', select: 'ot-input ot-select', textarea: 'ot-input ot-textarea', checkbox: 'ot-checkbox' };
const CHAPTERS = [
  ['申請者情報', ['name', 'kana', 'email', 'phone']],
  ['手続きの内容', ['type', 'date', 'body']],
  ['確認事項', ['agree']],
];

function steps(form) {
  return html`<ol class="ot-steps" aria-label="申請の手順（ステップ ${form.stepIndex + 1} / ${form.steps.length}）">
    ${form.steps.map(
      (s) => html`<li class="ot-steps__item ${s.current ? 'is-current' : ''} ${s.done ? 'is-done' : ''}" ${attr('aria-current', s.current && 'step')}>
        <span class="ot-steps__num" aria-hidden="true">${s.done ? icon('check', { size: 13, stroke: 2.5 }) : s.number}</span>${s.label}<span class="visually-hidden">（${s.done ? '完了' : s.current ? '現在の手順' : '未着手'}）</span>
      </li>`,
    )}
  </ol>`;
}

const req = (f) => html`<span class="ot-req">${f.required ? '必須' : '任意'}</span>`;

const errorText = (f, id) =>
  f.error ? html`<p class="ot-field-error" id="${id}">${icon('alert', { size: 15, stroke: 2.25 })}<span><strong>エラー</strong>　${f.error.text}</span></p>` : '';

/** 1行：左に項目名（軸）、右に補足と入力欄。狭い枠では項目名を入力欄の直上に置く。 */
function row(f, ctx) {
  const id = fieldId(ctx, 'ot', f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  if (f.control === 'checkbox') {
    return html`<div class="ot-row ${f.error ? 'is-invalid' : ''}">
      <p class="ot-row__label">${f.label}${req(f)}</p>
      <div class="ot-row__value">
        <div class="ot-check">${control(f, { id, describedBy: describedBy(f.error && err), cls: CLS })}<label for="${id}">${f.checkLabel}</label></div>
        ${errorText(f, err)}
      </div>
    </div>`;
  }
  return html`<div class="ot-row ${f.error ? 'is-invalid' : ''}">
    <label class="ot-row__label" for="${id}">${f.label}${req(f)}</label>
    <div class="ot-row__value">
      <p class="ot-help" id="${hint}">${f.hint}</p>
      ${control(f, { id, describedBy: describedBy(hint, f.error && err), cls: CLS, placeholder: f.example ?? '' })}
      ${errorText(f, err)}
    </div>
  </div>`;
}

function errorSummary(form, ctx) {
  if (!form.errorCount) return '';
  return html`<div class="ot-error-summary" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="${ctx.uid}-ot-errors">
    <h3 class="ot-error-summary__title" id="${ctx.uid}-ot-errors">${icon('alert', { size: 18, stroke: 2.25 })}入力エラーが${form.errorCount}件あります</h3>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${form.errorList.map((e) => html`<li><button type="button" class="ot-link-button" data-action="focus-field" data-goto-field="${e.name}">${e.label}</button></li>`)}</ul>
  </div>`;
}

function edit(form, ctx) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`${errorSummary(form, ctx)}
    <form data-form="entry" novalidate aria-label="新規申請フォーム">
      ${CHAPTERS.map(
        ([title, names], i) => html`<section class="ot-chapter-block" aria-labelledby="${ctx.uid}-ot-ch-${i}">
          <h3 class="ot-chapter" id="${ctx.uid}-ot-ch-${i}">${mark}${title}</h3>
          <div class="ot-chapter-block__rows">${names.map((n) => row(by[n], ctx))}</div>
        </section>`,
      )}
      <div class="ot-actions">
        <p class="ot-muted">デモのため、入力内容は送信・保存しません。</p>
        <button type="submit" class="ot-btn ot-btn--primary">確認へ${icon('chevronRight', { size: 16, stroke: 2.25 })}</button>
      </div>
    </form>`;
}

function confirm(form, ctx) {
  return html`<section class="ot-chapter-block" aria-labelledby="${ctx.uid}-ot-confirm">
      <h3 class="ot-chapter" id="${ctx.uid}-ot-confirm">${mark}入力した内容</h3>
      <div class="ot-chapter-block__rows">
        <p class="ot-help ot-lead">修正する項目を選ぶと、入力した値を保ったまま、その欄へ戻ります。</p>
        <dl class="ot-axis ot-axis--confirm">
          ${form.fields.map(
            (f) => html`<div>
              <dt>${f.label}</dt>
              <dd class="ot-pre">${f.display}</dd>
              <dd class="ot-axis__edit"><button type="button" class="ot-link-button" data-action="form-back" data-goto-field="${f.name}">修正<span class="visually-hidden">（${f.label}）</span></button></dd>
            </div>`,
          )}
        </dl>
      </div>
    </section>
    <div class="ot-actions">
      <button type="button" class="ot-btn ot-btn--ghost" data-action="form-back">入力に戻る</button>
      <button type="button" class="ot-btn ot-btn--primary" data-action="form-confirm">申請する</button>
    </div>`;
}

function done(ctx) {
  return html`<section class="ot-chapter-block" aria-labelledby="${ctx.uid}-ot-done">
      <h3 class="ot-chapter" id="${ctx.uid}-ot-done">${mark}受付について</h3>
      <div class="ot-chapter-block__rows">
        <p class="ot-lead">デモのため、入力内容は送信・保存されず、受付番号も発行されません。</p>
      </div>
    </section>
    <div class="ot-actions">
      <button type="button" class="ot-btn ot-btn--ghost" data-action="form-restart">続けて入力する</button>
      <button type="button" class="ot-btn ot-btn--primary" data-action="nav" data-target="applications">申請一覧へ</button>
    </div>`;
}

export function formPage(model, ctx) {
  const f = model.form;
  return html`${steps(f)} ${f.step === 'edit' ? edit(f, ctx) : f.step === 'confirm' ? confirm(f, ctx) : done(ctx)}`;
}
