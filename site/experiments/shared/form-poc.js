// 新規申請フォームの独立試作（H′・J・K）で共通に使う、状態とイベントだけの小さな制御。
// 項目・検証・手順の遷移は共通の form.js をそのまま使う。見た目（HTML の組み立て）は各試作の view が持つ。
// 状態はページのメモリだけに置き、送信・URL・履歴・ストレージには書かない。
//
// view(model) が守る約束：
//   入力欄は form-control.js の control()（data-field 付き）で出す。編集画面は <form> で囲み、「確認へ」は type="submit"。
//   エラーの一覧は data-focus="error-summary"（tabindex="-1"）。確認・完了の見出しは id="poc-sheet-title"（tabindex="-1"）。
//   操作は data-action：focus-field / form-back（data-field-name で戻り先の欄）/ form-confirm / form-restart / sample（data-kind）。

import { back, buildFormModel, complete, createForm, fillSample, hasErrors, setValue, submit } from '../../assets/js/form.js';
import { patch } from '../../assets/js/morph.js';

export function startFormPoc({ app, live, view, title }) {
  let form = createForm();
  let shownStep = null;
  const LABEL = { edit: '入力', confirm: '確認', done: '完了' };

  function render() {
    const model = buildFormModel(form);
    patch(app, view(model).toString(), { replace: shownStep !== null && shownStep !== model.step });
    shownStep = model.step;
    document.title = `${LABEL[model.step]}｜${title}`;
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
      moveFocus($('#poc-sheet-title'));
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
      moveFocus($('#poc-sheet-title'));
      announce('確認画面です。内容を確認してください');
    }
  });
  app.addEventListener('keydown', (event) => {
    // 変換確定の Enter でフォームが送信されないようにする（Safari は確定後に keyCode 229 の Enter が来る）
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
  });

  render();
}

/** 3試作で同じ章立て（見せ方は各試作が決める）。 */
export const CHAPTERS = [
  { id: 'applicant', title: '申請者情報', fields: ['name', 'kana', 'email', 'phone'] },
  { id: 'procedure', title: '手続きの内容', fields: ['type', 'date', 'body'] },
  { id: 'consent', title: '確認事項', fields: ['agree'] },
];

export const byName = (model) => Object.fromEntries(model.fields.map((f) => [f.name, f]));
