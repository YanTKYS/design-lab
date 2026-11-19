// 糸の交点（仮称）：新規申請フォーム。章｜項目名｜入力値の交点を拾う読み方（docs/okinawa-ui-study/thread-form-*.png）。
// 項目・検証・状態遷移は共通の form.js（buildFormModel）、入力部品の属性は form-control.js を使う。

import { attr, html } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { control, describedBy } from '../../assets/js/designs/form-control.js';
import { mark } from './thread-parts.js';

const CLS = { input: 'th-input', select: 'th-select', textarea: 'th-input th-textarea', checkbox: 'th-checkbox' };
const CHAPTERS = [
  ['申請者情報', ['name', 'kana', 'email', 'phone']],
  ['手続きの内容', ['type', 'date', 'body']],
  ['確認事項', ['agree']],
];
const fieldId = (name) => `th-f-${name}`;

function steps(form) {
  return html`<ol class="th-steps" aria-label="申請の手順（ステップ ${form.stepIndex + 1} / ${form.steps.length}）">
    ${form.steps.map(
      (s) => html`<li class="th-steps__item ${s.current ? 'is-current' : ''} ${s.done ? 'is-done' : ''}" ${attr('aria-current', s.current && 'step')}>
        <span class="th-steps__num" aria-hidden="true">${s.done ? icon('check', { size: 13, stroke: 2.5 }) : s.number}</span>${s.label}<span class="th-vh">（${s.done ? '完了' : s.current ? '現在の手順' : '未着手'}）</span>
      </li>`,
    )}
  </ol>`;
}

const req = (f) => html`<span class="th-req">${f.required ? '必須' : '任意'}</span>`;

function errorText(f, id) {
  return f.error ? html`<p class="th-field-error" id="${id}">${icon('alert', { size: 15, stroke: 2.25 })}<span><strong>エラー</strong>　${f.error.text}</span></p>` : '';
}

/** 1行：左に項目名（軸）、右に補足と入力欄。375px では項目名を入力欄の直上に戻す。 */
function row(f) {
  const id = fieldId(f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  if (f.control === 'checkbox') {
    return html`<div class="th-row ${f.error ? 'is-invalid' : ''}">
      <p class="th-row__label">${f.label}${req(f)}</p>
      <div class="th-row__value">
        <div class="th-check">${control(f, { id, describedBy: describedBy(f.error && err), cls: CLS })}<label for="${id}">${f.checkLabel}</label></div>
        ${errorText(f, err)}
      </div>
    </div>`;
  }
  return html`<div class="th-row ${f.error ? 'is-invalid' : ''}">
    <label class="th-row__label" for="${id}">${f.label}${req(f)}</label>
    <div class="th-row__value">
      <p class="th-help" id="${hint}">${f.hint}</p>
      ${control(f, { id, describedBy: describedBy(hint, f.error && err), cls: CLS, placeholder: f.example ?? '' })}
      ${errorText(f, err)}
    </div>
  </div>`;
}

function errorSummary(form) {
  if (!form.errorCount) return '';
  return html`<div class="th-error-summary" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="th-error-title">
    <h2 class="th-error-summary__title" id="th-error-title">${icon('alert', { size: 18, stroke: 2.25 })}入力エラーが${form.errorCount}件あります</h2>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${form.errorList.map((e) => html`<li><button type="button" class="th-link-button" data-action="focus-field" data-goto-field="${e.name}">${e.label}</button></li>`)}</ul>
  </div>`;
}

function edit(form) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`${errorSummary(form)}
    <form data-form="entry" novalidate aria-label="新規申請フォーム">
      ${CHAPTERS.map(
        ([title, names], i) => html`<section class="th-chapter-block" aria-labelledby="th-ch-${i}">
          <h2 class="th-chapter" id="th-ch-${i}">${mark}${title}</h2>
          <div class="th-chapter-block__rows">${names.map((n) => row(by[n]))}</div>
        </section>`,
      )}
      <div class="th-actions">
        <p class="th-muted">この試作では入力内容を送信・保存しません。</p>
        <button type="submit" class="th-btn th-btn--primary">確認へ${icon('chevronRight', { size: 16, stroke: 2.25 })}</button>
      </div>
    </form>`;
}

function confirm(form) {
  return html`<section class="th-chapter-block th-chapter-block--sheet" aria-labelledby="th-sheet-title">
    <h2 class="th-chapter th-sheet-title" id="th-sheet-title" tabindex="-1">${mark}入力内容の確認</h2>
    <div class="th-chapter-block__rows">
      <p class="th-help th-sheet-lead">修正する項目を選ぶと、入力した値を保ったまま、その欄へ戻ります。</p>
      <dl class="th-axis th-axis--confirm">
        ${form.fields.map(
          (f) => html`<div>
            <dt>${f.label}</dt>
            <dd class="th-pre">${f.display}</dd>
            <dd class="th-axis__edit"><button type="button" class="th-link-button" data-action="form-back" data-goto-field="${f.name}">修正<span class="th-vh">（${f.label}）</span></button></dd>
          </div>`,
        )}
      </dl>
    </div>
  </section>
  <div class="th-actions">
    <button type="button" class="th-btn th-btn--ghost" data-action="form-back">入力に戻る</button>
    <button type="button" class="th-btn th-btn--primary" data-action="form-confirm">申請する</button>
  </div>`;
}

function done() {
  return html`<section class="th-chapter-block th-chapter-block--sheet" aria-labelledby="th-sheet-title">
      <h2 class="th-chapter th-sheet-title" id="th-sheet-title" tabindex="-1">${mark}申請が完了しました</h2>
      <div class="th-chapter-block__rows">
        <p class="th-sheet-lead">これは比較用の試作です。入力内容は送信・保存されず、受付番号も発行されません。</p>
      </div>
    </section>
    <div class="th-actions">
      <button type="button" class="th-btn th-btn--ghost" data-action="form-restart">続けて入力する</button>
      <button type="button" class="th-btn th-btn--primary" data-action="go" data-screen="list">申請一覧へ</button>
    </div>`;
}

/** 試作だけの操作。業務の操作と区別するため、点線の枠に小さく置く。 */
const tools = () => html`<div class="th-tools" role="group" aria-label="試作用の入力データ">
  <span>試作用：</span>
  <button type="button" class="th-link-button" data-action="form-sample" data-kind="valid">入力例を入れる</button>
  <button type="button" class="th-link-button" data-action="form-sample" data-kind="invalid">エラー例を再現</button>
  <button type="button" class="th-link-button" data-action="form-sample" data-kind="clear">クリア</button>
</div>`;

export function formView(form) {
  return html`${form.step === 'edit' ? tools() : ''} ${steps(form)}
    ${form.step === 'edit' ? edit(form) : form.step === 'confirm' ? confirm(form) : done()}`;
}
