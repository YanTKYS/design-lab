// 比較サイトのシェル：状態管理、URL 同期、比較操作、デザイン描画の振り分け。

import { DESIGNS, DESIGN_IDS, getDesign } from './designs/index.js';
import { html } from './html.js';
import { icon } from './icons.js';
import { patch } from './morph.js';
import { buildModel, countText, nextSort } from './query.js';
import { WIDTHS, parseState, serializeState } from './state.js';

const TRAIT_LABELS = {
  density: '情報密度と余白',
  navigation: 'ナビゲーション',
  table: 'テーブル',
  input: '検索・入力',
  actions: 'ボタン・操作',
  hierarchy: '情報の階層と配置',
};

const UNIMPLEMENTED_TEXT = 'このサンプルでは申請一覧画面のみを実装しています。';

const els = {
  controls: document.getElementById('lab-controls'),
  panes: document.getElementById('lab-panes'),
  live: document.getElementById('lab-live'),
  copy: document.getElementById('lab-copy'),
  copyStatus: document.getElementById('lab-copy-status'),
};

let state = parseState(location.search, DESIGN_IDS);
let keywordTimer = 0;
let announceTimer = 0;

/** 各ペインの表示中デザインと、デザイン固有の一時 UI 状態（メニュー開閉など）。 */
const panes = [0, 1].map(createPane);

function createPane(index) {
  const section = document.createElement('section');
  section.className = 'pane';
  section.innerHTML =
    '<div class="pane__head"></div>' +
    '<div class="pane__frame"><div class="pane__scroll"><div class="pane__root"></div></div></div>';
  els.panes.append(section);
  const pane = {
    index,
    section,
    head: section.querySelector('.pane__head'),
    scroll: section.querySelector('.pane__scroll'),
    root: section.querySelector('.pane__root'),
    designId: null,
    ui: {},
    traitsOpen: false,
  };
  bindPaneEvents(pane);
  return pane;
}

/* ---------- 状態更新 ---------- */

function update(changes, { history = 'push', focus = null } = {}) {
  const before = state;
  state = { ...state, ...changes };
  render();
  syncUrl(history);
  if (focus) applyFocus(focus);
  if (before.keyword !== state.keyword || before.status !== state.status) scheduleAnnounce();
}

function syncUrl(mode) {
  const search = serializeState(state);
  if (search === location.search) return;
  if (mode === 'replace') history.replaceState(null, '', search);
  else history.pushState(null, '', search);
}

function applyFocus({ pane, selector, fallback }) {
  const root = panes[pane].root;
  const target = root.querySelector(selector) ?? (fallback && root.querySelector(fallback));
  target?.focus({ preventScroll: false });
}

function announce(text) {
  els.live.textContent = '';
  // 同じ文言でも読み上げられるよう、一度空にしてから設定する
  setTimeout(() => {
    els.live.textContent = text;
  }, 50);
}

function scheduleAnnounce() {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    const model = buildModel(state);
    announce(`検索結果 ${countText(model)}`);
  }, 600);
}

/** 通知はデザインごとの通知コンポーネントで表示する。フォーカスは操作した位置に残す。 */
function showNotice(title, text) {
  update({ notice: { title, text } }, { history: 'replace' });
  announce(`${title}。${text}`);
}

/* ---------- 描画 ---------- */

function render() {
  document.body.dataset.mode = state.mode;
  patch(els.controls, renderControls().toString());
  els.panes.dataset.width = state.width;
  els.panes.style.setProperty('--frame-width', state.width === 'auto' ? '' : `${state.width}px`);

  const model = buildModel(state);
  for (const pane of panes) {
    const visible = pane.index === 0 || state.mode === 'compare';
    pane.section.hidden = !visible;
    if (!visible) continue;

    const design = getDesign(pane.index === 0 ? state.left : state.right);
    const changed = pane.designId !== design.id;
    if (changed) pane.ui = {};
    pane.designId = design.id;
    pane.section.dataset.design = design.id;
    pane.section.setAttribute('aria-label', paneLabel(design, pane.index));
    patch(pane.head, renderPaneHead(design, pane).toString());

    const ctx = {
      uid: `p${pane.index}`,
      ui: pane.ui,
      href: (changes) => serializeState({ ...state, ...changes }),
    };
    const pageBefore = pane.root.firstElementChild?.dataset.page;
    patch(pane.root, design.render(model, ctx).toString(), { replace: changed });
    // 詳細を別ページとして描くデザインでは、ページが切り替わったら先頭から表示する
    const pageAfter = pane.root.firstElementChild?.dataset.page;
    if (!changed && pageBefore !== pageAfter) pane.scroll.scrollTop = 0;
  }
}

function paneLabel(design, index) {
  if (state.mode !== 'compare') return `${design.name} のサンプル画面`;
  return `${index === 0 ? '左' : '右'}：${design.name} のサンプル画面`;
}

function renderControls() {
  const modeOptions = [
    ['single', '単独表示'],
    ['compare', '左右比較'],
  ];
  const designSelect = (name, label, value, className = '') => html`
    <div class="lab-field ${className}">
      <label class="lab-label" for="lab-${name}">${label}</label>
      <select class="lab-select" id="lab-${name}" name="${name}">
        ${DESIGNS.map((d) => html`<option value="${d.id}" ${d.id === value ? 'selected' : ''}>${d.shortName}</option>`)}
      </select>
    </div>`;

  const designPicker =
    state.mode === 'compare'
      ? html`
          <div class="lab-group">
            ${designSelect('left', '左', state.left)}
            <button type="button" class="lab-button" data-shell="swap" title="左右を入れ替え">
              ${icon('arrowsUpDown', { size: 16, className: 'lab-swap-icon' })}<span>入れ替え</span>
            </button>
            ${designSelect('right', '右', state.right)}
          </div>`
      : html`
          ${designSelect('design', 'デザイン', state.left, 'lab-narrow-only')}
          <div class="lab-field lab-wide-only">
            <span class="lab-label" id="lab-design-label">デザイン</span>
            <div class="lab-seg lab-seg--designs" role="radiogroup" aria-labelledby="lab-design-label">
              ${DESIGNS.map(
                (d) => html`
                  <label class="lab-seg__item">
                    <input type="radio" name="design" value="${d.id}" ${d.id === state.left ? 'checked' : ''} />
                    <span>${d.shortName}</span>
                  </label>`,
              )}
            </div>
          </div>`;

  return html`
    <div class="lab-field">
      <span class="lab-label" id="lab-mode-label">表示</span>
      <div class="lab-seg" role="radiogroup" aria-labelledby="lab-mode-label">
        ${modeOptions.map(
          ([value, label]) => html`
            <label class="lab-seg__item">
              <input type="radio" name="mode" value="${value}" ${state.mode === value ? 'checked' : ''} />
              <span>${label}</span>
            </label>`,
        )}
      </div>
    </div>
    ${designPicker}
    <div class="lab-field">
      <label class="lab-label" for="lab-width">表示幅</label>
      <select class="lab-select" id="lab-width" name="width">
        ${WIDTHS.map((w) => html`<option value="${w.value}" ${w.value === state.width ? 'selected' : ''}>${w.label}</option>`)}
      </select>
    </div>`;
}

function renderPaneHead(design, pane) {
  return html`
    <div class="pane__meta">
      ${state.mode === 'compare' ? html`<span class="pane__side" aria-hidden="true">${pane.index === 0 ? '左' : '右'}</span>` : ''}
      <p class="pane__name">${design.name}</p>
      <p class="pane__summary">${design.summary}</p>
      <a class="pane__link" href="${design.url}" target="_blank" rel="noopener noreferrer"
        >公式サイト${icon('external', { size: 14 })}<span class="visually-hidden">（${design.name}、新しいタブで開く）</span></a
      >
    </div>
    <details class="pane__traits" ${pane.traitsOpen ? 'open' : ''}>
      <summary>設計上の特徴</summary>
      <dl class="pane__trait-list">
        ${Object.entries(TRAIT_LABELS).map(
          ([key, label]) => html`<div><dt>${label}</dt><dd>${design.traits[key]}</dd></div>`,
        )}
      </dl>
    </details>`;
}

/* ---------- イベント ---------- */

els.controls.addEventListener('change', (event) => {
  const { name, value } = event.target;
  if (name === 'mode') setMode(value);
  else if (name === 'design' || name === 'left') update({ left: value });
  else if (name === 'right') update({ right: value });
  else if (name === 'width') update({ width: value });
});

els.controls.addEventListener('submit', (event) => event.preventDefault());

els.controls.addEventListener('click', (event) => {
  if (event.target.closest('[data-shell="swap"]')) {
    update({ left: state.right, right: state.left });
    announce(`左右を入れ替えました。左：${getDesign(state.left).name}、右：${getDesign(state.right).name}`);
  }
});

function setMode(mode) {
  if (mode === 'compare' && state.right === state.left) {
    update({ mode, right: DESIGN_IDS.find((id) => id !== state.left) });
  } else {
    update({ mode });
  }
}

els.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    els.copyStatus.textContent = 'コピーしました';
  } catch {
    els.copyStatus.textContent = 'コピーできませんでした。アドレスバーの URL を利用してください';
  }
  setTimeout(() => {
    els.copyStatus.textContent = '';
  }, 4000);
});

window.addEventListener('popstate', () => {
  state = parseState(location.search, DESIGN_IDS);
  render();
});

function commitKeyword(value) {
  clearTimeout(keywordTimer);
  if (value !== state.keyword) update({ keyword: value }, { history: 'replace' });
}

function bindPaneEvents(pane) {
  const { section, index } = pane;

  section.addEventListener('toggle', (event) => {
    if (event.target.matches('.pane__traits')) pane.traitsOpen = event.target.open;
  }, true);

  section.addEventListener('input', (event) => {
    const field = event.target;
    if (field.dataset.bind !== 'keyword' || event.isComposing) return;
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => commitKeyword(field.value), 180);
  });

  section.addEventListener('compositionend', (event) => {
    if (event.target.dataset.bind === 'keyword') commitKeyword(event.target.value);
  });

  section.addEventListener('change', (event) => {
    if (event.target.dataset.bind === 'status') update({ status: event.target.value });
  });

  section.addEventListener('submit', (event) => {
    event.preventDefault();
    const field = event.target.querySelector('[data-bind="keyword"]');
    if (field) {
      commitKeyword(field.value);
      announce(`検索結果 ${countText(buildModel(state))}`);
    }
  });

  section.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el || !pane.root.contains(el)) return;
    event.preventDefault();
    handleAction(el.dataset.action, el, index);
  });

  section.addEventListener('keydown', (event) => {
    const modal = pane.root.querySelector('[data-modal]');
    if (!modal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      handleAction('close-detail', modal, index);
    } else if (event.key === 'Tab') {
      trapFocus(event, modal);
    }
  });
}

function trapFocus(event, container) {
  const focusables = [
    ...container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
  ].filter((el) => el.offsetParent !== null);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleAction(action, el, pane) {
  const { id, key, value, target } = el.dataset;
  switch (action) {
    case 'set-status':
      update({ status: value ?? '' });
      break;
    case 'sort':
      update({ sort: nextSort(state.sort, key) });
      break;
    case 'clear':
      clearTimeout(keywordTimer);
      update({ keyword: '', status: '' }, { focus: { pane, selector: '[data-bind="keyword"]' } });
      break;
    case 'clear-keyword':
      clearTimeout(keywordTimer);
      update({ keyword: '' }, { history: 'replace', focus: { pane, selector: '[data-bind="keyword"]' } });
      break;
    case 'open-detail':
      update({ detail: id, notice: null }, { focus: { pane, selector: '[data-focus="detail"]' } });
      break;
    case 'close-detail': {
      const closed = state.detail;
      update(
        { detail: null },
        { focus: { pane, selector: `[data-action="open-detail"][data-id="${closed}"]`, fallback: '[data-focus="heading"]' } },
      );
      break;
    }
    case 'new':
      showNotice('新規申請', `新規申請フォームは未実装です。${UNIMPLEMENTED_TEXT}`);
      break;
    case 'nav':
      if (target === 'applications') {
        if (state.detail) handleAction('close-detail', el, pane);
        else applyFocus({ pane, selector: '[data-focus="heading"]' });
      } else if (target === 'new') {
        handleAction('new', el, pane);
      } else {
        showNotice(`「${el.dataset.label ?? el.textContent.trim()}」画面`, `この画面は未実装です。${UNIMPLEMENTED_TEXT}`);
      }
      break;
    case 'dismiss-notice':
      update({ notice: null }, { history: 'replace', focus: { pane, selector: '[data-focus="heading"]' } });
      break;
    case 'toggle-ui':
      panes[pane].ui[key] = !panes[pane].ui[key];
      render();
      break;
    default:
      break;
  }
}

render();
history.replaceState(null, '', serializeState(state));
