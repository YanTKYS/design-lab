// 申請一覧の独立試作（H′・J・K・L）で共通に使う、状態とイベントだけの小さな制御。
// 検索・状態の絞り込み・並べ替え・件数は共通の query.js（buildModel・nextSort・countText）をそのまま使う。
// 見た目（HTML の組み立て）は各試作の view が持つ。状態はページのメモリだけに置き、URL・ストレージには書かない。
//
// view(model, ui) が守る約束：
//   キーワード欄は id="poc-kw"（<form data-form="search"> の中）。
//   操作は data-action：status（data-status）/ sort（data-key）/ sort-dir / toggle-detail（data-id）/ close-detail / clear / page（data-page）。
//   並べ替えの項目をセレクトにするときは data-bind="sort-key"。
//   詳細の見出しは id="poc-detail-title"（tabindex="-1"）、詳細を開閉するボタンは data-action="toggle-detail" data-id="…"。
//   ui = { layout: 'wide' | 'narrow', page, pageSize }。ページ送りを使う案だけが page を見る。
//   ページ送り後のフォーカス先（新しい面の先頭）は data-page-top（tabindex="-1"）。

import { DEFAULT_SORT } from '../../assets/js/data.js';
import { html } from '../../assets/js/html.js';
import { patch } from '../../assets/js/morph.js';
import { buildModel, countText, nextSort } from '../../assets/js/query.js';

export function startListPoc({ app, live, view, title, narrowBelow = 760, pageSize = 0 }) {
  const state = { keyword: '', status: '', sort: { ...DEFAULT_SORT }, detail: null, screen: 'list' };
  let page = 0;
  const media = window.matchMedia(`(max-width: ${narrowBelow - 1}px)`);
  const layout = () => (media.matches ? 'narrow' : 'wide');
  const model = () => buildModel(state);

  function render() {
    let m = model();
    if (state.detail && !m.rows.some((r) => r.id === state.detail)) {
      state.detail = null; // 条件を変えて対象外になった詳細は閉じる
      m = model();
    }
    const pages = pageSize ? Math.max(1, Math.ceil(m.rows.length / pageSize)) : 1;
    page = Math.min(page, pages - 1);
    patch(app, view(m, { layout: layout(), page, pageSize, pages }).toString());
    document.title = `${countText(m)}｜${title}`;
  }

  function announce(text) {
    live.textContent = '';
    setTimeout(() => {
      live.textContent = text;
    }, 50);
  }
  let countTimer;
  const announceCount = () => {
    clearTimeout(countTimer);
    countTimer = setTimeout(() => announce(`検索結果 ${countText(model())}`), 400);
  };

  /** プログラムで移したフォーカスにも枠を出す。 */
  function moveFocus(el) {
    if (!el) return;
    el.setAttribute('data-focus-ring', '');
    el.addEventListener('blur', () => el.removeAttribute('data-focus-ring'), { once: true });
    el.focus();
  }
  const $ = (s) => app.querySelector(s);
  const toggleOf = (id) => $(`[data-action="toggle-detail"][data-id="${id}"]`);

  /** 選んだ申請が載っているページへ移す（ページ送りの案のみ）。 */
  const pageOfDetail = () => {
    if (!pageSize || !state.detail) return;
    const i = model().rows.findIndex((r) => r.id === state.detail);
    if (i >= 0) page = Math.floor(i / pageSize);
  };

  let keywordTimer;
  function setKeyword(value) {
    clearTimeout(keywordTimer);
    if (value === state.keyword) return;
    state.keyword = value;
    page = 0;
    render();
    announceCount();
  }

  function closeDetail() {
    const id = state.detail;
    if (!id) return;
    state.detail = null;
    render();
    moveFocus(toggleOf(id));
  }

  const ACTIONS = {
    status: (el) => {
      state.status = el.dataset.status;
      page = 0;
      render();
      announceCount();
    },
    sort: (el) => {
      state.sort = nextSort(state.sort, el.dataset.key);
      pageOfDetail();
      render();
    },
    'sort-dir': () => {
      state.sort = { ...state.sort, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' };
      pageOfDetail();
      render();
    },
    'toggle-detail': (el) => {
      if (state.detail === el.dataset.id) return closeDetail();
      state.detail = el.dataset.id;
      render();
      moveFocus($('#poc-detail-title'));
    },
    'close-detail': () => closeDetail(),
    clear: () => {
      clearTimeout(keywordTimer);
      state.keyword = '';
      state.status = '';
      page = 0;
      render();
      moveFocus($('#poc-kw'));
      announceCount();
    },
    page: (el) => {
      page = Number(el.dataset.page);
      render();
      // 送ったあとの先頭が見えるよう、一覧の始まりへ移る（ページ送りのボタンは一覧の下にあるため）
      const top = $('[data-page-top]');
      if (top) {
        top.scrollIntoView({ block: 'start' });
        moveFocus(top);
      }
      announce(`${page + 1}ページ目を表示しています`);
    },
  };

  app.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el);
  });
  app.addEventListener('input', (event) => {
    if (event.target.id !== 'poc-kw' || event.isComposing) return; // IME 変換中は確定まで待つ
    const { value } = event.target;
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => setKeyword(value), 250);
  });
  app.addEventListener('compositionend', (event) => {
    if (event.target.id === 'poc-kw') setKeyword(event.target.value);
  });
  app.addEventListener('change', (event) => {
    if (event.target.dataset.bind === 'sort-key') {
      // セレクトで同じ項目を選び直しても向きは変えない（向きは「昇順／降順」のボタンで切り替える）
      if (event.target.value === state.sort.key) return;
      state.sort = nextSort(state.sort, event.target.value);
      pageOfDetail();
      render();
    }
  });
  app.addEventListener('submit', (event) => {
    event.preventDefault();
    setKeyword($('#poc-kw').value);
    announceCount();
  });
  app.addEventListener('keydown', (event) => {
    // 変換確定の Enter で検索が確定しないようにする（Safari は確定後に keyCode 229 の Enter が来る）
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape' && state.detail && event.target.closest('[data-detail]')) {
      event.preventDefault();
      closeDetail();
    }
  });
  media.addEventListener('change', () => {
    const inDetail = document.activeElement?.closest?.('[data-detail]') && state.detail;
    render();
    if (inDetail && !app.contains(document.activeElement)) moveFocus($('#poc-detail-title'));
  });

  render();
}

/** 詳細に出す項目（共通データの値をそのまま使う）。 */
export const detailItems = (d, fmt) => [
  ['受付番号', d.id],
  ['申請者', d.applicant],
  ['ふりがな', d.kana],
  ['申請種別', d.type],
  ['担当課', d.department],
  ['受付方法', d.channel],
  ['受付日', fmt(d.receivedAt)],
  ['処理期限', fmt(d.dueAt)],
  ['処理状態', d.status.label],
  ['備考', d.note || 'なし'],
];

/** 状態の記号（色に頼らない手がかり）。 */
export const STATUS_MARK = { received: '○', reviewing: '◐', returned: '△', approved: '●', rejected: '×' };

/** 狭い幅で列見出しの代わりに置く並べ替え（項目のセレクトと昇順／降順の切替）。見た目は prefix の class で各案が決める。 */
export function sortBar(m, prefix) {
  const cur = m.columns.find((c) => c.sorted);
  const dir = cur.sorted === 'desc' ? '降順' : '昇順';
  return html`<div class="${prefix}-sortbar" role="group" aria-label="並べ替え">
    <label for="${prefix}-sort-key">並べ替え</label>
    <select id="${prefix}-sort-key" data-bind="sort-key">${m.columns.map((c) => html`<option value="${c.key}" ${c.sorted ? 'selected' : ''}>${c.label}</option>`)}</select>
    <button type="button" data-action="sort-dir" aria-label="並べ替えの向きを切り替える（現在：${dir}）">${dir} ${cur.sorted === 'desc' ? '↓' : '↑'}</button>
  </div>`;
}
