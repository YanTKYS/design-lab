// 折本：新規申請フォーム。見開きの右頁に「申請者情報」、左頁に「手続きの内容」、下に葡萄色の帯で「確認事項」。
// DOM（＝Tab の順）は 申請者情報 → 手続きの内容 → 確認事項 で、右頁から左頁へ読む見た目と一致させる。
// 項目・検証・状態遷移は共通の form.js、入力部品の属性は form-control.js を使う。
import { html } from '../html.js';
import { control, describedBy, fieldId } from './form-control.js';

const CLS = { input: 'hp-input', select: 'hp-input hp-select', textarea: 'hp-input hp-textarea', checkbox: 'hp-checkbox' };
const CHAPTERS = [
  { id: 'applicant', title: '申請者情報', fields: ['name', 'kana', 'email', 'phone'] },
  { id: 'procedure', title: '手続きの内容', fields: ['type', 'date', 'body'] },
];
const req = (f) => html`<span class="hp-req ${f.required ? '' : 'is-opt'}">${f.required ? '必須' : '任意'}</span>`;
const errText = (f, id) => (f.error ? html`<p class="hp-error" id="${id}"><span aria-hidden="true">！</span>エラー：${f.error.text}</p>` : '');

function field(f, ctx) {
  const id = fieldId(ctx, 'hp', f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  return html`<div class="hp-field ${f.error ? 'is-invalid' : ''}">
    <label class="hp-label" for="${id}">${f.label}${req(f)}</label>
    ${errText(f, err)}
    ${control(f, { id, describedBy: describedBy(f.error && err, hint), cls: CLS, placeholder: f.example ?? '' })}
    <p class="hp-hint" id="${hint}">${f.hint}</p>
  </div>`;
}

const value = (f) => html`<div class="hp-field">
  <p class="hp-label">${f.label}<button type="button" class="hp-link hp-fix" data-action="form-back" data-goto-field="${f.name}">修正<span class="visually-hidden">（${f.label}）</span></button></p>
  <p class="hp-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
</div>`;

/** 見開きの1頁。章名は頁の右端に縦組みで置く（入力欄の文字は横書き）。 */
const pageOf = (ch, side, body, ctx) => html`<section class="hp-page hp-page--${side}" aria-labelledby="${ctx.uid}-hp-ch-${ch.id}">
  <div class="hp-page__body">${body}</div>
  <h3 class="hp-page__title" id="${ctx.uid}-hp-ch-${ch.id}">${ch.title}</h3>
</section>`;

function book(form, ctx, render) {
  const by = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  const [applicant, procedure] = CHAPTERS;
  const agree = by.agree;
  const id = fieldId(ctx, 'hp', 'agree');
  return html`<div class="hp-book">
      ${pageOf(applicant, 'right', applicant.fields.map((n) => render(by[n], ctx)), ctx)}
      ${pageOf(procedure, 'left', procedure.fields.map((n) => render(by[n], ctx)), ctx)}
    </div>
    <section class="hp-band ${agree.error ? 'is-invalid' : ''}" aria-labelledby="${ctx.uid}-hp-ch-consent">
      <h3 class="hp-band__title" id="${ctx.uid}-hp-ch-consent">確認事項</h3>
      <div class="hp-band__body">
        ${form.step === 'edit'
          ? html`<p class="hp-label">${agree.label}${req(agree)}</p>
              ${errText(agree, `${id}-error`)}
              <div class="hp-check">${control(agree, { id, describedBy: describedBy(agree.error && `${id}-error`), cls: CLS })}<label for="${id}">${agree.checkLabel}</label></div>`
          : html`<p class="hp-label">${agree.label}<button type="button" class="hp-link hp-fix" data-action="form-back" data-goto-field="agree">修正<span class="visually-hidden">（${agree.label}）</span></button></p>
              <p class="hp-value">${agree.display}</p>`}
      </div>
    </section>`;
}

function errors(form, ctx) {
  if (!form.errorCount) return '';
  return html`<div class="hp-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="${ctx.uid}-hp-errors">
    <h3 id="${ctx.uid}-hp-errors">入力エラーが${form.errorCount}件あります</h3>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${form.errorList.map((e) => html`<li><button type="button" class="hp-link" data-action="focus-field" data-goto-field="${e.name}">${e.label}</button>　${e.text}</li>`)}</ul>
  </div>`;
}

const toList = (label, cls) => html`<button type="button" class="${cls}" data-action="nav" data-target="applications">${label}</button>`;

export function formPage(model, ctx) {
  const form = model.form;
  if (form.step === 'edit') {
    return html`${errors(form, ctx)}
      <form class="hp-form" data-form="entry" novalidate aria-label="新規申請フォーム">
        ${book(form, ctx, field)}
        <div class="hp-actions">${toList('← 申請一覧に戻る', 'hp-link hp-back')}<span class="hp-demo">デモのため、入力内容は送信・保存しません。</span><button type="submit" class="hp-btn">確認へ<span aria-hidden="true">→</span></button></div>
      </form>`;
  }
  if (form.step === 'confirm') {
    return html`<p class="hp-lead">入力内容を確認してください。「修正」を選ぶと、値を保ったままその欄へ戻ります。</p>
      ${book(form, ctx, value)}
      <div class="hp-actions"><button type="button" class="hp-btn hp-btn--ghost" data-action="form-back">入力に戻る</button><button type="button" class="hp-btn" data-action="form-confirm">申請する<span aria-hidden="true">→</span></button></div>`;
  }
  return html`<div class="hp-book hp-book--single"><section class="hp-page hp-page--right" aria-labelledby="${ctx.uid}-hp-ch-done">
      <div class="hp-page__body"><p class="hp-done">申請の入力が完了しました</p>
        <p class="hp-hint">デモのため、入力内容は送信・保存されず、受付番号も発行されません。</p></div>
      <h3 class="hp-page__title" id="${ctx.uid}-hp-ch-done">受付</h3></section></div>
    <div class="hp-actions"><button type="button" class="hp-btn hp-btn--ghost" data-action="form-restart">続けて入力する</button>${toList(html`申請一覧へ<span aria-hidden="true">→</span>`, 'hp-btn')}</div>`;
}
