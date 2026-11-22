// L「標示盤」（仮称）新規申請フォームの独立した試作。視覚の基準は docs/l-form-study/images/l-form-revised-1280.png。
// 項目・必須／任意・補足・入力例・検証・手順の遷移は共通の form.js をそのまま使い、ここでは表示とイベントだけを持つ。
// フォームの状態はメモリだけに置き、URL・履歴・ストレージには書かない（送信もしない）。

import { back, buildFormModel, complete, createForm, fillSample, hasErrors, setValue, submit } from '../../assets/js/form.js';
import { html, raw } from '../../assets/js/html.js';
import { patch } from '../../assets/js/morph.js';
import { control, describedBy } from '../../assets/js/designs/form-control.js';

const app = document.getElementById('ls-app');
const live = document.getElementById('ls-live');

const CHAPTERS = [
  { id: 'applicant', title: '申請者情報', fields: ['name', 'kana', 'email', 'phone'] },
  { id: 'procedure', title: '手続きの内容', fields: ['type', 'date', 'body'] },
  { id: 'consent', title: '確認事項', fields: ['agree'] },
];
const WIDE = new Set(['body', 'agree']); // 2列の中で全幅を使う項目
const CLS = { input: 'ls-input', select: 'ls-input ls-select', textarea: 'ls-input ls-textarea', checkbox: 'ls-checkbox' };
const fid = (name) => `ls-f-${name}`;

let form = createForm();

/* ---------- ドット文字（5×7）：手順の番号だけに使う ---------- */

const GLYPHS = {
  0: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  1: ['00110', '01110', '00110', '00110', '00110', '00110', '01111'],
  2: ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
  3: ['01110', '11011', '00011', '00110', '00011', '11011', '01110'],
};
function dots(number) {
  const digits = String(number).padStart(2, '0').split('');
  const circles = digits.flatMap((d, i) =>
    GLYPHS[d].flatMap((row, y) => [...row].map((on, x) => `<circle cx="${i * 6 + x + 0.5}" cy="${y + 0.5}" r="0.36" class="${on === '1' ? 'on' : 'off'}"/>`)),
  );
  return html`<svg class="ls-dots" viewBox="0 0 11 7" aria-hidden="true" focusable="false">${raw(circles.join(''))}</svg>`;
}

/* ---------- 部品 ---------- */

const req = (f) => (f.required ? html`<span class="ls-req">必須</span>` : html`<span class="ls-opt">任意</span>`);
const errorText = (f, id) =>
  f.error ? html`<p class="ls-field-error" id="${id}"><span class="ls-field-error__mark" aria-hidden="true">!</span><span><strong>エラー</strong>　${f.error.text}</span></p>` : '';

function field(f) {
  const id = fid(f.name);
  const hint = `${id}-hint`;
  const err = `${id}-error`;
  const cell = `ls-cell ${WIDE.has(f.name) ? 'ls-cell--wide' : ''} ${f.error ? 'is-invalid' : ''}`;
  if (f.control === 'checkbox') {
    return html`<div class="${cell}">
      <p class="ls-cell__head"><span class="ls-label" id="${id}-label">${f.label}</span>${req(f)}</p>
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

/** 左の列（手順の罫線から枝分かれした章名）と、右の列（その章の中身）を1段にする。 */
function chapterRow(ch, body, extra = '') {
  return html`<section class="ls-row ls-chapter" aria-labelledby="ls-ch-${ch.id}">
    <div class="ls-rail"><h2 class="ls-chapter__title" id="ls-ch-${ch.id}">${ch.title}</h2>${extra}</div>
    <div class="ls-cells">${body}</div>
  </section>`;
}

const STEP_LABEL = { edit: '入力', confirm: '確認', done: '完了' };

function head(model) {
  const cur = model.steps.find((s) => s.current);
  return html`<div class="ls-row ls-head">
    <div class="ls-now">${dots(cur.number)}<span class="ls-now__label">${cur.label}</span><span class="ls-now__tag">現在</span>
      <span class="ls-vh">（手順 ${cur.number} / ${model.steps.length}）</span></div>
    <div class="ls-titlebar"><h1 class="ls-title" id="ls-title" tabindex="-1">新規申請</h1><a class="ls-back" href="../l-signage-list/">← 申請一覧に戻る</a></div>
  </div>`;
}

/** 下段：左に「次の手順」、右に、そこへ進むボタン。点線の罫で両者をつなぐ。 */
function foot(model, buttons) {
  const after = model.steps.filter((s) => !s.current);
  const next = model.steps[model.stepIndex + 1];
  return html`<div class="ls-row ls-foot">
    <ol class="ls-next" aria-label="ほかの手順">
      ${after.map(
        (s) => html`<li class="ls-next__item ${s === next ? 'is-next' : ''} ${s.done ? 'is-done' : ''}" id="ls-step-${s.number}">
          ${dots(s.number)}<span>${s.label}</span>${s.done ? html`<span class="ls-next__done">済</span>` : ''}${s === next ? html`<span class="ls-vh">（次の手順）</span>` : ''}
        </li>`,
      )}
    </ol>
    <div class="ls-actions">${buttons}</div>
  </div>`;
}

function errorRow(model) {
  if (!model.errorCount) return '';
  return html`<div class="ls-row ls-alert">
    <div class="ls-rail"><p class="ls-alert__tag"><span aria-hidden="true">!</span>エラー</p></div>
    <div class="ls-errors" tabindex="-1" data-focus="error-summary" role="alert" aria-labelledby="ls-error-title">
      <h2 id="ls-error-title">入力エラーが${model.errorCount}件あります</h2>
      <p>項目名を選ぶと、その欄へ移動します。</p>
      <ul>${model.errorList.map((e) => html`<li><button type="button" class="ls-link" data-action="focus-field" data-field-name="${e.name}">${e.label}</button>：${e.text}</li>`)}</ul>
    </div>
  </div>`;
}

function editView(model) {
  const by = Object.fromEntries(model.fields.map((f) => [f.name, f]));
  const chapterErrors = (ch) => ch.fields.filter((n) => by[n].error).length;
  return html`<form class="ls-panel" data-step="edit" novalidate aria-labelledby="ls-title">
    ${head(model)} ${errorRow(model)}
    ${CHAPTERS.map((ch) => {
      const n = chapterErrors(ch);
      return chapterRow(ch, ch.fields.map((name) => field(by[name])), n ? html`<p class="ls-chapter__err">エラー ${n}件</p>` : '');
    })}
    ${foot(
      model,
      html`<span class="ls-connector" aria-hidden="true"></span>
        <button type="submit" class="ls-btn ls-btn--primary" aria-describedby="ls-step-2">確認へ<span class="ls-btn__arrow" aria-hidden="true">→</span></button>`,
    )}
  </form>`;
}

function confirmView(model) {
  const by = Object.fromEntries(model.fields.map((f) => [f.name, f]));
  const item = (f) => html`<div class="ls-cell ${WIDE.has(f.name) ? 'ls-cell--wide' : ''}">
    <p class="ls-cell__head"><span class="ls-label">${f.label}</span>
      <button type="button" class="ls-link ls-fix" data-action="form-back" data-field-name="${f.name}">修正<span class="ls-vh">（${f.label}）</span></button></p>
    <p class="ls-value ${f.display === '入力なし' ? 'is-empty' : ''}">${f.display}</p>
  </div>`;
  return html`<div class="ls-panel" data-step="confirm">
    ${head(model)}
    <div class="ls-row ls-lead"><div class="ls-rail"></div><p id="ls-sheet-title" tabindex="-1">入力内容を確認してください。「修正」を選ぶと、入力した値を保ったまま、その欄へ戻ります。</p></div>
    ${CHAPTERS.map((ch) => chapterRow(ch, ch.fields.map((name) => item(by[name]))))}
    ${foot(
      model,
      html`<button type="button" class="ls-btn ls-btn--ghost" data-action="form-back">入力に戻る</button>
        <span class="ls-connector" aria-hidden="true"></span>
        <button type="button" class="ls-btn ls-btn--primary" data-action="form-confirm" aria-describedby="ls-step-3">申請する（試作）<span class="ls-btn__arrow" aria-hidden="true">→</span></button>`,
    )}
  </div>`;
}

function doneView(model) {
  return html`<div class="ls-panel" data-step="done">
    ${head(model)}
    ${chapterRow(
      { id: 'result', title: '受付の結果' },
      html`<div class="ls-cell ls-cell--wide"><p class="ls-done" id="ls-sheet-title" tabindex="-1">申請を受け付けました（試作）</p>
        <p class="ls-hint">これは比較用の試作です。入力内容は送信・保存されず、受付番号も発行されません。</p></div>`,
    )}
    ${foot(
      model,
      html`<button type="button" class="ls-btn ls-btn--ghost" data-action="form-restart">新しい申請を入力する</button>
        <span class="ls-connector" aria-hidden="true"></span>
        <a class="ls-btn ls-btn--primary" href="../l-signage-list/">申請一覧へ<span class="ls-btn__arrow" aria-hidden="true">→</span></a>`,
    )}
  </div>`;
}

/** 試作だけの操作。業務の操作と区別するため、パネルの外に小さく置く。 */
const tools = () => html`<div class="ls-tools" role="group" aria-label="試作用の入力データ">
  <span>試作用：</span>
  <button type="button" class="ls-link" data-action="sample" data-kind="valid">入力例を入れる</button>
  <button type="button" class="ls-link" data-action="sample" data-kind="invalid">エラー例を再現</button>
  <button type="button" class="ls-link" data-action="sample" data-kind="clear">クリア</button>
</div>`;

/* ---------- 描画とフォーカス ---------- */

let shownStep = null;
function render() {
  const model = buildFormModel(form);
  const view = model.step === 'edit' ? html`${tools()}${editView(model)}` : model.step === 'confirm' ? confirmView(model) : doneView(model);
  patch(app, view.toString(), { replace: shownStep !== null && shownStep !== model.step });
  shownStep = model.step;
  document.title = `${STEP_LABEL[model.step]}｜新規申請（標示盤 試作）— Design Lab`;
}

function announce(text) {
  live.textContent = '';
  setTimeout(() => {
    live.textContent = text;
  }, 50);
}

/** プログラムで移したフォーカスにも枠を出す（:focus-visible はマウス操作の直後に出ないため）。 */
function moveFocus(el) {
  if (!el) return;
  el.setAttribute('data-focus-ring', '');
  el.addEventListener('blur', () => el.removeAttribute('data-focus-ring'), { once: true });
  el.focus();
}
const $ = (s) => app.querySelector(s);
const fieldEl = (name) => $(`[data-field="${name}"]`);

function update(next) {
  if (next === form) return;
  form = next;
  render();
}
const commit = (el) => update(setValue(form, el.dataset.field, el.type === 'checkbox' ? el.checked : el.value));

const ACTIONS = {
  'focus-field': (el) => moveFocus(fieldEl(el.dataset.fieldName)),
  'form-back': (el) => {
    update(back(form));
    moveFocus(fieldEl(el.dataset.fieldName || 'name')); // 項目の「修正」はその欄へ、「入力に戻る」は先頭の欄へ
    announce('入力画面に戻りました。入力した値は保たれています');
  },
  'form-confirm': () => {
    update(complete(form));
    moveFocus($('#ls-sheet-title'));
    announce('申請を受け付けました（試作のため、送信・保存はされません）');
  },
  'form-restart': () => {
    update(createForm());
    moveFocus(fieldEl('name'));
    announce('新しい申請の入力を始めます');
  },
  sample: (el) => {
    const { kind } = el.dataset;
    update(kind === 'clear' ? createForm() : fillSample(kind));
    if (kind === 'invalid') moveFocus($('[data-focus="error-summary"]'));
    announce(kind === 'valid' ? '入力例を入れました' : kind === 'invalid' ? `入力エラーを再現しました。${Object.keys(form.errors).length}件のエラーがあります` : '入力内容をクリアしました');
  },
};

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el);
});

app.addEventListener('input', (event) => {
  if (event.isComposing) return; // IME 変換中は確定まで待つ
  if (event.target.dataset.field) commit(event.target);
});
app.addEventListener('compositionend', (event) => {
  if (event.target.dataset.field) commit(event.target);
});
app.addEventListener('change', (event) => {
  if (event.target.dataset.field) commit(event.target);
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  update(submit(form));
  if (hasErrors(form.errors)) {
    moveFocus($('[data-focus="error-summary"]'));
    announce(`入力エラーが${Object.keys(form.errors).length}件あります`);
  } else {
    moveFocus($('#ls-sheet-title'));
    announce('確認画面です。内容を確認してください');
  }
});

app.addEventListener('keydown', (event) => {
  // 変換確定の Enter でフォームが送信されないようにする（Safari は確定後に keyCode 229 の Enter が来る）
  if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
});

render();
