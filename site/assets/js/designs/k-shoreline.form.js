// 汀線：新規申請フォーム。章ごとに、左の淡い緑の章名の面（陸）と右の入力欄（水際の内側）を汀線の曲線で分ける。
// 曲線は章の高さに合わせて伸びる（SVG を preserveAspectRatio="none" で伸ばす。装飾なので読み上げない、ID も持たない）。
// 項目・検証・状態遷移は共通の form.js、入力部品の属性は form-control.js を使う。
import { html, raw } from '../html.js';
import { control, describedBy, fieldId } from './form-control.js';

const CLS = { input: 'ks-input', select: 'ks-input ks-select', textarea: 'ks-input ks-textarea', checkbox: 'ks-checkbox' };
const WIDE = new Set(['body', 'agree']);
const CHAPTERS = [
  { id: 'applicant', title: '申請者情報', fields: ['name', 'kana', 'email', 'phone'] },
  { id: 'procedure', title: '手続きの内容', fields: ['type', 'date', 'body'] },
  { id: 'consent', title: '確認事項', fields: ['agree'] },
];
const req = (f) => html`<span class="ks-req ${f.required ? '' : 'is-opt'}">${f.required ? '必須' : '任意'}</span>`;
const errText = (f, id) => (f.error ? html`<p class="ks-error" id="${id}"><strong>エラー</strong>　${f.error.text}</p>` : '');

const SHORE = raw(
  '<svg class="ks-shore" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="ks-shore__land" d="M0 0H44C34 30 30 62 36 100H0Z"/><path d="M46 0C36 30 32 62 38 100"/><path d="M50 0C40 30 37 62 43 100"/><path d="M55 0C46 30 43 62 49 100"/></svg>',
);

function field(f, ctx) {
  const id = fieldId(ctx, 'ks', f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  if (f.control === 'checkbox') {
    return html`<div class="ks-field is-wide ${f.error ? 'is-invalid' : ''}">
      <p class="ks-label">${f.label}${req(f)}</p>
      <div class="ks-check">${control(f, { id, describedBy: describedBy(f.error && err), cls: CLS })}<label for="${id}">${f.checkLabel}</label></div>
      ${errText(f, err)}
    </div>`;
  }
  return html`<div class="ks-field ${WIDE.has(f.name) ? 'is-wide' : ''} ${f.error ? 'is-invalid' : ''}">
    <label class="ks-label" for="${id}">${f.label}${req(f)}</label>
    ${control(f, { id, describedBy: describedBy(f.error && err, hint), cls: CLS, placeholder: f.example ?? '' })}
    ${errText(f, err)}
    <p class="ks-hint" id="${hint}">${f.hint}</p>
  </div>`;
}

const value = (f) => html`<div class="ks-field ${WIDE.has(f.name) ? 'is-wide' : ''}">
  <p class="ks-label">${f.label}<button type="button" class="kl-link ks-fix" data-action="form-back" data-goto-field="${f.name}">修正<span class="visually-hidden">（${f.label}）</span></button></p>
  <p class="ks-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
</div>`;

const chapter = (ch, body, ctx, extra = '') => html`<section class="ks-chapter ks-chapter--${ch.id}" aria-labelledby="${ctx.uid}-ks-ch-${ch.id}">
  <div class="ks-rail"><h3 class="ks-chapter__title" id="${ctx.uid}-ks-ch-${ch.id}">${ch.title}</h3>${extra}${SHORE}</div>
  <div class="ks-fields">${body}</div>
</section>`;

function panel(form, ctx, render) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  return html`<div class="ks-panel">${CHAPTERS.map((ch) => {
    const n = ch.fields.filter((name) => by[name].error).length;
    return chapter(ch, ch.fields.map((name) => render(by[name], ctx)), ctx, n ? html`<p class="ks-chapter__err">エラー ${n}件</p>` : '');
  })}</div>`;
}

function errors(form, ctx) {
  if (!form.errorCount) return '';
  return html`<div class="ks-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="${ctx.uid}-ks-errors">
    <h3 id="${ctx.uid}-ks-errors">入力エラーが${form.errorCount}件あります</h3>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${form.errorList.map((e) => html`<li><button type="button" class="kl-link" data-action="focus-field" data-goto-field="${e.name}">${e.label}</button>　${e.text}</li>`)}</ul>
  </div>`;
}

const toList = (label, cls) => html`<button type="button" class="${cls}" data-action="nav" data-target="applications">${label}</button>`;

export function formPage(model, ctx) {
  const form = model.form;
  if (form.step === 'edit') {
    return html`${errors(form, ctx)}
      <form class="ks-form" data-form="entry" novalidate aria-label="新規申請フォーム">
        ${panel(form, ctx, field)}
        <div class="ks-actions">${toList('← 申請一覧に戻る', 'kl-link ks-back')}<span class="ks-demo">デモのため、入力内容は送信・保存しません。</span><button type="submit" class="kl-btn">確認へ<span aria-hidden="true">→</span></button></div>
      </form>`;
  }
  if (form.step === 'confirm') {
    return html`<p class="ks-lead">入力内容を確認してください。「修正」を選ぶと、値を保ったままその欄へ戻ります。</p>
      ${panel(form, ctx, value)}
      <div class="ks-actions"><button type="button" class="kl-btn kl-btn--ghost" data-action="form-back">入力に戻る</button><button type="button" class="kl-btn" data-action="form-confirm">申請する<span aria-hidden="true">→</span></button></div>`;
  }
  return html`<div class="ks-panel">${chapter(
      { id: 'result', title: '受付について' },
      html`<div class="ks-field is-wide"><p class="ks-done">申請の入力が完了しました</p>
        <p class="ks-hint">デモのため、入力内容は送信・保存されず、受付番号も発行されません。</p></div>`,
      ctx,
    )}</div>
    <div class="ks-actions"><button type="button" class="kl-btn kl-btn--ghost" data-action="form-restart">続けて入力する</button>${toList(html`申請一覧へ<span aria-hidden="true">→</span>`, 'kl-btn')}</div>`;
}
