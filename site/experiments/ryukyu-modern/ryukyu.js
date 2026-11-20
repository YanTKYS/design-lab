// Ryukyu Modern（琉球モダン）「彩」の3画面試作（申請一覧・新規申請・ダッシュボード）。
// 視覚の基準は docs/ryukyu-modern-visuals/（彩のモックと sai-three-screens.md）。
// データ・検索・件数・並べ替え・入力検証・集計は比較サイトの共通モデル（query.js / form.js / dashboard.js）をそのまま使い、
// この試作では画面の切替と各画面の状態・イベントだけを持つ。状態はメモリのみで、URL・履歴・ストレージには書かない。

import { COLUMNS, DEFAULT_SORT } from '../../assets/js/data.js';
import { DEFAULT_PERIOD, EMPTY_SCOPE, buildDashboardModel, listStateFor } from '../../assets/js/dashboard.js';
import { back, complete, createForm, fillSample, hasErrors, setValue, submit, buildFormModel } from '../../assets/js/form.js';
import { attr, html, raw } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { patch } from '../../assets/js/morph.js';
import { buildModel, countText, formatDate, nextSort } from '../../assets/js/query.js';
import { dashboardView } from './ryukyu-dashboard.js';
import { formView } from './ryukyu-form.js';

const app = document.getElementById('rm-app');
const nav = document.getElementById('rm-nav');
const title = document.getElementById('rm-title');
const live = document.getElementById('rm-live');

const SCREENS = [
  { id: 'list', label: '申請一覧' },
  { id: 'form', label: '新規申請' },
  { id: 'dashboard', label: 'ダッシュボード' },
];

/** 試作の状態（メモリのみ）。一覧の条件・集計条件・入力中のフォームは、画面を行き来しても保つ。 */
const state = {
  screen: 'list',
  keyword: '',
  status: '',
  sort: { ...DEFAULT_SORT },
  detail: null, // 一覧で開いている受付番号（同時に1件）
  scope: { ...EMPTY_SCOPE }, // ダッシュボードから引き継いだ条件
  period: DEFAULT_PERIOD,
  dept: '',
};
let form = createForm();

/** 枠の幅による構成：wide＝検索と6択の横索引を同じ帯に、mid＝状態はセレクト、narrow＝縦に読む台帳・1列のフォーム。 */
const layoutOf = (width) => (width < 600 ? 'narrow' : width < 960 ? 'mid' : 'wide');
/** 判定は左右の余白を除いた内容の幅で行う（表や索引が実際に使える幅）。 */
const contentWidth = () => {
  const cs = getComputedStyle(app);
  return app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
};
let layout = layoutOf(contentWidth());

const STATUS_ICONS = { received: 'inbox', reviewing: 'clock', returned: 'alert', approved: 'check', rejected: null };
const date = (iso) => formatDate(iso, 'slash');
const funnel = raw(
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/></svg>',
);

/* ---------- 申請一覧 ---------- */

function badge(status) {
  const name = STATUS_ICONS[status.value];
  return html`<span class="rm-badge" data-status="${status.value}">${name ? icon(name, { size: 14, stroke: 2 }) : ''}${status.label}</span>`;
}

function keywordSearch(model) {
  return html`<form class="rm-search" role="search" aria-label="申請の検索" data-form="search">
    <label class="rm-label" for="rm-kw">キーワード検索</label>
    <div class="rm-search__row">
      <span class="rm-input-wrap">
        ${icon('search', { size: 16, stroke: 2, className: 'rm-input-wrap__icon' })}
        <input class="rm-input" id="rm-kw" type="search" value="${model.keyword}" aria-describedby="rm-kw-help" autocomplete="off" />
      </span>
      <button type="submit" class="rm-btn rm-btn--primary">検索</button>
    </div>
    <p class="rm-vh" id="rm-kw-help">受付番号・申請者名（ふりがな可）・申請種別・担当課で探せます。</p>
  </form>`;
}

/** PC の横索引：全6択を同じ順で横に並べ、0件も残す。件数は検索語・引継ぎ条件に一致した内訳。選択は塗り・チェック・太字で示す。 */
function statusIndex(model) {
  return html`<fieldset class="rm-index">
    <legend class="rm-label">処理状態</legend>
    <div class="rm-index__items">
      ${model.statusOptions.map(
        (o) => html`<label class="rm-index__item ${o.selected ? 'is-selected' : ''}">
          <input type="radio" name="rm-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
          <span class="rm-index__label">${o.selected ? icon('checkCircle', { size: 16, stroke: 2.25 }) : ''}${o.label}</span>
          <span class="rm-index__count">${o.count}<span class="rm-vh">件</span></span>
        </label>`,
      )}
    </div>
  </fieldset>`;
}

/** 960px 未満の状態選択：件数付きの標準セレクト。 */
function statusSelect(model) {
  return html`<div class="rm-status-select">
    <label class="rm-label" for="rm-status-select">処理状態</label>
    <select class="rm-select" id="rm-status-select" data-bind="status">
      ${model.statusOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}（${o.count}件）</option>`)}
    </select>
  </div>`;
}

/** ダッシュボードから引き継いだ条件。検索語・状態とは別に表示し、専用の操作で解除する。 */
function scopeBox(model) {
  if (!model.scope.active) return '';
  return html`<div class="rm-scope" data-scope>
    <p class="rm-scope__title">ダッシュボードから引き継いだ条件</p>
    <ul class="rm-scope__items">${model.scope.items.map((i) => html`<li>${i.label}：<strong>${i.text}</strong></li>`)}</ul>
    <button type="button" class="rm-btn rm-btn--secondary rm-btn--sm" data-action="clear-scope">引き継ぎを解除</button>
  </div>`;
}

function resultHead(model) {
  const status = model.statusOptions.find((o) => o.selected && o.value);
  const terms = [model.keyword, status?.label].filter(Boolean);
  return html`<div class="rm-result-head">
      <h2 class="rm-result-title" id="rm-result-title" tabindex="-1">検索結果</h2>
      <p class="rm-count">
        <strong class="rm-count__num">${model.shown}</strong>件<span class="rm-count__total">／ ${model.scope.active ? '引き継いだ条件の' : ''}全${model.total}件</span>
      </p>
    </div>
    ${scopeBox(model)}
    <div class="rm-filterline">
      ${model.filtered
        ? html`<p class="rm-filterline__text">${funnel}<span>絞り込み中</span>${terms.map(
              (t, i) => html`${i ? html`<span class="rm-filterline__sep" aria-hidden="true">/</span>` : ''}<strong>${t}</strong>`,
            )}</p>
            <button type="button" class="rm-btn rm-btn--text" data-action="clear">条件をクリア</button>`
        : html`<p class="rm-filterline__text rm-filterline__text--none">検索語・処理状態の絞り込みなし</p>`}
    </div>`;
}

/** 狭い幅の並べ替え：5項目の選択と、昇順／降順の切替。 */
function sortControls(model) {
  const asc = model.sort.dir === 'asc';
  return html`<div class="rm-sort">
    <label class="rm-sort__label" for="rm-sort-key">並べ替え</label>
    <select class="rm-select rm-select--sm" id="rm-sort-key" data-bind="sort-key">
      ${COLUMNS.map((c) => html`<option value="${c.key}" ${c.key === model.sort.key ? 'selected' : ''}>${c.label}</option>`)}
    </select>
    <button type="button" class="rm-btn rm-btn--secondary rm-btn--sm" data-action="sort-dir">
      ${icon(asc ? 'arrowUp' : 'arrowDown', { size: 14, stroke: 2 })}${asc ? '昇順' : '降順'}<span class="rm-vh">（押すと${asc ? '降順' : '昇順'}に切り替え）</span>
    </button>
  </div>`;
}

function detailToggle(row, open) {
  return html`<button
    type="button"
    class="rm-btn rm-btn--secondary rm-btn--sm rm-toggle"
    data-action="toggle-detail"
    data-id="${row.id}"
    aria-expanded="${open ? 'true' : 'false'}"
    ${attr('aria-controls', open && `rm-detail-${row.id}`)}
  >${icon(open ? 'chevronUp' : 'chevronDown', { size: 14, stroke: 2 })}${open ? '閉じる' : '詳細'}<span class="rm-vh">（${row.id}）</span></button>`;
}

/** 行（カード）の直後に開く詳細。一覧に出ている5項目は繰り返さず、担当課・受付方法・処理期限・備考を読む。 */
function detail(d) {
  const items = [
    ['担当課', d.department],
    ['受付方法', d.channel],
    ['処理期限', html`<span class="rm-num">${date(d.dueAt)}</span>`],
    ['備考', d.note || 'なし', 'note'],
  ];
  return html`<section class="rm-detail" id="rm-detail-${d.id}" aria-labelledby="rm-detail-title-${d.id}" data-detail="${d.id}">
    <div class="rm-detail__head">
      <h3 class="rm-detail__title" id="rm-detail-title-${d.id}" tabindex="-1">${icon('document', { size: 16, stroke: 2 })}申請詳細<span class="rm-vh">（${d.id}）</span></h3>
      <button type="button" class="rm-btn rm-btn--secondary rm-btn--sm" data-action="close-detail" data-id="${d.id}">${icon('chevronUp', { size: 14, stroke: 2 })}詳細を閉じる</button>
    </div>
    <dl class="rm-detail__items">
      ${items.map(([k, v, cls]) => html`<div class="${cls ? `rm-detail__item--${cls}` : ''}"><dt>${k}</dt><dd>${v}</dd></div>`)}
    </dl>
  </section>`;
}

function sortIcon(c) {
  return icon(c.sorted === 'asc' ? 'arrowUp' : c.sorted === 'desc' ? 'arrowDown' : 'arrowsUpDown', { size: 14, stroke: 2 });
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
        <th scope="col" class="rm-col-action"><span class="rm-vh">詳細</span></th>
      </tr>
    </thead>
    <tbody>
      ${model.rows.length
        ? model.rows.map((r) => {
            const open = model.detail?.id === r.id;
            return html`<tr class="rm-row ${open ? 'is-open' : ''}">
                <td class="rm-num rm-cell-id">${r.id}</td>
                <td>${r.applicant}</td>
                <td>${r.type}</td>
                <td class="rm-num">${date(r.receivedAt)}</td>
                <td>${badge(r.status)}</td>
                <td class="rm-col-action">${detailToggle(r, open)}</td>
              </tr>
              ${open ? html`<tr class="rm-detail-row"><td colspan="6">${detail(model.detail)}</td></tr>` : ''}`;
          })
        : html`<tr><td colspan="6" class="rm-empty">一致する申請はありません</td></tr>`}
    </tbody>
  </table>`;
}

/** 600px 未満：申請ごとに同じ5項目をラベル付きで縦に読む。詳細はカードの中に開く。 */
function cards(model) {
  if (!model.rows.length) return html`<p class="rm-empty rm-empty--card">一致する申請はありません</p>`;
  return html`<ol class="rm-cards" aria-label="申請（${countText(model)}）">
    ${model.rows.map((r) => {
      const open = model.detail?.id === r.id;
      return html`<li class="rm-card ${open ? 'is-open' : ''}">
        <dl class="rm-card__fields">
          <div><dt>受付番号</dt><dd class="rm-num rm-cell-id">${r.id}</dd></div>
          <div><dt>申請者</dt><dd>${r.applicant}</dd></div>
          <div><dt>申請種別</dt><dd>${r.type}</dd></div>
          <div><dt>受付日</dt><dd class="rm-num">${date(r.receivedAt)}</dd></div>
          <div><dt>処理状態</dt><dd>${badge(r.status)}</dd></div>
        </dl>
        ${open ? detail(model.detail) : html`<div class="rm-card__actions">${detailToggle(r, open)}</div>`}
      </li>`;
    })}
  </ol>`;
}

function listView(model) {
  return html`<div class="rm-band">
      ${keywordSearch(model)} ${layout === 'wide' ? statusIndex(model) : statusSelect(model)}
    </div>
    <section class="rm-ledger" aria-labelledby="rm-result-title">
      ${resultHead(model)} ${layout === 'narrow' ? sortControls(model) : ''} ${layout === 'narrow' ? cards(model) : table(model)}
    </section>`;
}

/* ---------- 描画 ---------- */

const listModel = () => buildModel({ ...state, screen: 'list' });

function renderNav() {
  patch(
    nav,
    html`<ul class="rm-nav__list">
      ${SCREENS.map(
        (s) => html`<li><button type="button" class="rm-nav__item" data-action="go" data-screen="${s.id}" ${attr('aria-current', s.id === state.screen && 'page')}>${s.label}</button></li>`,
      )}
    </ul>`.toString(),
  );
}

let shown = null; // 前回描いた画面と手順。変わったときは差分更新せず入れ替える（別画面の入力欄を再利用しない）

function render() {
  if (state.screen === 'list') {
    const model = listModel();
    // 開いている詳細が絞り込みで一覧から外れたら閉じる（一覧に無い記録の詳細は出さない）
    if (state.detail && !model.rows.some((r) => r.id === state.detail)) {
      state.detail = null;
      return render();
    }
  }
  const label = SCREENS.find((s) => s.id === state.screen).label;
  title.textContent = label;
  document.title = `${label}（琉球モダン・彩 試作）— Design Lab`;
  renderNav();
  app.dataset.layout = layout;
  app.dataset.screen = state.screen;
  const view =
    state.screen === 'form' ? formView(buildFormModel(form)) : state.screen === 'dashboard' ? dashboardView(buildDashboardModel(state)) : listView(listModel());
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
function announceCount() {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => announce(`検索結果 ${countText(listModel())}`), 500);
}

/** プログラムで移したフォーカスにも枠を出す（:focus-visible はマウス操作の直後に出ないため）。 */
function moveFocus(el) {
  if (!el) return;
  el.setAttribute('data-focus-ring', '');
  el.addEventListener('blur', () => el.removeAttribute('data-focus-ring'), { once: true });
  el.focus();
}

/** 閉じた後の戻り先：その記録の「詳細」ボタン。 */
const toggleButton = (id) => app.querySelector(`[data-action="toggle-detail"][data-id="${id}"]`);
const fieldEl = (name) => app.querySelector(`[data-field="${name}"]`);

/* ---------- 操作 ---------- */

function go(screen) {
  if (!SCREENS.some((s) => s.id === screen)) return;
  flushKeyword();
  state.screen = screen;
  render();
  window.scrollTo(0, 0);
  moveFocus(title);
}

let keywordTimer;

/** 検索語の保留中のタイマーを止め、入力欄にある内容を状態へ確定する（画面を離れる前に呼ぶ）。
 *  タイマーを消すだけだと未確定の入力が失われ、残したままだと離れた後の画面状態を上書きする。 */
function flushKeyword() {
  clearTimeout(keywordTimer);
  const input = app.querySelector('#rm-kw');
  if (input) state.keyword = input.value;
}

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

function updateForm(next) {
  if (next === form) return;
  form = next;
  render();
}

function commitField(el) {
  updateForm(setValue(form, el.dataset.field, el.type === 'checkbox' ? el.checked : el.value));
}

/** 「確認へ」：エラーがあれば入力にとどまりサマリーへ、なければ確認画面へ進む。 */
function submitEntry() {
  updateForm(submit(form));
  if (hasErrors(form.errors)) {
    moveFocus(app.querySelector('[data-focus="error-summary"]'));
    announce(`入力エラーが${Object.keys(form.errors).length}件あります`);
  } else {
    moveFocus(app.querySelector('.rm-sheet__title'));
    announce('確認画面です。内容を確認してください');
  }
}

function openList(link) {
  clearTimeout(keywordTimer); // 保留中の検索語が、引き継いだ条件（検索語は空）を後から上書きしない
  Object.assign(state, listStateFor(state, link), { screen: 'list' });
  render();
  window.scrollTo(0, 0);
  moveFocus(title);
  const model = listModel();
  announce(`申請一覧を表示しました。${model.scope.summary || '引き継いだ条件なし'}。${countText(model)}`);
}

function setCondition(name, value) {
  state[name] = value;
  render();
  const d = buildDashboardModel(state);
  announce(`${d.scopeText}で集計しました。受付${d.total}件、処理待ち${d.pending}件、処理完了${d.done}件、処理完了率${d.rate}`);
}

/* ---------- イベント ---------- */

nav.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action="go"]');
  if (el) go(el.dataset.screen);
});

app.addEventListener('input', (event) => {
  const el = event.target;
  if (event.isComposing) return; // IME 変換中は確定まで待つ
  if (el.id === 'rm-kw') {
    const { value } = el;
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => setKeyword(value), 250);
  } else if (el.dataset.field) {
    commitField(el);
  }
});

app.addEventListener('compositionend', (event) => {
  if (event.target.id === 'rm-kw') setKeyword(event.target.value);
  else if (event.target.dataset.field) commitField(event.target);
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.dataset.form === 'entry') {
    submitEntry();
    return;
  }
  setKeyword(app.querySelector('#rm-kw').value);
  announceCount();
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

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const { action, id, key } = el.dataset;
  if (el.tagName === 'A') event.preventDefault();
  switch (action) {
    case 'go':
      go(el.dataset.screen);
      break;
    case 'sort':
      state.sort = nextSort(state.sort, key);
      render();
      break;
    case 'sort-dir':
      state.sort = { ...state.sort, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' };
      render();
      break;
    case 'toggle-detail':
      if (state.detail === id) closeDetail();
      else openDetail(id);
      break;
    case 'close-detail':
      closeDetail();
      break;
    case 'clear':
      clearTimeout(keywordTimer);
      state.keyword = '';
      state.status = '';
      render();
      moveFocus(app.querySelector('#rm-kw'));
      announceCount();
      break;
    case 'clear-scope':
      state.scope = { ...EMPTY_SCOPE };
      render();
      moveFocus(app.querySelector('#rm-result-title')); // 解除ボタンは消えるので、結果の見出しへ移す
      announceCount();
      break;
    case 'focus-field':
      moveFocus(fieldEl(el.dataset.gotoField));
      break;
    case 'form-back': {
      const target = el.dataset.gotoField;
      updateForm(back(form));
      // 項目の「修正」はその欄へ、「入力に戻る」は編集の先頭へ戻す
      moveFocus(fieldEl(target || 'name'));
      break;
    }
    case 'form-confirm':
      updateForm(complete(form));
      moveFocus(app.querySelector('.rm-sheet__title'));
      announce('申請の入力が完了しました（試作のため、送信・保存はされません）');
      break;
    case 'form-restart':
      updateForm(createForm());
      moveFocus(fieldEl('name'));
      break;
    case 'form-sample': {
      const kind = el.dataset.kind;
      updateForm(kind === 'clear' ? createForm() : fillSample(kind));
      announce(kind === 'valid' ? '入力例を入れました' : kind === 'invalid' ? `入力エラーを再現しました。${Object.keys(form.errors).length}件のエラーがあります` : '入力内容をクリアしました');
      break;
    }
    case 'open-list':
      openList({ status: el.dataset.linkStatus, group: el.dataset.linkGroup, type: el.dataset.linkType });
      break;
    case 'reset-conditions':
      state.period = DEFAULT_PERIOD;
      state.dept = '';
      setCondition('period', DEFAULT_PERIOD);
      break;
    default:
      break;
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

// 幅が変わったら構成だけを切り替える。条件・並び・開いている詳細・入力値はそのまま引き継ぐ。
new ResizeObserver(() => {
  const next = layoutOf(contentWidth());
  if (next === layout) return;
  const active = document.activeElement;
  const wasDetail = active?.closest?.('[data-detail]') && state.detail;
  layout = next;
  render();
  if (wasDetail && !app.contains(active)) moveFocus(app.querySelector(`#rm-detail-title-${state.detail}`));
}).observe(app);

render();
