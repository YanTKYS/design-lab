// J「二色刷り」（仮称）新規申請フォームの独立試作。視覚の基準は docs/form-comparison/images/j-form-1280.png。
// 青と蛍光ピンクの2色。ピンク（版ずれ・網点）は飾りに限り、エラーや状態には使わない（エラーは青の反転札と太枠）。
// 状態・イベントは shared/form-poc.js、項目と検証は form.js。

import { html } from '../../assets/js/html.js';
import { control, describedBy } from '../../assets/js/designs/form-control.js';
import { CHAPTERS, byName, startFormPoc } from '../shared/form-poc.js';

const CLS = { input: 'jr-input', select: 'jr-input jr-select', textarea: 'jr-input jr-textarea', checkbox: 'jr-checkbox' };
const WIDE = new Set(['body']);
const fid = (name) => `jr-f-${name}`;
const req = (f) => html`<span class="jr-req ${f.required ? '' : 'is-opt'}">${f.required ? '必須' : '任意'}</span>`;
const errText = (f, id) => (f.error ? html`<p class="jr-error" id="${id}"><span class="jr-error__tag">エラー</span>${f.error.text}</p>` : '');

function field(f) {
  const id = fid(f.name);
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
  <p class="jr-label">${f.label}<button type="button" class="jr-link jr-fix" data-action="form-back" data-field-name="${f.name}">修正<span class="jr-vh">（${f.label}）</span></button></p>
  <p class="jr-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
</div>`;

function consent(model) {
  const f = byName(model).agree;
  const id = fid('agree');
  const err = `${id}-error`;
  const body =
    model.step === 'edit'
      ? html`<p class="jr-label" id="${id}-label">${f.label}${req(f)}</p>
          <div class="jr-check">${control(f, { id, describedBy: describedBy(f.error && err), cls: CLS })}<label for="${id}">${f.checkLabel}</label></div>${errText(f, err)}`
      : html`<p class="jr-label">${f.label}<button type="button" class="jr-link jr-fix" data-action="form-back" data-field-name="agree">修正<span class="jr-vh">（${f.label}）</span></button></p><p class="jr-value">${f.display}</p>`;
  return html`<section class="jr-section jr-section--consent" aria-labelledby="jr-ch-consent">
    <h2 class="jr-chapter" id="jr-ch-consent">${CHAPTERS[2].title}</h2>
    <div class="jr-consent ${f.error ? 'is-invalid' : ''}">${body}</div>
  </section>`;
}

function sections(model, render) {
  const by = byName(model);
  return html`${CHAPTERS.slice(0, 2).map(
    (ch) => html`<section class="jr-section" aria-labelledby="jr-ch-${ch.id}">
      <h2 class="jr-chapter" id="jr-ch-${ch.id}">${ch.title}</h2>
      <div class="jr-fields">${ch.fields.map((n) => render(by[n]))}</div>
    </section>`,
  )}${consent(model)}`;
}

function head(model) {
  return html`<div class="jr-head">
    <h1 class="jr-title" data-text="新規申請">新規申請</h1>
    <span class="jr-dots" aria-hidden="true"></span>
    <ol class="jr-steps" aria-label="申請の手順">
      ${model.steps.map((s) => html`<li class="${s.current ? 'is-current' : ''}" ${s.current ? html`aria-current="step"` : ''}>${s.number}　${s.label}${s.current ? html`<small>現在</small>` : s.done ? html`<small>済</small>` : ''}</li>`)}
    </ol>
  </div>`;
}

function errors(model) {
  if (!model.errorCount) return '';
  return html`<div class="jr-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="jr-err-title">
    <h2 id="jr-err-title"><span class="jr-error__tag">エラー</span>入力エラーが${model.errorCount}件あります</h2>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${model.errorList.map((e) => html`<li><button type="button" class="jr-link" data-action="focus-field" data-field-name="${e.name}">${e.label}</button>　${e.text}</li>`)}</ul>
  </div>`;
}

const tools = () => html`<div class="jr-tools" role="group" aria-label="試作用の入力データ"><span>試作用：</span>
  <button type="button" class="jr-link" data-action="sample" data-kind="valid">入力例を入れる</button>
  <button type="button" class="jr-link" data-action="sample" data-kind="invalid">エラー例を再現</button>
  <button type="button" class="jr-link" data-action="sample" data-kind="clear">クリア</button></div>`;

function view(model) {
  if (model.step === 'edit') {
    return html`${tools()}${head(model)}
      <form class="jr-form" novalidate aria-label="新規申請フォーム">
        ${errors(model)}${sections(model, field)}
        <div class="jr-actions"><a class="jr-back" href="../j-risograph-list/">← 申請一覧に戻る</a><button type="submit" class="jr-btn">確認へ<span aria-hidden="true">→</span></button></div>
      </form>`;
  }
  if (model.step === 'confirm') {
    return html`${head(model)}
      <p class="jr-lead" id="poc-sheet-title" tabindex="-1">入力内容を確認してください。「修正」を選ぶと、値を保ったままその欄へ戻ります。</p>
      ${sections(model, value)}
      <div class="jr-actions"><button type="button" class="jr-btn jr-btn--ghost" data-action="form-back">入力に戻る</button><button type="button" class="jr-btn" data-action="form-confirm">申請する（試作）<span aria-hidden="true">→</span></button></div>`;
  }
  return html`${head(model)}
    <section class="jr-section" aria-labelledby="poc-sheet-title"><h2 class="jr-chapter">受付の結果</h2>
      <div><p class="jr-done" id="poc-sheet-title" tabindex="-1">申請を受け付けました（試作）</p>
        <p class="jr-hint">これは比較用の試作です。入力内容は送信・保存されず、受付番号も発行されません。</p></div></section>
    <div class="jr-actions"><button type="button" class="jr-btn jr-btn--ghost" data-action="form-restart">新しい申請を入力する</button><a class="jr-btn" href="../j-risograph-list/">申請一覧へ<span aria-hidden="true">→</span></a></div>`;
}

startFormPoc({ app: document.getElementById('poc-app'), live: document.getElementById('poc-live'), view, title: '新規申請（二色刷り 試作）— Design Lab' });
