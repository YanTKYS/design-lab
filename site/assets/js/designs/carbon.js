// IBM Carbon Design System の考え方を参考にした表示。
// 黒い UI シェルとサイドナビ、ツールバー一体型のデータテーブル、角のない 48px ボタン、
// 展開行による詳細表示、トースト通知など、業務アプリ向けの高密度な構成。

import { attr, html } from '../html.js';
import { icon } from '../icons.js';
import { countText, formatDate } from '../query.js';
import { dashboardPage } from './carbon.dashboard.js';
import { formPage } from './carbon.form.js';

const TAG_COLORS = { info: 'blue', progress: 'purple', warning: 'magenta', success: 'green', error: 'red' };

function shellHeader(model, ctx) {
  const open = Boolean(ctx.ui.sidenav);
  return html`
    <header class="cds-header">
      <button
        type="button"
        class="cds-header__action cds-header__menu-toggle"
        data-action="toggle-ui"
        data-key="sidenav"
        aria-expanded="${open ? 'true' : 'false'}"
        aria-controls="${ctx.uid}-cds-sidenav"
        aria-label="${open ? 'メニューを閉じる' : 'メニューを開く'}"
      >
        ${icon(open ? 'close' : 'menu', { size: 20, stroke: 1.5 })}
      </button>
      <a class="cds-header__name" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">
        <span class="cds-header__prefix">${model.system.org}</span>${model.system.name}
      </a>
      <div class="cds-header__global">
        <button type="button" class="cds-header__action" data-action="nav" data-target="help" data-label="ヘルプ" aria-label="ヘルプ">
          ${icon('help', { size: 20, stroke: 1.5 })}
        </button>
        <button type="button" class="cds-header__action" data-action="nav" data-target="account" data-label="アカウント" aria-label="アカウント（${model.system.user}）">
          ${icon('user', { size: 20, stroke: 1.5 })}
        </button>
      </div>
    </header>`;
}

function sideNav(model, ctx) {
  return html`
    <nav class="cds-sidenav ${ctx.ui.sidenav ? 'is-open' : ''}" id="${ctx.uid}-cds-sidenav" aria-label="サイドナビゲーション">
      <ul>
        ${model.nav.map(
          (item) => html`
            <li>
              <a
                class="cds-sidenav__link"
                href="${ctx.navHref(item)}"
                data-action="nav"
                data-target="${item.id}"
                ${attr('aria-current', item.current && 'page')}
                >${icon(item.icon, { size: 16, stroke: 1.5 })}<span>${item.label}</span></a
              >
            </li>`,
        )}
      </ul>
    </nav>`;
}

function toast(model) {
  if (!model.notice) return '';
  return html`
    <div class="cds-toast">
      ${icon('info', { size: 20, stroke: 2, className: 'cds-toast__icon' })}
      <div class="cds-toast__text">
        <p class="cds-toast__title">${model.notice.title}</p>
        <p class="cds-toast__subtitle">${model.notice.text}</p>
      </div>
      <button type="button" class="cds-toast__close" data-action="dismiss-notice" aria-label="通知を閉じる">
        ${icon('close', { size: 20, stroke: 1.5 })}
      </button>
    </div>`;
}

function tag(status) {
  return html`<span class="cds-tag" data-color="${TAG_COLORS[status.tone]}">${status.label}</span>`;
}

function structuredDetail(d) {
  const items = [
    ['担当課', d.department],
    ['受付方法', d.channel],
    ['受付日', formatDate(d.receivedAt, 'slash')],
    ['処理期限', formatDate(d.dueAt, 'slash')],
    ['備考', d.note || '—'],
  ];
  return html`
    <dl class="cds-structured">
      ${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}
    </dl>`;
}

function sortHeader(c) {
  const arrow = c.sorted === 'asc' ? 'arrowUp' : c.sorted === 'desc' ? 'arrowDown' : 'arrowsUpDown';
  return html`
    <th scope="col" aria-sort="${c.ariaSort}">
      <button type="button" class="cds-table-sort ${c.sorted ? 'is-sorted' : ''}" data-action="sort" data-key="${c.key}">
        <span>${c.label}</span>${icon(arrow, { size: 16, stroke: 1.5, className: 'cds-table-sort__icon' })}
      </button>
    </th>`;
}

function rows(model) {
  return model.rows.map((row) => {
    const expanded = model.detail?.id === row.id;
    return html`
      <tr class="${expanded ? 'is-expanded' : ''}">
        <td class="cds-table-expand">
          <button
            type="button"
            class="cds-table-expand__button"
            data-action="${expanded ? 'close-detail' : 'open-detail'}"
            data-id="${row.id}"
            aria-expanded="${expanded ? 'true' : 'false'}"
            aria-label="${row.id} の詳細を${expanded ? '閉じる' : '表示'}"
          >
            ${icon('chevronRight', { size: 16, stroke: 1.5 })}
          </button>
        </td>
        <td class="cds-nowrap">${row.id}</td>
        <td>${row.applicant}</td>
        <td>${row.type}</td>
        <td class="cds-nowrap">${formatDate(row.receivedAt, 'slash')}</td>
        <td>${tag(row.status)}</td>
      </tr>
      ${expanded ? html`<tr class="cds-expanded-row"><td></td><td colspan="5">${structuredDetail(row)}</td></tr>` : ''}`;
  });
}

/** 絞り込みで選択中の行が表に無いときは、表の上にタイルで詳細を示す。 */
function detachedDetail(model) {
  const d = model.detail;
  if (!d || model.rows.some((r) => r.id === d.id)) return '';
  return html`
    <section class="cds-tile" aria-label="選択中の申請">
      <div class="cds-tile__head">
        <p class="cds-tile__title">${d.id} ${d.applicant}　${tag(d.status)}</p>
        <button type="button" class="cds-btn cds-btn--ghost" data-action="close-detail">閉じる</button>
      </div>
      <p class="cds-tile__note">現在の絞り込み条件では一覧に表示されていない申請です。</p>
      ${structuredDetail(d)}
    </section>`;
}

/** ダッシュボードから引き継いだ絞り込み条件（タグ）と解除。 */
function scopeNotice(model) {
  if (!model.scope.active) return '';
  return html`
    <div class="cds-scope" data-scope>
      <span class="cds-scope__label">引き継いだフィルター</span>
      ${model.scope.items.map((i) => html`<span class="cds-tag cds-tag--filter" data-color="blue">${i.label}：${i.text}</span>`)}
      <button type="button" class="cds-btn cds-btn--ghost" data-action="clear-scope">すべて解除</button>
    </div>`;
}

function dataTable(model, ctx) {
  const searchId = `${ctx.uid}-cds-search`;
  const statusId = `${ctx.uid}-cds-status`;
  return html`
    <section class="cds-data-table-container" aria-labelledby="${ctx.uid}-cds-table-title">
      <div class="cds-data-table-header">
        <h3 class="cds-data-table-header__title" id="${ctx.uid}-cds-table-title">申請</h3>
        <p class="cds-data-table-header__description">申請者・申請種別・受付番号で検索し、行を展開して詳細を確認します。</p>
      </div>
      <div class="cds-table-toolbar">
        <form class="cds-search" role="search" aria-label="申請の検索">
          ${icon('search', { size: 16, stroke: 1.5, className: 'cds-search__icon' })}
          <label class="visually-hidden" for="${searchId}">申請を検索</label>
          <input
            class="cds-search__input"
            id="${searchId}"
            type="search"
            placeholder="申請を検索"
            data-bind="keyword"
            value="${model.keyword}"
            autocomplete="off"
          />
          ${model.keyword
            ? html`<button type="button" class="cds-search__clear" data-action="clear-keyword" aria-label="検索条件をクリア">
                ${icon('close', { size: 16, stroke: 1.5 })}
              </button>`
            : ''}
        </form>
        <div class="cds-select-inline">
          <label class="cds-select-inline__label" for="${statusId}">状態</label>
          <div class="cds-select-inline__field">
            <select class="cds-select-inline__select" id="${statusId}" data-bind="status">
              ${model.statusOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label} (${o.count})</option>`)}
            </select>
            ${icon('chevronDown', { size: 16, stroke: 1.5, className: 'cds-select-inline__icon' })}
          </div>
        </div>
        <button type="button" class="cds-btn cds-btn--primary" data-action="new">
          新規申請${icon('add', { size: 16, stroke: 1.5, className: 'cds-btn__icon' })}
        </button>
      </div>
      ${scopeNotice(model)} ${detachedDetail(model)}
      <div class="cds-data-table-content">
        <table class="cds-data-table">
          <thead>
            <tr>
              <th scope="col" class="cds-table-expand"><span class="visually-hidden">詳細の開閉</span></th>
              ${model.columns.map(sortHeader)}
            </tr>
          </thead>
          <tbody>
            ${model.rows.length
              ? rows(model)
              : html`<tr><td colspan="6" class="cds-data-table__empty">一致する申請がありません</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="cds-pagination">
        <span>${countText(model)}を表示</span>
      </div>
    </section>`;
}

export default {
  id: 'carbon',
  name: 'IBM Carbon Design System',
  shortName: 'Carbon',
  url: 'https://carbondesignsystem.com/',
  summary:
    '業務・データ中心のアプリ向け。黒い UI シェル、ツールバー一体型のデータテーブル、角のないボタンと 2px 単位の厳密なグリッドで、高い情報密度を保つ。',
  traits: {
    density: '本文14px・行の高さ48pxの高密度。余白は8pxグリッドで詰め、画面幅いっぱいに情報を並べる。',
    navigation: '高さ48pxの黒いヘッダー（UI シェル）と左のサイドナビ。狭い幅ではハンバーガーで開閉する。',
    table: 'タイトル・説明・ツールバー・表・ページ情報が一体のコンテナ。見出し行は濃いグレー、状態は丸いタグ。詳細は行の展開で表示する。',
    input: 'ツールバー内の常設検索欄（下線のみの枠）とインラインのセレクト。ラベルは視覚的に省略または左置き。',
    actions: '角丸なし・高さ48pxのボタン。テキストは左寄せ、アイコンは右端。主要操作はツールバー右端に置く。',
    hierarchy: 'パンくず → ページ見出し → テーブルコンテナ（見出し・ツールバー・表）。通知は右上のトーストで重ねて表示する。',
  },
  formTraits: {
    layout: '2カラムのグリッド。「申請者」「申請内容」「確認事項」のフィールドセットで区切り、申請内容と同意は全幅。最大幅は672px。',
    label: 'ラベルは欄の上の小さな文字。入力例は欄の中（プレースホルダー）、補足は欄の下のヘルパーテキスト。必須は無印で、任意の項目だけ「（任意）」と示す。',
    errors: '欄を赤い2pxの枠で囲み、右端に警告アイコン。ヘルパーテキストはエラー文に置き換わる。上部にインライン通知（件数）を出し、最初のエラー項目へフォーカスする。',
    confirm: '進行インジケーター（入力・確認・完了）。確認は「項目／入力内容」の構造化リスト。左右が隙間なく並ぶ高さ64pxのボタンセット（左：修正する、右：申請する）。',
  },
  dashboardTraits: {
    kpi: '指標は 1px の隙間だけで並ぶ薄いタイル（数値は32px・細字、ラベルと注記は12px）。各タイルの下端に一覧へのリンク。',
    density: '本文14px・8px グリッドで詰めた高密度。タイトルとタイルの間も 8〜16px で、1 画面に指標とグラフ 4 面を収める。',
    chart: '縦棒は細く小さい値ラベル、処理状況は中央に合計を置いたドーナツ＋凡例テーブル（件数・割合・リンク）、種別は小さな横棒。',
    filter: 'ページ見出しの直下の 1 行のツールバーに、インラインのセレクト（対象期間・担当課）とリセット、基準日を置く。',
    hierarchy: '見出し→ツールバー→指標タイル→2 列のタイルグリッド（月別／処理状況／種別／集計の定義）。面の区切りは枠線のみ。',
  },
  errorFocus: 'field',
  render(model, ctx) {
    return html`
      <div class="ds-carbon">
        ${shellHeader(model, ctx)}
        <div class="cds-shell">
          ${sideNav(model, ctx)}
          <div class="cds-content">
            <nav class="cds-breadcrumb" aria-label="パンくずリスト">
              <ol>
                <li><a href="#" data-action="nav" data-target="home" data-label="ホーム">ホーム</a></li>
                ${model.screen === 'form'
                  ? html`<li><a href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">申請一覧</a></li>
                      <li><span aria-current="page">新規申請</span></li>`
                  : model.screen === 'dashboard'
                    ? html`<li><span aria-current="page">ダッシュボード</span></li>`
                    : html`<li><span aria-current="page">申請一覧</span></li>`}
              </ol>
            </nav>
            ${model.screen === 'form'
              ? formPage(model, ctx)
              : model.screen === 'dashboard'
                ? dashboardPage(model, ctx)
                : html`<h2 class="cds-page-title" tabindex="-1" data-focus="heading">申請一覧</h2> ${dataTable(model, ctx)}`}
          </div>
        </div>
        ${toast(model)}
      </div>`;
  },
};
