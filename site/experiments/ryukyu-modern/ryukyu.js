// Ryukyu Modern（琉球モダン）申請一覧の試作。設計の正本は docs/ryukyu-modern-concept.md。
// データ・検索・件数・並べ替えは比較サイトの共通モデル（query.js / data.js）をそのまま使い、
// この試作では一覧の操作に必要な状態とイベントだけを持つ（URL・履歴・ほかの画面は扱わない）。

import { COLUMNS, DEFAULT_SORT, SYSTEM } from '../../assets/js/data.js';
import { attr, html } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { patch } from '../../assets/js/morph.js';
import { buildModel, countText, formatDate, nextSort } from '../../assets/js/query.js';

const app = document.getElementById('rm-app');
const live = document.getElementById('rm-live');

/** 試作の状態（メモリのみ）。detail は開いている受付番号（同時に1件）。 */
const state = { keyword: '', status: '', sort: { ...DEFAULT_SORT }, detail: null };

/** 枠の幅による構成：wide＝索引＋表、mid＝セレクト＋表（960px 未満）、narrow＝セレクト＋縦の台帳（600px 未満）。 */
const layoutOf = (width) => (width < 600 ? 'narrow' : width < 960 ? 'mid' : 'wide');
let layout = layoutOf(app.clientWidth);

const STATUS_ICONS = { received: 'inbox', reviewing: 'clock', returned: 'alert', approved: 'check', rejected: null };
const date = (iso) => formatDate(iso, 'slash');

/* ---------- 表示 ---------- */

function badge(status) {
  const name = STATUS_ICONS[status.value];
  return html`<span class="rm-badge" data-status="${status.value}">${name ? icon(name, { size: 16, stroke: 2 }) : ''}${status.label}</span>`;
}

function search(model) {
  return html`<form class="rm-search" role="search" aria-label="申請の検索" data-form="search">
    <label class="rm-label" for="rm-kw">キーワード</label>
    <p class="rm-help" id="rm-kw-help">受付番号・申請者名（ふりがな可）・申請種別・担当課で探せます。</p>
    <div class="rm-search__row">
      <input class="rm-input" id="rm-kw" type="search" value="${model.keyword}" aria-describedby="rm-kw-help" autocomplete="off" />
      <button type="submit" class="rm-btn rm-btn--primary">${icon('search', { size: 18, stroke: 2 })}検索</button>
    </div>
  </form>`;
}

/** PC の状態索引：全6択を同じ順で縦に並べ、0件も残す。件数は検索語に一致した内訳。 */
function statusIndex(model) {
  return html`<fieldset class="rm-index">
    <legend class="rm-index__title">処理状態</legend>
    <ul>
      ${model.statusOptions.map(
        (o) => html`<li>
          <label class="rm-index__item ${o.selected ? 'is-selected' : ''}">
            <input type="radio" name="rm-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
            <span class="rm-index__label">${o.label}</span>
            <span class="rm-index__count">${o.count}<span class="rm-index__unit">件</span></span>
          </label>
        </li>`,
      )}
    </ul>
  </fieldset>`;
}

/** 960px 未満の状態選択：件数付きの標準セレクト。 */
function statusSelect(model) {
  return html`<div class="rm-field">
    <label class="rm-label" for="rm-status-select">処理状態</label>
    <select class="rm-select" id="rm-status-select" data-bind="status">
      ${model.statusOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}（${o.count}件）</option>`)}
    </select>
  </div>`;
}

function resultHead(model) {
  const status = model.statusOptions.find((o) => o.selected && o.value);
  const conditions = [model.keyword && `「${model.keyword}」`, status && status.label].filter(Boolean).join('・');
  return html`<div class="rm-result-head">
    <h2 class="rm-result-title" id="rm-result-title">検索結果</h2>
    <p class="rm-count">
      ${model.filtered ? html`<span class="rm-filtered">絞り込み中</span><span class="rm-conditions">${conditions}</span>` : ''}
      <strong class="rm-count__num">${countText(model)}</strong>
    </p>
    ${model.filtered ? html`<button type="button" class="rm-btn rm-btn--text" data-action="clear">検索条件をクリア</button>` : ''}
  </div>`;
}

/** 狭い幅の並べ替え：5項目の選択と、昇順／降順の切替。 */
function sortControls(model) {
  const dirText = model.sort.dir === 'asc' ? '昇順' : '降順';
  return html`<div class="rm-sort">
    <label class="rm-label" for="rm-sort-key">並べ替え</label>
    <select class="rm-select" id="rm-sort-key" data-bind="sort-key">
      ${COLUMNS.map((c) => html`<option value="${c.key}" ${c.key === model.sort.key ? 'selected' : ''}>${c.label}</option>`)}
    </select>
    <button type="button" class="rm-btn rm-btn--secondary" data-action="sort-dir">
      ${icon(model.sort.dir === 'asc' ? 'arrowUp' : 'arrowDown', { size: 18, stroke: 2 })}${dirText}<span class="rm-vh">（押すと${model.sort.dir === 'asc' ? '降順' : '昇順'}に切り替え）</span>
    </button>
  </div>`;
}

function detailToggle(row, open) {
  return html`<button
    type="button"
    class="rm-btn rm-btn--secondary rm-btn--sm"
    data-action="toggle-detail"
    data-id="${row.id}"
    aria-expanded="${open ? 'true' : 'false'}"
    ${attr('aria-controls', open && `rm-detail-${row.id}`)}
  >${open ? '詳細を閉じる' : '詳細'}<span class="rm-vh">（${row.id}）</span></button>`;
}

function detail(d) {
  const items = [
    ['受付番号', html`<span class="rm-num">${d.id}</span>`],
    ['申請者', d.applicant],
    ['申請種別', d.type],
    ['受付日', html`<span class="rm-num">${date(d.receivedAt)}</span>`],
    ['処理状態', badge(d.status)],
    ['担当課', d.department],
    ['受付方法', d.channel],
    ['処理期限', html`<span class="rm-num">${date(d.dueAt)}</span>`],
    ['備考', d.note || 'なし'],
  ];
  return html`<section class="rm-detail" id="rm-detail-${d.id}" aria-labelledby="rm-detail-title-${d.id}" data-detail="${d.id}">
    <h3 class="rm-detail__title" id="rm-detail-title-${d.id}" tabindex="-1">申請詳細（<span class="rm-num">${d.id}</span>）</h3>
    <dl class="rm-pairs">
      ${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}
    </dl>
    <button type="button" class="rm-btn rm-btn--secondary" data-action="close-detail" data-id="${d.id}">詳細を閉じる</button>
  </section>`;
}

function sortIcon(c) {
  return icon(c.sorted === 'asc' ? 'arrowUp' : c.sorted === 'desc' ? 'arrowDown' : 'arrowsUpDown', { size: 16, stroke: 2 });
}

function table(model) {
  return html`<table class="rm-table">
    <caption class="rm-vh">申請（${countText(model)}）。列見出しのボタンで並べ替えできます。</caption>
    <thead>
      <tr>
        ${model.columns.map(
          (c) => html`<th scope="col" aria-sort="${c.ariaSort}" class="${c.sorted ? 'is-sorted' : ''}">
            <button type="button" class="rm-sort-button" data-action="sort" data-key="${c.key}">${c.label}${sortIcon(c)}</button>
          </th>`,
        )}
      </tr>
    </thead>
    <tbody>
      ${model.rows.length
        ? model.rows.map((r) => {
            const open = model.detail?.id === r.id;
            return html`<tr class="rm-row ${open ? 'is-open' : ''}">
                <td class="rm-cell-id"><span class="rm-num">${r.id}</span>${detailToggle(r, open)}</td>
                <td>${r.applicant}</td>
                <td>${r.type}</td>
                <td class="rm-num">${date(r.receivedAt)}</td>
                <td>${badge(r.status)}</td>
              </tr>
              ${open ? html`<tr class="rm-detail-row"><td colspan="5">${detail(model.detail)}</td></tr>` : ''}`;
          })
        : html`<tr><td colspan="5" class="rm-empty">一致する申請はありません</td></tr>`}
    </tbody>
  </table>`;
}

/** 600px 未満：申請ごとに同じ5項目をラベル付きで縦に読む。 */
function cards(model) {
  if (!model.rows.length) return html`<p class="rm-empty">一致する申請はありません</p>`;
  return html`<ol class="rm-cards" aria-label="申請（${countText(model)}）">
    ${model.rows.map((r) => {
      const open = model.detail?.id === r.id;
      return html`<li class="rm-card ${open ? 'is-open' : ''}">
        <dl class="rm-pairs rm-pairs--card">
          <div><dt>受付番号</dt><dd class="rm-num">${r.id}</dd></div>
          <div><dt>申請者</dt><dd>${r.applicant}</dd></div>
          <div><dt>申請種別</dt><dd>${r.type}</dd></div>
          <div><dt>受付日</dt><dd class="rm-num">${date(r.receivedAt)}</dd></div>
          <div><dt>処理状態</dt><dd>${badge(r.status)}</dd></div>
        </dl>
        <div class="rm-card__actions">${detailToggle(r, open)}</div>
        ${open ? detail(model.detail) : ''}
      </li>`;
    })}
  </ol>`;
}

function view(model) {
  const wide = layout === 'wide';
  return html`<header class="rm-header">
      <p class="rm-header__org">${SYSTEM.org}</p>
      <p class="rm-header__system">${SYSTEM.name}</p>
    </header>
    <main class="rm-main">
      <h1 class="rm-title" tabindex="-1">申請一覧</h1>
      ${search(model)}
      <div class="rm-body">
        ${wide ? statusIndex(model) : ''}
        <section class="rm-ledger" aria-labelledby="rm-result-title">
          ${wide ? '' : statusSelect(model)} ${resultHead(model)} ${layout === 'narrow' ? sortControls(model) : ''}
          ${layout === 'narrow' ? cards(model) : table(model)}
        </section>
      </div>
    </main>
    <footer class="rm-footer"><p>© ${SYSTEM.org}（架空の自治体）</p></footer>`;
}

/* ---------- 状態の更新 ---------- */

function currentModel() {
  return buildModel({ ...state, screen: 'list' });
}

function render() {
  const model = currentModel();
  // 開いている詳細が絞り込みで一覧から外れたら閉じる（一覧に無い記録の詳細は出さない）
  if (state.detail && !model.rows.some((r) => r.id === state.detail)) {
    state.detail = null;
    return render();
  }
  app.dataset.layout = layout;
  patch(app, view(model).toString());
  return model;
}

let announceTimer;
function announceCount() {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    live.textContent = '';
    setTimeout(() => {
      live.textContent = `検索結果 ${countText(currentModel())}`;
    }, 50);
  }, 500);
}

/** プログラムで移したフォーカスにも枠を出す（:focus-visible はマウス操作の直後に出ないため）。 */
function moveFocus(el) {
  if (!el) return;
  el.setAttribute('data-focus-ring', '');
  el.addEventListener('blur', () => el.removeAttribute('data-focus-ring'), { once: true });
  el.focus();
}

const toggleButton = (id) => app.querySelector(`[data-action="toggle-detail"][data-id="${id}"]`);

function setKeyword(value) {
  clearTimeout(keywordTimer);
  if (value === state.keyword) return;
  state.keyword = value;
  render();
  announceCount();
}

function openDetail(id) {
  state.detail = id;
  render();
  moveFocus(app.querySelector(`#rm-detail-title-${id}`));
}

function closeDetail() {
  const id = state.detail;
  if (!id) return;
  state.detail = null;
  render();
  moveFocus(toggleButton(id));
}

/* ---------- イベント ---------- */

let keywordTimer;

app.addEventListener('input', (event) => {
  if (event.target.id !== 'rm-kw' || event.isComposing) return; // IME 変換中は確定まで待つ
  const { value } = event.target;
  clearTimeout(keywordTimer);
  keywordTimer = setTimeout(() => setKeyword(value), 250);
});

app.addEventListener('compositionend', (event) => {
  if (event.target.id === 'rm-kw') setKeyword(event.target.value);
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = app.querySelector('#rm-kw');
  setKeyword(input.value);
  announceCount();
});

app.addEventListener('change', (event) => {
  const { bind } = event.target.dataset;
  if (bind === 'status') {
    state.status = event.target.value;
    render();
    announceCount();
  } else if (bind === 'sort-key') {
    state.sort = nextSort(state.sort, event.target.value);
    render();
  }
});

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const { action, id, key } = el.dataset;
  if (action === 'sort') {
    state.sort = nextSort(state.sort, key);
    render();
  } else if (action === 'sort-dir') {
    state.sort = { ...state.sort, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' };
    render();
  } else if (action === 'toggle-detail') {
    if (state.detail === id) closeDetail();
    else openDetail(id);
  } else if (action === 'close-detail') {
    closeDetail();
  } else if (action === 'clear') {
    clearTimeout(keywordTimer);
    state.keyword = '';
    state.status = '';
    render();
    moveFocus(app.querySelector('#rm-kw'));
    announceCount();
  }
});

app.addEventListener('keydown', (event) => {
  // 変換確定の Enter で検索が二重に確定しないようにする（Safari は確定後に keyCode 229 の Enter が来る）
  if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) {
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape' && event.target.closest('[data-detail]')) {
    event.preventDefault();
    closeDetail();
  }
});

// 幅が変わったら構成だけを切り替える。条件・並び・開いている詳細はそのまま引き継ぐ。
new ResizeObserver(() => {
  const next = layoutOf(app.clientWidth);
  if (next === layout) return;
  const active = document.activeElement;
  const wasDetail = active?.closest?.('[data-detail]') && state.detail;
  layout = next;
  render();
  if (wasDetail && !app.contains(active)) moveFocus(app.querySelector(`#rm-detail-title-${state.detail}`));
}).observe(app);

render();
