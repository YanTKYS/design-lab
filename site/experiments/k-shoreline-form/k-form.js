// K「汀線」（仮称）新規申請フォームの独立試作。視覚の基準は docs/form-comparison/images/k-form-1280.png。
// 淡い緑の面と、章名の列の右端の曲線（汀線）で入力項目のまとまりを示す。記号的なアクセントは足さない。
// 状態・イベントは shared/form-poc.js、項目と検証は form.js。

import { html } from '../../assets/js/html.js';
import { control, describedBy } from '../../assets/js/designs/form-control.js';
import { CHAPTERS, byName, startFormPoc } from '../shared/form-poc.js';

const CLS = { input: 'ks-input', select: 'ks-input ks-select', textarea: 'ks-input ks-textarea', checkbox: 'ks-checkbox' };
const WIDE = new Set(['body', 'agree']);
const fid = (name) => `ks-f-${name}`;
const req = (f) => html`<span class="ks-req ${f.required ? '' : 'is-opt'}">${f.required ? '必須' : '任意'}</span>`;
const errText = (f, id) => (f.error ? html`<p class="ks-error" id="${id}"><strong>エラー</strong>　${f.error.text}</p>` : '');

/** 章名の列の右端に引く汀線。面の形と3本の細い線。高さに合わせて伸びる（読み上げない） */
const shore = html`<svg class="ks-shore" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path class="ks-shore__land" d="M0 0H44C34 30 30 62 36 100H0Z" />
  <path d="M46 0C36 30 32 62 38 100" /><path d="M50 0C40 30 37 62 43 100" /><path d="M55 0C46 30 43 62 49 100" />
</svg>`;

function field(f) {
  const id = fid(f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  if (f.control === 'checkbox') {
    return html`<div class="ks-field is-wide ${f.error ? 'is-invalid' : ''}">
      <p class="ks-label" id="${id}-label">${f.label}${req(f)}</p>
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
  <p class="ks-label">${f.label}<button type="button" class="ks-link ks-fix" data-action="form-back" data-field-name="${f.name}">修正<span class="ks-vh">（${f.label}）</span></button></p>
  <p class="ks-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
</div>`;

const chapter = (ch, body, extra = '') => html`<section class="ks-chapter ks-chapter--${ch.id}" aria-labelledby="ks-ch-${ch.id}">
  <div class="ks-rail"><h2 class="ks-chapter__title" id="ks-ch-${ch.id}">${ch.title}</h2>${extra}${shore}</div>
  <div class="ks-fields">${body}</div>
</section>`;

function panel(model, render) {
  const by = byName(model);
  return html`<div class="ks-panel">${CHAPTERS.map((ch) => {
    const n = ch.fields.filter((name) => by[name].error).length;
    return chapter(ch, ch.fields.map((name) => render(by[name])), n ? html`<p class="ks-chapter__err">エラー ${n}件</p>` : '');
  })}</div>`;
}

function head(model) {
  return html`<div class="ks-hero">
    <div class="ks-hero__text">
      <h1 class="ks-title">新規申請</h1>
      <ol class="ks-steps" aria-label="申請の手順">
        ${model.steps.map((s) => html`<li class="${s.current ? 'is-current' : ''} ${s.done ? 'is-done' : ''}" ${s.current ? html`aria-current="step"` : ''}><span class="ks-steps__n">${s.number}</span><span class="ks-steps__label">${s.label}</span>${s.current ? html`<small>現在</small>` : s.done ? html`<small>済</small>` : ''}</li>`)}
      </ol>
    </div>
    <img class="ks-hero__art" src="k-shore.svg" alt="" width="560" height="154" />
  </div>`;
}

function errors(model) {
  if (!model.errorCount) return '';
  return html`<div class="ks-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="ks-err-title">
    <h2 id="ks-err-title">入力エラーが${model.errorCount}件あります</h2>
    <p>項目名を選ぶと、その欄へ移動します。</p>
    <ul>${model.errorList.map((e) => html`<li><button type="button" class="ks-link" data-action="focus-field" data-field-name="${e.name}">${e.label}</button>　${e.text}</li>`)}</ul>
  </div>`;
}

const tools = () => html`<div class="ks-tools" role="group" aria-label="試作用の入力データ"><span>試作用：</span>
  <button type="button" class="ks-link" data-action="sample" data-kind="valid">入力例を入れる</button>
  <button type="button" class="ks-link" data-action="sample" data-kind="invalid">エラー例を再現</button>
  <button type="button" class="ks-link" data-action="sample" data-kind="clear">クリア</button></div>`;

function view(model) {
  if (model.step === 'edit') {
    return html`${head(model)}<div class="ks-body">${tools()}
      <form class="ks-form" novalidate aria-label="新規申請フォーム">
        ${errors(model)}${panel(model, field)}
        <div class="ks-actions"><a class="ks-back" href="../k-shoreline-list/">← 申請一覧に戻る</a><button type="submit" class="ks-btn">確認へ<span aria-hidden="true">→</span></button></div>
      </form></div>`;
  }
  if (model.step === 'confirm') {
    return html`${head(model)}<div class="ks-body">
      <p class="ks-lead" id="poc-sheet-title" tabindex="-1">入力内容を確認してください。「修正」を選ぶと、値を保ったままその欄へ戻ります。</p>
      ${panel(model, value)}
      <div class="ks-actions"><button type="button" class="ks-btn ks-btn--ghost" data-action="form-back">入力に戻る</button><button type="button" class="ks-btn" data-action="form-confirm">申請する（試作）<span aria-hidden="true">→</span></button></div></div>`;
  }
  return html`${head(model)}<div class="ks-body">
    <div class="ks-panel">${chapter(
      { id: 'result', title: '受付の結果' },
      html`<div class="ks-field is-wide"><p class="ks-done" id="poc-sheet-title" tabindex="-1">申請を受け付けました（試作）</p>
        <p class="ks-hint">これは比較用の試作です。入力内容は送信・保存されず、受付番号も発行されません。</p></div>`,
    )}</div>
    <div class="ks-actions"><button type="button" class="ks-btn ks-btn--ghost" data-action="form-restart">新しい申請を入力する</button><a class="ks-btn" href="../k-shoreline-list/">申請一覧へ<span aria-hidden="true">→</span></a></div></div>`;
}

startFormPoc({ app: document.getElementById('poc-app'), live: document.getElementById('poc-live'), view, title: '新規申請（汀線 試作）— Design Lab' });
