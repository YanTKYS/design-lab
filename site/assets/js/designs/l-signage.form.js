// 標示盤：新規申請フォーム（改良した L フォーム。docs/l-form-study/）。
// 左の列に現在の手順（琥珀の地にドット文字）と、琥珀の縦の罫から枝分かれした章名。右の列に入力欄。
// 下段で「次の手順」と、そこへ進む操作を点線でつなぐ。DOM（＝Tab の順）は 表題→（エラー）→章→下段 で、見た目と同じ。
// 項目・検証・状態遷移は共通の form.js、入力部品の属性は form-control.js を使う。ドット文字は装飾で、手順は文字でも伝える。
import { html } from '../html.js';
import { control, describedBy, fieldId } from './form-control.js';
import { dots } from './l-signage.js';

const CLS = { input: 'ls-input', select: 'ls-input ls-select', textarea: 'ls-input ls-textarea', checkbox: 'ls-checkbox' };
const WIDE = new Set(['body', 'agree']); // 2列の中で全幅を使う項目
const CHAPTERS = [
  { id: 'applicant', title: '申請者情報', fields: ['name', 'kana', 'email', 'phone'] },
  { id: 'procedure', title: '手続きの内容', fields: ['type', 'date', 'body'] },
  { id: 'consent', title: '確認事項', fields: ['agree'] },
];
const TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '申請の入力が完了しました' };

const req = (f) => (f.required ? html`<span class="ls-req">必須</span>` : html`<span class="ls-opt">任意</span>`);
const errorText = (f, id) =>
  f.error ? html`<p class="ls-field-error" id="${id}"><span class="ls-field-error__mark" aria-hidden="true">!</span><span><strong>エラー</strong>　${f.error.text}</span></p>` : '';

function field(f, ctx) {
  const id = fieldId(ctx, 'ls', f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  const cell = `ls-cell ${WIDE.has(f.name) ? 'ls-cell--wide' : ''} ${f.error ? 'is-invalid' : ''}`;
  if (f.control === 'checkbox') {
    return html`<div class="${cell}">
      <p class="ls-cell__head"><span class="ls-label">${f.label}</span>${req(f)}</p>
      <div class="ls-check">${control(f, { id, describedBy: describedBy(f.error && err), cls: CLS })}<label for="${id}">${f.checkLabel}</label></div>
      ${errorText(f, err)}
    </div>`;
  }
  return html`<div class="${cell}">
    <p class="ls-cell__head"><label class="ls-label" for="${id}">${f.label}</label>${req(f)}</p>
    ${control(f, { id, describedBy: describedBy(f.error && err, hint), cls: CLS, placeholder: f.example ?? '' })}
    ${errorText(f, err)}
    <p class="ls-hint" id="${hint}">${f.hint}</p>
  </div>`;
}

const value = (f) => html`<div class="ls-cell ${WIDE.has(f.name) ? 'ls-cell--wide' : ''}">
  <p class="ls-cell__head"><span class="ls-label">${f.label}</span>
    <button type="button" class="ll-link ls-fix" data-action="form-back" data-goto-field="${f.name}">修正<span class="visually-hidden">（${f.label}）</span></button></p>
  <p class="ls-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
</div>`;

/** 左の列（手順の罫から枝分かれした章名）と、右の列（その章の中身）を1段にする。 */
const chapterRow = (ch, body, ctx, extra = '') => html`<section class="ls-row ls-chapter" aria-labelledby="${ctx.uid}-ls-ch-${ch.id}">
  <div class="ls-rail"><h3 class="ls-chapter__title" id="${ctx.uid}-ls-ch-${ch.id}">${ch.title}</h3>${extra}</div>
  <div class="ls-cells">${body}</div>
</section>`;

/** 表題の段：左に現在の手順（ドット文字は装飾、手順は文字でも）、右に画面名と一覧へ戻る操作。 */
function head(form) {
  const cur = form.steps.find((s) => s.current);
  return html`<div class="ls-row ls-head">
    <div class="ls-now">${dots(cur.number, 'l-dots ls-now__dots')}<span class="ls-now__label">${cur.label}</span><span class="ls-now__tag">現在</span>
      <span class="visually-hidden">（手順 ${cur.number} / ${form.steps.length}）</span></div>
    <div class="ls-titlebar"><h2 class="ls-title" tabindex="-1" data-focus="heading">${TITLES[form.step]}</h2>
      <button type="button" class="ll-link ls-back" data-action="nav" data-target="applications">← 申請一覧に戻る</button></div>
  </div>`;
}

/** 下段：左に「次の手順」（とほかの手順）、右にそこへ進む操作。点線の罫で両者をつなぐ。 */
function foot(form, ctx, buttons) {
  const next = form.steps[form.stepIndex + 1];
  return html`<div class="ls-row ls-foot">
    <ol class="ls-next" aria-label="ほかの手順">
      ${form.steps
        .filter((s) => !s.current)
        .map(
          (s) => html`<li class="ls-next__item ${s === next ? 'is-next' : ''} ${s.done ? 'is-done' : ''}" id="${ctx.uid}-ls-step-${s.number}">
            ${dots(s.number, 'l-dots ls-next__dots')}<span>${s.label}</span>${s.done ? html`<span class="ls-next__done">済</span>` : ''}${s === next ? html`<span class="visually-hidden">（次の手順）</span>` : ''}
          </li>`,
        )}
    </ol>
    <div class="ls-actions">${buttons}</div>
  </div>`;
}

function errorRow(form, ctx) {
  if (!form.errorCount) return '';
  return html`<div class="ls-row ls-alert">
    <div class="ls-rail"><p class="ls-alert__tag"><span aria-hidden="true">!</span>エラー</p></div>
    <div class="ls-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="${ctx.uid}-ls-errors">
      <h3 id="${ctx.uid}-ls-errors">入力エラーが${form.errorCount}件あります</h3>
      <p>項目名を選ぶと、その欄へ移動します。</p>
      <ul>${form.errorList.map((e) => html`<li><button type="button" class="ll-link" data-action="focus-field" data-goto-field="${e.name}">${e.label}</button>：${e.text}</li>`)}</ul>
    </div>
  </div>`;
}

const connector = html`<span class="ls-connector" aria-hidden="true"></span>`;

export function formPage(model, ctx) {
  const form = model.form;
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  if (form.step === 'edit') {
    return html`<form class="ls-panel" data-step="edit" data-form="entry" novalidate aria-label="新規申請フォーム">
      ${head(form)} ${errorRow(form, ctx)}
      ${CHAPTERS.map((ch) => {
        const n = ch.fields.filter((name) => by[name].error).length;
        return chapterRow(ch, ch.fields.map((name) => field(by[name], ctx)), ctx, n ? html`<p class="ls-chapter__err">エラー ${n}件</p>` : '');
      })}
      ${foot(form, ctx, html`<p class="ls-demo">デモのため、入力内容は送信・保存しません。</p>${connector}<button type="submit" class="ls-btn ls-btn--primary" aria-describedby="${ctx.uid}-ls-step-2">確認へ<span class="ls-btn__arrow" aria-hidden="true">→</span></button>`)}
    </form>`;
  }
  if (form.step === 'confirm') {
    return html`<div class="ls-panel" data-step="confirm">
      ${head(form)}
      <div class="ls-row ls-lead"><div class="ls-rail"></div><p>入力内容を確認してください。「修正」を選ぶと、入力した値を保ったまま、その欄へ戻ります。</p></div>
      ${CHAPTERS.map((ch) => chapterRow(ch, ch.fields.map((name) => value(by[name])), ctx))}
      ${foot(form, ctx, html`<button type="button" class="ls-btn ls-btn--ghost" data-action="form-back">入力に戻る</button>${connector}<button type="button" class="ls-btn ls-btn--primary" data-action="form-confirm" aria-describedby="${ctx.uid}-ls-step-3">申請する<span class="ls-btn__arrow" aria-hidden="true">→</span></button>`)}
    </div>`;
  }
  return html`<div class="ls-panel" data-step="done">
    ${head(form)}
    ${chapterRow(
      { id: 'result', title: '受付について' },
      html`<div class="ls-cell ls-cell--wide"><p class="ls-done">申請の入力が完了しました</p>
        <p class="ls-hint">デモのため、入力内容は送信・保存されず、受付番号も発行されません。</p></div>`,
      ctx,
    )}
    ${foot(form, ctx, html`<button type="button" class="ls-btn ls-btn--ghost" data-action="form-restart">続けて入力する</button>${connector}<button type="button" class="ls-btn ls-btn--primary" data-action="nav" data-target="applications">申請一覧へ<span class="ls-btn__arrow" aria-hidden="true">→</span></button>`)}
  </div>`;
}
