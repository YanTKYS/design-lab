// 沖縄テーマB案「糸の交点」（仮称）の3画面試作。設計の正本は docs/okinawa-ui-study/README.md。
// 検索・件数・並べ替え（query.js）、入力検証と手順（form.js）、集計と一覧への引き継ぎ（dashboard.js）は共通モデルをそのまま使い、
// ここでは画面の切替と各画面の状態・イベントだけを持つ。状態はメモリのみで、URL・履歴・ストレージには書かない。

import { DEFAULT_SORT } from '../../assets/js/data.js';
import { DEFAULT_PERIOD, EMPTY_SCOPE, buildDashboardModel, listStateFor } from '../../assets/js/dashboard.js';
import { back, buildFormModel, complete, createForm, fillSample, hasErrors, setValue, submit } from '../../assets/js/form.js';
import { attr, html } from '../../assets/js/html.js';
import { patch } from '../../assets/js/morph.js';
import { buildModel, countText, nextSort } from '../../assets/js/query.js';
import { dashboardView } from './thread-dashboard.js';
import { formView } from './thread-form.js';
import { listView } from './thread-list.js';

const app = document.getElementById('th-app');
const nav = document.getElementById('th-nav');
const title = document.getElementById('th-title');
const live = document.getElementById('th-live');

const SCREENS = [
  { id: 'list', label: '申請一覧' },
  { id: 'form', label: '新規申請' },
  { id: 'dashboard', label: 'ダッシュボード' },
];

/** 一覧の条件・集計条件・入力中のフォームは、ページを開いている間だけ保つ。 */
const state = {
  screen: 'list',
  keyword: '',
  status: '',
  sort: { ...DEFAULT_SORT },
  detail: null,
  scope: { ...EMPTY_SCOPE },
  period: DEFAULT_PERIOD,
  dept: '',
};
let form = createForm();

/** 構成：wide＝状態の6択を横に並べる、mid＝状態はセレクト、narrow＝項目名を値の上に置く縦の読み順。判定は余白を除いた幅。 */
const layoutOf = (w) => (w < 600 ? 'narrow' : w < 940 ? 'mid' : 'wide');
const contentWidth = () => {
  const cs = getComputedStyle(app);
  return app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
};
let layout = layoutOf(contentWidth());

const listModel = () => buildModel({ ...state, screen: 'list' });

/* ---------- 描画 ---------- */

let shown = null; // 画面や手順が変わったときは差分更新せず入れ替える

function render() {
  if (state.screen === 'list' && state.detail && !listModel().rows.some((r) => r.id === state.detail)) state.detail = null;
  const label = SCREENS.find((s) => s.id === state.screen).label;
  title.textContent = label;
  document.title = `${label}（糸の交点 試作）— Design Lab`;
  patch(
    nav,
    html`<ul class="th-nav__list">
      ${SCREENS.map((s) => html`<li><button type="button" class="th-nav__item" data-action="go" data-screen="${s.id}" ${attr('aria-current', s.id === state.screen && 'page')}>${s.label}</button></li>`)}
    </ul>`.toString(),
  );
  app.dataset.layout = layout;
  app.dataset.screen = state.screen;
  const view =
    state.screen === 'form' ? formView(buildFormModel(form)) : state.screen === 'dashboard' ? dashboardView(buildDashboardModel(state)) : listView(listModel(), layout);
  const key = `${state.screen}:${form.step}`;
  patch(app, view.toString(), { replace: shown !== null && shown !== key });
  shown = key;
}

function announce(text) {
  live.textContent = '';
  setTimeout(() => {
    live.textContent = text;
  }, 50);
}

let announceTimer;
const announceCount = () => {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => announce(`検索結果 ${countText(listModel())}`), 500);
};

/** プログラムで移したフォーカスにも枠を出す（:focus-visible はマウス操作の直後に出ないため）。 */
function moveFocus(el) {
  if (!el) return;
  el.setAttribute('data-focus-ring', '');
  el.addEventListener('blur', () => el.removeAttribute('data-focus-ring'), { once: true });
  el.focus();
}

const $ = (selector) => app.querySelector(selector);
const fieldEl = (name) => $(`[data-field="${name}"]`);

/* ---------- 操作 ---------- */

function go(screen) {
  if (!SCREENS.some((s) => s.id === screen)) return;
  state.screen = screen;
  render();
  window.scrollTo(0, 0);
  moveFocus(title);
}

let keywordTimer;
function setKeyword(value) {
  clearTimeout(keywordTimer);
  if (value === state.keyword) return;
  state.keyword = value;
  render();
  announceCount();
}

function closeDetail() {
  const id = state.detail;
  if (!id) return;
  state.detail = null;
  render();
  moveFocus($(`[data-action="toggle-detail"][data-id="${id}"]`));
}

function updateForm(next) {
  if (next === form) return;
  form = next;
  render();
}

const commitField = (el) => updateForm(setValue(form, el.dataset.field, el.type === 'checkbox' ? el.checked : el.value));

function setCondition(name, value) {
  state[name] = value;
  render();
  const d = buildDashboardModel(state);
  announce(`${d.scopeText}で集計しました。受付${d.total}件、処理待ち${d.pending}件、処理完了${d.done}件、処理完了率${d.rate}`);
}

const ACTIONS = {
  go: (el) => go(el.dataset.screen),
  sort: (el) => {
    state.sort = nextSort(state.sort, el.dataset.key);
    render();
  },
  'sort-dir': () => {
    state.sort = { ...state.sort, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' };
    render();
  },
  'toggle-detail': (el) => {
    if (state.detail === el.dataset.id) return closeDetail();
    state.detail = el.dataset.id;
    render();
    moveFocus($(`#th-detail-title-${el.dataset.id}`));
  },
  'close-detail': () => closeDetail(),
  clear: () => {
    clearTimeout(keywordTimer);
    state.keyword = '';
    state.status = '';
    render();
    moveFocus($('#th-kw'));
    announceCount();
  },
  'clear-scope': () => {
    state.scope = { ...EMPTY_SCOPE };
    render();
    moveFocus($('#th-result-title')); // 解除ボタンは消えるので、台帳の見出しへ移す
    announceCount();
  },
  'focus-field': (el) => moveFocus(fieldEl(el.dataset.gotoField)),
  'form-back': (el) => {
    updateForm(back(form));
    moveFocus(fieldEl(el.dataset.gotoField || 'name')); // 項目の「修正」はその欄へ、「入力に戻る」は先頭の欄へ
  },
  'form-confirm': () => {
    updateForm(complete(form));
    moveFocus($('#th-sheet-title'));
    announce('申請の入力が完了しました（試作のため、送信・保存はされません）');
  },
  'form-restart': () => {
    updateForm(createForm());
    moveFocus(fieldEl('name'));
  },
  'form-sample': (el) => {
    const { kind } = el.dataset;
    updateForm(kind === 'clear' ? createForm() : fillSample(kind));
    announce(kind === 'valid' ? '入力例を入れました' : kind === 'invalid' ? `入力エラーを再現しました。${Object.keys(form.errors).length}件のエラーがあります` : '入力内容をクリアしました');
  },
  'open-list': (el) => {
    const { linkStatus: status, linkGroup: group, linkType: type } = el.dataset;
    Object.assign(state, listStateFor(state, { status, group, type }), { screen: 'list' });
    render();
    window.scrollTo(0, 0);
    moveFocus(title);
    const model = listModel();
    announce(`申請一覧を表示しました。${model.scope.summary || '引き継いだ条件なし'}。${countText(model)}`);
  },
  'reset-conditions': () => {
    state.dept = '';
    setCondition('period', DEFAULT_PERIOD);
  },
};

/* ---------- イベント ---------- */

nav.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action="go"]');
  if (el) go(el.dataset.screen);
});

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || !ACTIONS[el.dataset.action]) return;
  if (el.tagName === 'A') event.preventDefault();
  ACTIONS[el.dataset.action](el);
});

app.addEventListener('input', (event) => {
  const el = event.target;
  if (event.isComposing) return; // IME 変換中は確定まで待つ
  if (el.id === 'th-kw') {
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => setKeyword(el.value), 250);
  } else if (el.dataset.field) {
    commitField(el);
  }
});

app.addEventListener('compositionend', (event) => {
  if (event.target.id === 'th-kw') setKeyword(event.target.value);
  else if (event.target.dataset.field) commitField(event.target);
});

app.addEventListener('change', (event) => {
  const el = event.target;
  const { bind } = el.dataset;
  if (bind === 'status') {
    state.status = el.value;
    render();
    announceCount();
  } else if (bind === 'sort-key') {
    state.sort = nextSort(state.sort, el.value);
    render();
  } else if (bind === 'period' || bind === 'dept') {
    setCondition(bind, el.value);
  } else if (el.dataset.field) {
    commitField(el);
  }
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.dataset.form !== 'entry') {
    setKeyword($('#th-kw').value);
    announceCount();
    return;
  }
  updateForm(submit(form));
  if (hasErrors(form.errors)) {
    moveFocus($('[data-focus="error-summary"]'));
    announce(`入力エラーが${Object.keys(form.errors).length}件あります`);
  } else {
    moveFocus($('#th-sheet-title'));
    announce('確認画面です。内容を確認してください');
  }
});

app.addEventListener('keydown', (event) => {
  // 変換確定の Enter で検索・送信が確定しないようにする（Safari は確定後に keyCode 229 の Enter が来る）
  if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) {
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape' && event.target.closest('[data-detail]')) {
    event.preventDefault();
    closeDetail();
  }
});

// 幅が変わったら構成だけを切り替える。条件・並び・開いている詳細・入力値は引き継ぐ。
new ResizeObserver(() => {
  const next = layoutOf(contentWidth());
  if (next === layout) return;
  const inDetail = document.activeElement?.closest?.('[data-detail]') && state.detail;
  layout = next;
  render();
  if (inDetail && !app.contains(document.activeElement)) moveFocus($(`#th-detail-title-${state.detail}`));
}).observe(app);

render();
