// 二色刷り：新規申請フォーム。左に章名（青・網点の下線）、右に2列の入力欄。章の境は青の点線。
// ピンク（版ずれ・網点）は飾りに限り、エラーには使わない（エラーは青の反転札・二重罫の太枠・文言）。
// 項目・検証・状態遷移は共通の form.js、入力部品の属性は form-control.js を使う。
import { html } from '../html.js';
import { control, describedBy, fieldId } from './form-control.js';

const CLS = { input: 'jr-input', select: 'jr-input jr-select', textarea: 'jr-input jr-textarea', checkbox: 'jr-checkbox' };
const WIDE = new Set(['body']);
const CHAPTERS = [
  { id: 'applicant', title: '申請者情報', fields: ['name', 'kana', 'email', 'phone'] },
  { id: 'procedure', title: '手続きの内容', fields: ['type', 'date', 'body'] },
];
const req = (f) => html`<span class="jr-req ${f.required ? '' : 'is-opt'}">${f.required ? '必須' : '任意'}</span>`;
const errText = (f, id) => (f.error ? html`<p class="jr-error" id="${id}"><span class="jr-error__tag">エラー</span>${f.error.text}</p>` : '');

function field(f, ctx) {
  const id = fieldId(ctx, 'jr', f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  return html`<div class="jr-field ${WIDE.has(f.name) ? 'is-wide' : ''} ${f.error ? 'is-invalid' : ''}">
    <label class="jr-label" for="${id}">${f.label}${req(f)}</label>
    ${control(f, { id, describedBy: describedBy(f.error && err, hint), cls: CLS, placeholder: f.example ?? '' })}
    ${errText(f, err)}
    <p class="jr-hint" id="${hint}">${f.hint}</p>
  </div>`;
}

const value = (f) => html`<div class="jr-field ${WIDE.has(f.name) ? 'is-wide' : ''}">
  <p class="jr-label">${f.label}<button type="button" class="jr-link jr-fix" data-action="form-back" data-goto-field="${f.name}">修正<span class="visually-hidden">（${f.label}）</span></button></p>
  <p class="jr-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
</div>`;

function consent(form, ctx) {
  const f = form.fields.find((x) => x.name === 'agree');
  const id = fieldId(ctx, 'jr', 'agree');
  const err = `${id}-error`;
  const body =
    form.step === 'edit'
      ? html`<p class="jr-label">${f.label}${req(f)}</p>
          <div class="jr-check">${control(f, { id, describedBy: describedBy(f.error && err), cls: CLS })}<label for="${id}">${f.checkLabel}</label></div>${errText(f, err)}`
      : html`<p class="jr-label">${f.label}<button type="button" class="jr-link jr-fix" data-action="form-back" data-goto-field="agree">修正<span class="visually-hidden">（${f.label}）</span></button></p><p class="jr-value">${f.display}</p>`;
  return html`<section class="jr-section jr-section--consent" aria-labelledby="${ctx.uid}-jr-ch-consent">
    <h3 class="jr-chapter" id="${ctx.uid}-jr-ch-consent">確認事項</h3>
    <div class="jr-consent ${f.error ? 'is-invalid' : ''}">${body}</div>
  </section>`;
}

function sections(form, ctx, render) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`${CHAPTERS.map(
    (ch) => html`<section class="jr-section" aria-labelledby="${ctx.uid}-jr-ch-${ch.id}">
      <h3 class="jr-chapter" id="${ctx.uid}-jr-ch-${ch.id}">${ch.title}</h3>
      <div class="jr-fields">${ch.fields.map((n) => render(by[n], ctx))}</div>
    </section>`,
  )}${consent(form, ctx)}`;
}

function errors(form, ctx) {
  if (!form.errorCount) return '';
  return html`<div class="jr-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="${ctx.uid}-jr-errors">
    <h3 id="${ctx.uid}-jr-errors"><span class="jr-error__tag">エラー</span>入力エラーが${form.errorCount}件あります</h3>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${form.errorList.map((e) => html`<li><button type="button" class="jr-link" data-action="focus-field" data-goto-field="${e.name}">${e.label}</button>　${e.text}</li>`)}</ul>
  </div>`;
}

const toList = (label, cls) => html`<button type="button" class="${cls}" data-action="nav" data-target="applications">${label}</button>`;

export function formPage(model, ctx) {
  const form = model.form;
  if (form.step === 'edit') {
    return html`${errors(form, ctx)}
      <form class="jr-form" data-form="entry" novalidate aria-label="新規申請フォーム">
        ${sections(form, ctx, field)}
        <div class="jr-actions">${toList('← 申請一覧に戻る', 'jr-link jr-back')}<span class="jr-demo">デモのため、入力内容は送信・保存しません。</span><button type="submit" class="jr-btn">確認へ<span aria-hidden="true">→</span></button></div>
      </form>`;
  }
  if (form.step === 'confirm') {
    return html`<p class="jr-lead">入力内容を確認してください。「修正」を選ぶと、値を保ったままその欄へ戻ります。</p>
      ${sections(form, ctx, value)}
      <div class="jr-actions"><button type="button" class="jr-btn jr-btn--ghost" data-action="form-back">入力に戻る</button><button type="button" class="jr-btn" data-action="form-confirm">申請する<span aria-hidden="true">→</span></button></div>`;
  }
  return html`<section class="jr-section" aria-labelledby="${ctx.uid}-jr-ch-done"><h3 class="jr-chapter" id="${ctx.uid}-jr-ch-done">受付について</h3>
      <div><p class="jr-done">申請の入力が完了しました</p>
        <p class="jr-hint">デモのため、入力内容は送信・保存されず、受付番号も発行されません。</p></div></section>
    <div class="jr-actions"><button type="button" class="jr-btn jr-btn--ghost" data-action="form-restart">続けて入力する</button>${toList(html`申請一覧へ<span aria-hidden="true">→</span>`, 'jr-btn')}</div>`;
}
