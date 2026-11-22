// H′「折本」（仮称）新規申請フォームの独立試作。視覚の基準は docs/form-comparison/images/h-prime-form-1280.png。
// 見開きの右頁に「申請者情報」、左頁に「手続きの内容」。DOM（＝Tab 順）は 申請者情報 → 手続きの内容 で、
// 右頁から左頁へ読む見た目の順と一致させる。状態・イベントは shared/form-poc.js、項目と検証は form.js。

import { html } from '../../assets/js/html.js';
import { control, describedBy } from '../../assets/js/designs/form-control.js';
import { CHAPTERS, byName, startFormPoc } from '../shared/form-poc.js';

const CLS = { input: 'hp-input', select: 'hp-input hp-select', textarea: 'hp-input hp-textarea', checkbox: 'hp-checkbox' };
const fid = (name) => `hp-f-${name}`;
const req = (f) => html`<span class="hp-req ${f.required ? '' : 'is-opt'}">${f.required ? '必須' : '任意'}</span>`;
const errText = (f, id) => (f.error ? html`<p class="hp-error" id="${id}"><span aria-hidden="true">！</span>エラー：${f.error.text}</p>` : '');

function field(f) {
  const id = fid(f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  return html`<div class="hp-field ${f.error ? 'is-invalid' : ''}">
    <label class="hp-label" for="${id}">${f.label}${req(f)}</label>
    ${errText(f, err)}
    ${control(f, { id, describedBy: describedBy(err && f.error ? err : '', hint), cls: CLS, placeholder: f.example ?? '' })}
    <p class="hp-hint" id="${hint}">${f.hint}</p>
  </div>`;
}

const value = (f) => html`<div class="hp-field">
  <p class="hp-label">${f.label}<button type="button" class="hp-link hp-fix" data-action="form-back" data-field-name="${f.name}">修正<span class="hp-vh">（${f.label}）</span></button></p>
  <p class="hp-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
</div>`;

function steps(model) {
  return html`<ol class="hp-steps" aria-label="申請の手順">
    ${model.steps.map(
      (s) => html`<li class="${s.current ? 'is-current' : ''}" ${s.current ? html`aria-current="step"` : ''}><span class="hp-steps__n">${s.number}</span>${s.label}${s.current ? html`<small>現在</small>` : s.done ? html`<small>済</small>` : ''}</li>`,
    )}
  </ol>`;
}

/** 見開きの1頁。章名は頁の右端に縦組みで置く（入力欄の文字は横書き）。 */
const pageOf = (ch, side, body) => html`<section class="hp-page hp-page--${side}" aria-labelledby="hp-ch-${ch.id}">
  <div class="hp-page__body">${body}</div>
  <h2 class="hp-page__title" id="hp-ch-${ch.id}">${ch.title}</h2>
</section>`;

function book(model, render) {
  const by = byName(model);
  const [applicant, procedure, consent] = CHAPTERS;
  const agree = by.agree;
  return html`<div class="hp-book">
      ${pageOf(applicant, 'right', applicant.fields.map((n) => render(by[n])))}
      ${pageOf(procedure, 'left', procedure.fields.map((n) => render(by[n])))}
    </div>
    <section class="hp-band ${agree.error ? 'is-invalid' : ''}" aria-labelledby="hp-ch-consent">
      <h2 class="hp-band__title" id="hp-ch-consent">${consent.title}</h2>
      <div class="hp-band__body">
        ${model.step === 'edit'
          ? html`<p class="hp-label" id="${fid('agree')}-label">${agree.label}${req(agree)}</p>
              ${errText(agree, `${fid('agree')}-error`)}
              <div class="hp-check">${control(agree, { id: fid('agree'), describedBy: describedBy(agree.error && `${fid('agree')}-error`), cls: CLS })}<label for="${fid('agree')}">${agree.checkLabel}</label></div>`
          : html`<p class="hp-label">${agree.label}<button type="button" class="hp-link hp-fix" data-action="form-back" data-field-name="agree">修正<span class="hp-vh">（${agree.label}）</span></button></p>
              <p class="hp-value">${agree.display}</p>`}
      </div>
    </section>`;
}

function errors(model) {
  if (!model.errorCount) return '';
  return html`<div class="hp-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="hp-err-title">
    <h2 id="hp-err-title">入力エラーが${model.errorCount}件あります</h2>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${model.errorList.map((e) => html`<li><button type="button" class="hp-link" data-action="focus-field" data-field-name="${e.name}">${e.label}</button>　${e.text}</li>`)}</ul>
  </div>`;
}

const tools = () => html`<div class="hp-tools" role="group" aria-label="試作用の入力データ"><span>試作用：</span>
  <button type="button" class="hp-link" data-action="sample" data-kind="valid">入力例を入れる</button>
  <button type="button" class="hp-link" data-action="sample" data-kind="invalid">エラー例を再現</button>
  <button type="button" class="hp-link" data-action="sample" data-kind="clear">クリア</button></div>`;

const head = (model) => html`<div class="hp-head"><h1 class="hp-title">新規申請</h1>${steps(model)}</div>`;

function view(model) {
  if (model.step === 'edit') {
    return html`${tools()}${head(model)}
      <form class="hp-form" novalidate aria-labelledby="hp-title-form">
        <span class="hp-vh" id="hp-title-form">新規申請フォーム</span>
        ${errors(model)}${book(model, field)}
        <div class="hp-actions"><a class="hp-back" href="../h-prime-list/">← 申請一覧に戻る</a><button type="submit" class="hp-btn">確認へ<span aria-hidden="true">→</span></button></div>
      </form>`;
  }
  if (model.step === 'confirm') {
    return html`${head(model)}
      <p class="hp-lead" id="poc-sheet-title" tabindex="-1">入力内容を確認してください。「修正」を選ぶと、値を保ったままその欄へ戻ります。</p>
      ${book(model, value)}
      <div class="hp-actions"><button type="button" class="hp-btn hp-btn--ghost" data-action="form-back">入力に戻る</button><button type="button" class="hp-btn" data-action="form-confirm">申請する（試作）<span aria-hidden="true">→</span></button></div>`;
  }
  return html`${head(model)}
    <div class="hp-book hp-book--single"><section class="hp-page hp-page--right" aria-labelledby="poc-sheet-title">
      <div class="hp-page__body"><p class="hp-done" id="poc-sheet-title" tabindex="-1">申請を受け付けました（試作）</p>
        <p class="hp-hint">これは比較用の試作です。入力内容は送信・保存されず、受付番号も発行されません。</p></div>
      <p class="hp-page__title" aria-hidden="true">受付</p></section></div>
    <div class="hp-actions"><button type="button" class="hp-btn hp-btn--ghost" data-action="form-restart">新しい申請を入力する</button><a class="hp-btn" href="../h-prime-list/">申請一覧へ<span aria-hidden="true">→</span></a></div>`;
}

startFormPoc({ app: document.getElementById('poc-app'), live: document.getElementById('poc-live'), view, title: '新規申請（折本 試作）— Design Lab' });
