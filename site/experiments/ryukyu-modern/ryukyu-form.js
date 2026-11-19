// 琉球モダン・彩：新規申請フォームの表示（入力 → 確認 → 完了）。
// 項目・検証・状態遷移は共通の form.js（buildFormModel）を使い、ここでは配置と見せ方だけを決める。
// 視覚の基準は docs/ryukyu-modern-visuals/sai-form-*.png・sai-errors.png・sai-confirm.png。

import { attr, html } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { control, describedBy } from '../../assets/js/designs/form-control.js';

const CLS = { input: 'rm-input rm-input--plain', select: 'rm-select', textarea: 'rm-input rm-input--plain rm-textarea', checkbox: 'rm-checkbox' };
const SECTIONS = [
  ['申請者情報', ['name', 'kana', 'email', 'phone']],
  ['申請の内容', ['type', 'date', 'body']],
  ['確認事項', ['agree']],
];
const fieldId = (name) => `rm-f-${name}`;

function stepper(form) {
  return html`<div class="rm-band rm-steps-band">
    <p class="rm-steps__label" id="rm-steps-label">申請の手順</p>
    <ol class="rm-steps" aria-labelledby="rm-steps-label">
      ${form.steps.map(
        (s) => html`<li class="rm-steps__item ${s.current ? 'is-current' : ''} ${s.done ? 'is-done' : ''}" ${attr('aria-current', s.current && 'step')}>
          <span class="rm-steps__mark" aria-hidden="true">${s.done ? icon('check', { size: 14, stroke: 2.5 }) : s.number}</span>
          <span class="rm-steps__text">${s.label}<span class="rm-vh">（${s.done ? '完了' : s.current ? '現在の手順' : '未着手'}）</span></span>
        </li>`,
      )}
    </ol>
    <p class="rm-steps__count">ステップ ${form.stepIndex + 1} / ${form.steps.length}</p>
  </div>`;
}

const requirement = (f) => html`<span class="rm-req ${f.required ? '' : 'rm-req--optional'}">${f.required ? '必須' : '任意'}</span>`;

function errorText(f, id) {
  return f.error ? html`<p class="rm-field__error" id="${id}">${icon('alert', { size: 16, stroke: 2.25 })}<span><strong>エラー</strong>　${f.error.text}</span></p>` : '';
}

function field(f) {
  const id = fieldId(f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  const wide = f.name === 'body' || f.name === 'agree';
  if (f.control === 'checkbox') {
    return html`<div class="rm-field rm-field--wide ${f.error ? 'is-invalid' : ''}">
      <p class="rm-field__label">${f.label}${requirement(f)}</p>
      <div class="rm-check">
        ${control(f, { id, describedBy: describedBy(f.error && err), cls: CLS })}<label for="${id}">${f.checkLabel}</label>
      </div>
      ${errorText(f, err)}
    </div>`;
  }
  return html`<div class="rm-field ${wide ? 'rm-field--wide' : ''} ${f.error ? 'is-invalid' : ''}">
    <label class="rm-field__label" for="${id}">${f.label}${requirement(f)}</label>
    <p class="rm-field__hint" id="${hint}">${f.hint}</p>
    ${control(f, { id, describedBy: describedBy(hint, f.error && err), cls: CLS, placeholder: f.example ?? '' })}
    ${errorText(f, err)}
  </div>`;
}

function errorSummary(form) {
  if (!form.errorCount) return '';
  return html`<div class="rm-error-summary" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="rm-error-title">
    <h2 class="rm-error-summary__title" id="rm-error-title">${icon('alert', { size: 20, stroke: 2.25 })}入力エラーが${form.errorCount}件あります</h2>
    <p>次の項目を選んで、入力内容を修正してください。</p>
    <ul class="rm-error-summary__list">
      ${form.errorList.map(
        (e) => html`<li><button type="button" class="rm-link-button" data-action="focus-field" data-goto-field="${e.name}">${e.label}</button></li>`,
      )}
    </ul>
  </div>`;
}

function editPage(form) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`${errorSummary(form)}
    <form class="rm-form" data-form="entry" novalidate aria-label="新規申請フォーム">
      ${SECTIONS.map(
        ([title, names], i) => html`<section class="rm-fieldset" aria-labelledby="rm-sec-${i}">
          <h2 class="rm-fieldset__title" id="rm-sec-${i}">${title}</h2>
          <div class="rm-fieldset__body">${names.map((n) => field(by[n]))}</div>
        </section>`,
      )}
      <div class="rm-form-actions">
        <p class="rm-form-actions__note">この試作では入力内容を送信・保存しません。</p>
        <button type="submit" class="rm-btn rm-btn--primary">確認へ${icon('chevronRight', { size: 16, stroke: 2.25 })}</button>
      </div>
    </form>`;
}

function confirmPage(form) {
  return html`<div class="rm-sheet">
    <h2 class="rm-sheet__title" tabindex="-1">入力内容の確認</h2>
    <p class="rm-sheet__lead">修正する項目を選ぶと、入力した値を保って戻れます。</p>
    <table class="rm-confirm">
      <tbody>
        ${form.fields.map(
          (f) => html`<tr>
            <th scope="row">${f.label}</th>
            <td class="rm-confirm__value">${f.display}</td>
            <td class="rm-confirm__edit"><button type="button" class="rm-link-button" data-action="form-back" data-goto-field="${f.name}">修正<span class="rm-vh">（${f.label}）</span></button></td>
          </tr>`,
        )}
      </tbody>
    </table>
    <div class="rm-form-actions">
      <button type="button" class="rm-btn rm-btn--secondary" data-action="form-back">入力に戻る</button>
      <button type="button" class="rm-btn rm-btn--primary" data-action="form-confirm">申請する</button>
    </div>
  </div>`;
}

function donePage() {
  return html`<div class="rm-sheet">
    <h2 class="rm-sheet__title" tabindex="-1">${icon('checkCircle', { size: 24, stroke: 2 })}申請が完了しました</h2>
    <p class="rm-sheet__lead">これは比較用の試作です。入力内容は送信・保存されず、受付番号も発行されません。</p>
    <div class="rm-form-actions">
      <button type="button" class="rm-btn rm-btn--secondary" data-action="form-restart">続けて入力する</button>
      <button type="button" class="rm-btn rm-btn--primary" data-action="go" data-screen="list">申請一覧へ</button>
    </div>
  </div>`;
}

/** 試作だけの操作（正常例・エラー例・クリア）。画面の操作とは分けて控えめに置く。 */
function sampleTools() {
  return html`<div class="rm-tools" role="group" aria-label="試作用の入力データ">
    <span class="rm-tools__label">試作用：</span>
    <button type="button" class="rm-link-button" data-action="form-sample" data-kind="valid">入力例を入れる</button>
    <button type="button" class="rm-link-button" data-action="form-sample" data-kind="invalid">エラー例を再現</button>
    <button type="button" class="rm-link-button" data-action="form-sample" data-kind="clear">クリア</button>
  </div>`;
}

export function formView(form) {
  return html`${form.step === 'edit' ? sampleTools() : ''} ${stepper(form)}
    ${form.step === 'edit' ? editPage(form) : form.step === 'confirm' ? confirmPage(form) : donePage()}`;
}
