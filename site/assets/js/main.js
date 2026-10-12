// 比較サイトのシェル：状態管理、URL 同期、比較操作、デザイン描画の振り分け。

import { DESIGNS, DESIGN_IDS, getDesign } from './designs/index.js';
import { back, complete, createForm, fillSample, hasErrors, setValue, submit } from './form.js';
import { html } from './html.js';
import { icon } from './icons.js';
import { buildAppModel } from './model.js';
import { patch } from './morph.js';
import { buildModel, countText, nextSort } from './query.js';
import { SCREENS, WIDTHS, parseState, serializeState } from './state.js';

const TRAIT_LABELS = {
  density: '情報密度と余白',
  navigation: 'ナビゲーション',
  table: 'テーブル',
  input: '検索・入力',
  actions: 'ボタン・操作',
  hierarchy: '情報の階層と配置',
};

const FORM_TRAIT_LABELS = {
  layout: 'レイアウトと余白',
  label: 'ラベル・補足・必須表記',
  errors: '入力エラー',
  confirm: '確認・操作',
};

const UNIMPLEMENTED_TEXT = 'このサンプルでは申請一覧と入力フォームのみを実装しています。';

const els = {
  controls: document.getElementById('lab-controls'),
  panes: document.getElementById('lab-panes'),
  live: document.getElementById('lab-live'),
  copy: document.getElementById('lab-copy'),
  copyStatus: document.getElementById('lab-copy-status'),
  formbar: document.getElementById('lab-formbar'),
};

// state：画面・比較条件・一覧の条件（URL と同期する）
// form：新規申請フォームの入力内容（メモリのみ。URL・履歴・ストレージには書かない）
let state = parseState(location.search, DESIGN_IDS);
let form = createForm();
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
    layout: null,
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

/** フォームの状態を更新して再描画する。URL・履歴は変えない。 */
function updateForm(next, { focus = null } = {}) {
  form = next;
  render();
  if (focus) applyFocus(focus);
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

  els.formbar.hidden = state.screen !== 'form';
  const model = buildAppModel(state, form);
  const layout = state.screen === 'form' ? `form-${form.step}` : 'list';
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
      navHref: (item) => {
        if (item.id === 'applications') return serializeState({ ...state, screen: 'list', detail: null });
        if (item.id === 'new') return serializeState({ ...state, screen: 'form', detail: null });
        return '#';
      },
    };
    // 画面や入力ステップが変わるときは差分更新せず入れ替える（別の画面の入力欄を再利用しない）
    const layoutChanged = pane.layout !== layout;
    const pageBefore = pane.root.firstElementChild?.dataset.page;
    patch(pane.root, design.render(model, ctx).toString(), { replace: changed || layoutChanged });
    // 詳細を別ページとして描くデザインでは、ページが切り替わったら先頭から表示する
    const pageAfter = pane.root.firstElementChild?.dataset.page;
    if (!changed && (layoutChanged || pageBefore !== pageAfter)) pane.scroll.scrollTop = 0;
    pane.layout = layout;
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
  const screenSelect = html`
    <div class="lab-field">
      <label class="lab-label" for="lab-screen">画面</label>
      <select class="lab-select" id="lab-screen" name="screen">
        ${SCREENS.map((v) => html`<option value="${v.value}" ${v.value === state.screen ? 'selected' : ''}>${v.label}</option>`)}
      </select>
    </div>`;
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
    ${screenSelect}
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
  const isForm = state.screen === 'form';
  const traitLabels = isForm ? FORM_TRAIT_LABELS : TRAIT_LABELS;
  const traits = isForm ? design.formTraits : design.traits;
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
        ${Object.entries(traitLabels).map(([key, label]) => html`<div><dt>${label}</dt><dd>${traits[key]}</dd></div>`)}
      </dl>
    </details>`;
}

/* ---------- イベント ---------- */

els.controls.addEventListener('change', (event) => {
  const { name, value } = event.target;
  if (name === 'screen') update({ screen: value, notice: null });
  else if (name === 'mode') setMode(value);
  else if (name === 'design' || name === 'left') update({ left: value });
  else if (name === 'right') update({ right: value });
  else if (name === 'width') update({ width: value });
});

els.controls.addEventListener('submit', (event) => event.preventDefault());

document.querySelector('.lab-bar').addEventListener('click', (event) => {
  const button = event.target.closest('[data-shell]');
  if (!button) return;
  switch (button.dataset.shell) {
    case 'swap':
      update({ left: state.right, right: state.left });
      announce(`左右を入れ替えました。左：${getDesign(state.left).name}、右：${getDesign(state.right).name}`);
      break;
    case 'form-sample':
      updateForm(fillSample('valid'));
      announce('入力例を入力しました');
      break;
    case 'form-error': {
      const next = fillSample('invalid');
      updateForm(next);
      announce(`入力エラーを再現しました。${Object.keys(next.errors).length}件のエラーがあります`);
      break;
    }
    case 'form-clear':
      updateForm(createForm());
      announce('入力内容をクリアしました');
      break;
    default:
      break;
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

  // IME の変換中（isComposing）は状態を更新せず、確定（compositionend）で反映する。
  // 変換中に再描画して入力を壊さないため、入力中の欄は morph でも触らない。
  section.addEventListener('input', (event) => {
    const field = event.target;
    if (event.isComposing) return;
    if (field.dataset.bind === 'keyword') {
      clearTimeout(keywordTimer);
      keywordTimer = setTimeout(() => commitKeyword(field.value), 180);
    } else if (field.dataset.field) {
      commitField(field);
    }
  });

  section.addEventListener('compositionend', (event) => {
    if (event.target.dataset.bind === 'keyword') commitKeyword(event.target.value);
    else if (event.target.dataset.field) commitField(event.target);
  });

  section.addEventListener('change', (event) => {
    if (event.target.dataset.bind === 'status') update({ status: event.target.value });
    else if (event.target.dataset.field) commitField(event.target);
  });

  section.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.dataset.form === 'entry') {
      submitEntry(index);
      return;
    }
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
    // 日本語入力の変換確定の Enter でフォームが送信されないようにする（Safari は確定後に keyCode 229 の Enter が来る）
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229) && event.target.dataset.field) {
      event.preventDefault();
      return;
    }
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

function commitField(field) {
  const value = field.type === 'checkbox' ? field.checked : field.value;
  const next = setValue(form, field.dataset.field, value);
  if (next !== form) updateForm(next);
}

/** 「確認へ」：エラーがあればデザインごとの方法でフォーカスを移し、なければ確認画面へ進む。 */
function submitEntry(paneIndex) {
  const next = submit(form);
  if (!hasErrors(next.errors)) {
    updateForm(next, { focus: { pane: paneIndex, selector: '[data-focus="heading"]' } });
    announce('確認画面です。内容を確認してください');
    return;
  }
  const design = getDesign(paneIndex === 0 ? state.left : state.right);
  const selector = design.errorFocus === 'summary' ? '[data-focus="error-summary"]' : '[data-focus="first-error"]';
  // エラーの一覧（サマリー・バナー）が見えるよう、先頭から表示した状態でフォーカスする
  panes[paneIndex].scroll.scrollTop = 0;
  updateForm(next, { focus: { pane: paneIndex, selector, fallback: '[data-focus="heading"]' } });
  announce(`入力エラーが${Object.keys(next.errors).length}件あります`);
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
  const { id, key, value, target, gotoField: field } = el.dataset;
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
      update({ screen: 'form', detail: null, notice: null }, { focus: { pane, selector: '[data-focus="heading"]' } });
      break;
    case 'form-back':
      updateForm(back(form), {
        focus: { pane, selector: field ? `[data-field="${field}"]` : '[data-focus="heading"]', fallback: '[data-focus="heading"]' },
      });
      break;
    case 'form-confirm':
      updateForm(complete(form), { focus: { pane, selector: '[data-focus="heading"]' } });
      announce('申請の入力が完了しました（デモのため、送信・登録はされません）');
      break;
    case 'form-restart':
      updateForm(createForm(), { focus: { pane, selector: '[data-focus="heading"]' } });
      break;
    case 'focus-field':
      applyFocus({ pane, selector: `[data-field="${field}"]` });
      break;
    case 'nav':
      if (target === 'applications') {
        if (state.screen === 'form') update({ screen: 'list', detail: null, notice: null }, { focus: { pane, selector: '[data-focus="heading"]' } });
        else if (state.detail) handleAction('close-detail', el, pane);
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
