// Microsoft Fluent 2 の考え方を参考にした表示。
// ブランド色のアプリヘッダーと左のナビゲーションドロワー、影のあるカード面、
// コマンドバー＋タブ型フィルター、右から開くオーバーレイドロワーによる詳細表示が特徴。

import { attr, html } from '../html.js';
import { TONE_ICONS, icon } from '../icons.js';
import { countText, formatDate } from '../query.js';
import { formPage } from './fluent.form.js';

const BADGE_COLORS = { info: 'brand', progress: 'informative', warning: 'warning', success: 'success', error: 'danger' };

function appHeader(model, ctx) {
  const open = Boolean(ctx.ui.nav);
  return html`
    <header class="fui-appbar">
      <button
        type="button"
        class="fui-appbar__button fui-appbar__hamburger"
        data-action="toggle-ui"
        data-key="nav"
        aria-expanded="${open ? 'true' : 'false'}"
        aria-controls="${ctx.uid}-fui-nav"
        aria-label="ナビゲーション"
      >
        ${icon('menu', { size: 20, stroke: 1.5 })}
      </button>
      <a class="fui-appbar__title" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">
        ${model.system.name}<span class="fui-appbar__org">${model.system.org}</span>
      </a>
      <button
        type="button"
        class="fui-appbar__avatar"
        data-action="nav"
        data-target="account"
        data-label="アカウント"
        aria-label="アカウント（${model.system.user}）"
      >
        審A
      </button>
    </header>`;
}

function navDrawer(model, ctx) {
  return html`
    <nav class="fui-nav ${ctx.ui.nav ? 'is-open' : ''}" id="${ctx.uid}-fui-nav" aria-label="ナビゲーション">
      <p class="fui-nav__section">申請管理</p>
      <ul>
        ${model.nav.map(
          (item) => html`
            <li>
              <a
                class="fui-nav__item"
                href="${ctx.navHref(item)}"
                data-action="nav"
                data-target="${item.id}"
                ${attr('aria-current', item.current && 'page')}
                >${icon(item.icon, { size: 20, stroke: 1.5 })}<span>${item.label}</span></a
              >
            </li>`,
        )}
      </ul>
    </nav>`;
}

function messageBar(model) {
  if (!model.notice) return '';
  return html`
    <div class="fui-messagebar">
      ${icon('info', { size: 20, stroke: 1.5, className: 'fui-messagebar__icon' })}
      <p class="fui-messagebar__body"><strong>${model.notice.title}</strong> ${model.notice.text}</p>
      <button type="button" class="fui-button fui-button--subtle fui-button--icon" data-action="dismiss-notice" aria-label="通知を閉じる">
        ${icon('close', { size: 16, stroke: 1.5 })}
      </button>
    </div>`;
}

function badge(status) {
  return html`<span class="fui-badge" data-color="${BADGE_COLORS[status.tone]}"
    >${icon(TONE_ICONS[status.tone], { size: 12, stroke: 2 })}${status.label}</span
  >`;
}

function filterTabs(model, ctx) {
  return html`
    <div class="fui-tablist" role="radiogroup" aria-label="処理状態で絞り込み">
      ${model.statusOptions.map(
        (o) => html`
          <label class="fui-tab">
            <input type="radio" name="${ctx.uid}-fui-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
            <span class="fui-tab__content">${o.label}<span class="fui-tab__count">${o.count}</span></span>
          </label>`,
      )}
    </div>`;
}

function commandBar(model, ctx) {
  const searchId = `${ctx.uid}-fui-search`;
  return html`
    <div class="fui-toolbar" role="toolbar" aria-label="申請の操作">
      <button type="button" class="fui-button fui-button--primary" data-action="new">
        ${icon('add', { size: 20, stroke: 1.5 })}新規申請
      </button>
      <span class="fui-toolbar__divider" aria-hidden="true"></span>
      <form class="fui-searchbox" role="search" aria-label="申請の検索">
        ${icon('search', { size: 16, stroke: 1.5, className: 'fui-searchbox__icon' })}
        <label class="visually-hidden" for="${searchId}">検索</label>
        <input
          class="fui-searchbox__input"
          id="${searchId}"
          type="search"
          placeholder="受付番号・申請者・種別で検索"
          data-bind="keyword"
          value="${model.keyword}"
          autocomplete="off"
        />
        ${model.keyword
          ? html`<button type="button" class="fui-searchbox__dismiss" data-action="clear-keyword" aria-label="検索語を消去">
              ${icon('close', { size: 16, stroke: 1.5 })}
            </button>`
          : ''}
      </form>
    </div>`;
}

function dataGrid(model) {
  if (model.rows.length === 0) {
    return html`<div class="fui-empty">${icon('search', { size: 24 })}<p>条件に一致する申請はありません</p></div>`;
  }
  return html`
    <div class="fui-grid-wrap">
      <table class="fui-grid">
        <thead>
          <tr>
            ${model.columns.map(
              (c) => html`
                <th scope="col" aria-sort="${c.ariaSort}">
                  <button type="button" class="fui-grid__sort" data-action="sort" data-key="${c.key}">
                    ${c.label}${c.sorted ? icon(c.sorted === 'asc' ? 'chevronUp' : 'chevronDown', { size: 16, stroke: 1.5 }) : ''}
                  </button>
                </th>`,
            )}
            <th scope="col"><span class="visually-hidden">操作</span></th>
          </tr>
        </thead>
        <tbody>
          ${model.rows.map(
            (row) => html`
              <tr class="${model.detail?.id === row.id ? 'is-selected' : ''}">
                <td class="fui-grid__id">${row.id}</td>
                <td>
                  <span class="fui-persona"><span class="fui-persona__avatar" aria-hidden="true">${row.applicant.slice(0, 1)}</span>${row.applicant}</span>
                </td>
                <td>${row.type}</td>
                <td class="fui-grid__date">${formatDate(row.receivedAt, 'slash')}</td>
                <td>${badge(row.status)}</td>
                <td class="fui-grid__action">
                  <button type="button" class="fui-button fui-button--subtle" data-action="open-detail" data-id="${row.id}">
                    詳細<span class="visually-hidden">（${row.id}）</span>${icon('chevronRight', { size: 16, stroke: 1.5 })}
                  </button>
                </td>
              </tr>`,
          )}
        </tbody>
      </table>
    </div>`;
}

function drawer(model, ctx) {
  const d = model.detail;
  if (!d) return '';
  const fields = [
    ['受付番号', d.id],
    ['申請者', d.applicant],
    ['申請種別', d.type],
    ['担当課', d.department],
    ['受付日', formatDate(d.receivedAt)],
    ['受付方法', d.channel],
    ['処理期限', formatDate(d.dueAt)],
    ['備考', d.note || '—'],
  ];
  return html`
    <div class="fui-drawer-backdrop" data-action="close-detail"></div>
    <div class="fui-drawer" role="dialog" aria-modal="true" aria-labelledby="${ctx.uid}-fui-drawer-title" data-modal>
      <div class="fui-drawer__header">
        <h3 class="fui-drawer__title" id="${ctx.uid}-fui-drawer-title" tabindex="-1" data-focus="detail">申請の詳細</h3>
        <button type="button" class="fui-button fui-button--subtle fui-button--icon" data-action="close-detail" aria-label="閉じる">
          ${icon('close', { size: 20, stroke: 1.5 })}
        </button>
      </div>
      <div class="fui-drawer__body">
        <div class="fui-drawer__status">${badge(d.status)}</div>
        <dl class="fui-fields">${fields.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
      </div>
      <div class="fui-drawer__footer">
        <button type="button" class="fui-button fui-button--secondary" data-action="close-detail">閉じる</button>
      </div>
    </div>`;
}

export default {
  id: 'fluent',
  name: 'Microsoft Fluent 2',
  shortName: 'Fluent 2',
  url: 'https://fluent2.microsoft.design/',
  summary:
    'Microsoft 365 系の生産性アプリ向け。ブランド色のヘッダーとナビゲーションドロワー、影と角丸のあるカード面、コマンドバー中心の操作で、軽やかな中密度の UI を作る。',
  traits: {
    density: '本文14px・行の高さ44pxの中密度。灰色の背景に白いカード面を浮かせ、面の重なりで領域を分ける。',
    navigation: 'ブランド色のアプリヘッダー＋左のナビゲーションドロワー。選択中の項目は背景色と縦の小さなインジケーター。',
    table: '縦罫線のない DataGrid 風の表。行のホバーで背景が変わり、申請者はアバター付き、状態はアイコン付きの丸いバッジ。',
    input: '下線が強調される角丸4pxの検索ボックス（虫眼鏡アイコン・消去ボタン付き）と、件数付きのタブ型フィルター。',
    actions: '高さ32px・角丸4pxの小ぶりなボタン。主要操作はコマンドバー先頭、行の操作は背景のない Subtle ボタン。',
    hierarchy: 'ページ見出しの下に、コマンドバー・フィルター・表をまとめた1枚のカード。詳細は右から開くドロワーで一覧に重ねる。',
  },
  formTraits: {
    layout: '1枚の白いカードの中に2カラム。「申請者」「申請内容」「確認事項」を小見出しで区切る。最大幅は880px。',
    label: 'ラベルの右に赤い「＊」で必須を示す。補足と入力例は欄の下の小さなヒント。入力欄は高さ32px・下辺が濃い線。',
    errors: '欄の赤枠に加え、欄の下に警告アイコン付きの検証メッセージ（ヒントの上）を表示。上部の MessageBar に件数と「最初の項目へ」ボタンを置く。',
    confirm: '見出しの横に「手順 n / 3」。確認はカード内の項目名・値の2列で、左寄せの「申請する」（主）と「戻って修正」（副）。',
  },
  errorFocus: 'field',
  render(model, ctx) {
    const overlay = model.screen === 'list' && model.detail;
    return html`
      <div class="ds-fluent">
        <div class="fui-app" ${overlay ? 'inert' : ''}>
        ${appHeader(model, ctx)}
        <div class="fui-body">
          ${navDrawer(model, ctx)}
          <div class="fui-content">
            ${messageBar(model)}
            ${model.screen === 'form'
              ? formPage(model, ctx)
              : html`<div class="fui-page-head">
                    <h2 class="fui-title" tabindex="-1" data-focus="heading">申請一覧</h2>
                    <p class="fui-caption">${countText(model)}を表示</p>
                  </div>
                  <section class="fui-card" aria-label="申請一覧">
                    ${commandBar(model, ctx)} ${filterTabs(model, ctx)} ${dataGrid(model)}
                  </section>`}
          </div>
        </div>
        </div>
        ${model.screen === 'list' ? drawer(model, ctx) : ''}
      </div>`;
  },
};
