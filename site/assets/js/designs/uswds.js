// U.S. Web Design System（USWDS 3 の既定テーマ）の考え方を参考にした表示。
// サイトの正当性を示す最上部のバナー、セリフ体の見出し、ボタン一体型の検索欄、
// 並べ替え列を強調する罫線つきの表、狭い幅での縦積み表、モーダルでの詳細表示が特徴。
// 米国政府固有の識別要素（国旗・.gov 表記）は、日本の自治体向けの内容に置き換えている。

import { html } from '../html.js';
import { icon } from '../icons.js';
import { countText, formatDate } from '../query.js';

function banner(ctx) {
  const open = Boolean(ctx.ui.banner);
  return html`
    <section class="usa-banner" aria-label="このサイトについて">
      <div class="usa-banner__header">
        <div class="usa-banner__inner">
          <span class="usa-banner__mark" aria-hidden="true"></span>
          <p class="usa-banner__text">さくら野市（架空）のデモサイトです</p>
          <button
            type="button"
            class="usa-banner__button"
            data-action="toggle-ui"
            data-key="banner"
            aria-expanded="${open ? 'true' : 'false'}"
            aria-controls="${ctx.uid}-usa-banner"
          >
            公式サイトの見分け方${icon(open ? 'chevronUp' : 'chevronDown', { size: 16, stroke: 2 })}
          </button>
        </div>
      </div>
      <div class="usa-banner__content ${open ? 'is-open' : ''}" id="${ctx.uid}-usa-banner">
        <div class="usa-banner__guidance">
          ${icon('home', { size: 40, stroke: 1.5 })}
          <p><strong>公式サイトのドメイン</strong><br />地方公共団体の公式サイトは、多くが「.lg.jp」などのドメインを使います。</p>
        </div>
        <div class="usa-banner__guidance">
          ${icon('checkCircle', { size: 40, stroke: 1.5 })}
          <p><strong>安全な接続</strong><br />「https://」で始まる URL は、通信が暗号化されていることを示します。</p>
        </div>
      </div>
    </section>`;
}

function header(model, ctx) {
  const open = Boolean(ctx.ui.nav);
  return html`
    <header class="usa-header">
      <div class="usa-nav-container">
        <div class="usa-navbar">
          <div class="usa-logo">
            <a href="${ctx.href({ detail: null })}" data-action="nav" data-target="applications">
              <span class="usa-logo__org">${model.system.org}</span>${model.system.name}
            </a>
          </div>
          <button type="button" class="usa-menu-btn" data-action="toggle-ui" data-key="nav" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${ctx.uid}-usa-nav">
            メニュー
          </button>
        </div>
        ${open ? html`<div class="usa-overlay" data-action="toggle-ui" data-key="nav"></div>` : ''}
        <nav class="usa-nav ${open ? 'is-visible' : ''}" id="${ctx.uid}-usa-nav" aria-label="メインメニュー">
          <button type="button" class="usa-nav__close" data-action="toggle-ui" data-key="nav" aria-label="メニューを閉じる">
            ${icon('close', { size: 24, stroke: 2 })}
          </button>
          <ul class="usa-nav__primary">
            ${model.nav.map(
              (item) => html`
                <li class="usa-nav__primary-item">
                  <a
                    class="usa-nav-link ${item.current ? 'usa-current' : ''}"
                    href="${item.current ? ctx.href({ detail: null }) : '#'}"
                    data-action="nav"
                    data-target="${item.id}"
                    ${item.current ? 'aria-current="page"' : ''}
                    ><span>${item.label}</span></a
                  >
                </li>`,
            )}
          </ul>
        </nav>
      </div>
    </header>`;
}

function alert(model) {
  if (!model.notice) return '';
  return html`
    <div class="usa-alert usa-alert--info usa-alert--slim">
      <div class="usa-alert__body">
        <p class="usa-alert__text"><strong>${model.notice.title}：</strong>${model.notice.text}</p>
        <button type="button" class="usa-button usa-button--unstyled" data-action="dismiss-notice">閉じる</button>
      </div>
    </div>`;
}

function searchArea(model, ctx) {
  const kwId = `${ctx.uid}-usa-search`;
  const stId = `${ctx.uid}-usa-status`;
  return html`
    <div class="usa-filter-row">
      <div class="usa-filter-row__search">
        <label class="usa-label" for="${kwId}">キーワード</label>
        <form class="usa-search" role="search" aria-label="申請の検索">
          <input class="usa-input usa-search__input" id="${kwId}" type="search" data-bind="keyword" value="${model.keyword}" autocomplete="off" />
          <button class="usa-button usa-search__button" type="submit">
            ${icon('search', { size: 20, stroke: 2.25 })}<span>検索</span>
          </button>
        </form>
      </div>
      <div class="usa-filter-row__status">
        <label class="usa-label" for="${stId}">処理状態</label>
        <div class="usa-select-wrap">
          <select class="usa-select" id="${stId}" data-bind="status">
            ${model.statusOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}（${o.count}）</option>`)}
          </select>
          ${icon('chevronDown', { size: 20, stroke: 2, className: 'usa-select-wrap__icon' })}
        </div>
      </div>
    </div>
    ${model.filtered
      ? html`<p class="usa-clear"><button type="button" class="usa-button usa-button--unstyled" data-action="clear">すべての条件をクリア</button></p>`
      : ''}`;
}

function sortIcon(c) {
  if (c.sorted === 'asc') return icon('arrowUp', { size: 20, stroke: 2 });
  if (c.sorted === 'desc') return icon('arrowDown', { size: 20, stroke: 2 });
  return icon('arrowsUpDown', { size: 20, stroke: 1.75 });
}

function table(model) {
  if (model.rows.length === 0) {
    return html`<div class="usa-summary-box"><p class="usa-summary-box__text">条件に一致する申請はありません。キーワードや処理状態を変更してください。</p></div>`;
  }
  const labels = Object.fromEntries(model.columns.map((c) => [c.key, c.label]));
  const active = (key) => (model.sort.key === key ? 'data-sort-active' : '');
  return html`
    <div class="usa-table-container">
      <table class="usa-table usa-table--stacked">
        <caption>${countText(model)}を表示</caption>
        <thead>
          <tr>
            ${model.columns.map(
              (c) => html`
                <th scope="col" aria-sort="${c.ariaSort}" ${c.sorted ? 'data-sort-active' : ''}>
                  <span class="usa-table__header-label">${c.label}</span>
                  <button type="button" class="usa-table__header__button" data-action="sort" data-key="${c.key}" title="${c.label}で並べ替え">
                    ${sortIcon(c)}<span class="visually-hidden">${c.label}で並べ替え</span>
                  </button>
                </th>`,
            )}
            <th scope="col"><span class="visually-hidden">操作</span></th>
          </tr>
        </thead>
        <tbody>
          ${model.rows.map(
            (row) => html`
              <tr>
                <th scope="row" data-label="${labels.id}" ${active('id')}>${row.id}</th>
                <td data-label="${labels.applicant}" ${active('applicant')}>${row.applicant}</td>
                <td data-label="${labels.type}" ${active('type')}>${row.type}</td>
                <td data-label="${labels.receivedAt}" ${active('receivedAt')}>${formatDate(row.receivedAt, 'slash')}</td>
                <td data-label="${labels.status}" ${active('status')}><span class="usa-tag">${row.status.label}</span></td>
                <td class="usa-table__action">
                  <button type="button" class="usa-button usa-button--outline usa-button--small" data-action="open-detail" data-id="${row.id}">
                    詳細<span class="visually-hidden">（${row.id}）</span>
                  </button>
                </td>
              </tr>`,
          )}
        </tbody>
      </table>
    </div>`;
}

function modal(model, ctx) {
  const d = model.detail;
  if (!d) return '';
  const items = [
    ['申請者', d.applicant],
    ['申請種別', d.type],
    ['処理状態', html`<span class="usa-tag">${d.status.label}</span>`],
    ['担当課', d.department],
    ['受付日', formatDate(d.receivedAt)],
    ['受付方法', d.channel],
    ['処理期限', formatDate(d.dueAt)],
    ['備考', d.note || 'なし'],
  ];
  return html`
    <div class="usa-modal-overlay" data-action="close-detail"></div>
    <div class="usa-modal" role="dialog" aria-modal="true" aria-labelledby="${ctx.uid}-usa-modal-title" data-modal>
      <div class="usa-modal__content">
        <h3 class="usa-modal__heading" id="${ctx.uid}-usa-modal-title" tabindex="-1" data-focus="detail">申請 ${d.id}</h3>
        <dl class="usa-modal__list">${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
        <div class="usa-modal__footer">
          <button type="button" class="usa-button" data-action="close-detail">閉じる</button>
        </div>
      </div>
      <button type="button" class="usa-modal__close" data-action="close-detail" aria-label="このウィンドウを閉じる">
        ${icon('close', { size: 24, stroke: 2 })}
      </button>
    </div>`;
}

export default {
  id: 'uswds',
  name: 'U.S. Web Design System',
  shortName: 'USWDS',
  url: 'https://designsystem.digital.gov/',
  summary:
    '米国連邦政府のサイト向け。正当性を示す最上部バナー、セリフ体の見出し、ボタン一体型の検索欄、罫線つきの表などで、公共サービスの信頼感と一貫性を重視する。',
  traits: {
    density: '本文17px・行間1.5の標準的な密度。表のセルは罫線で区切り、余白は8px単位の比較的コンパクトな設定。',
    navigation: 'サイトの正当性を示すバナーの下に、ロゴ＋横並びのメインナビ。狭い幅では右から開くパネルになる。',
    table: '全セル罫線＋灰色の見出し行。並べ替えは見出し横のアイコンボタンで、並べ替え中の列を薄い青で強調。狭い幅では行ごとの縦積み表示。',
    input: 'ボタンと一体になった検索欄と、上にラベルを置くセレクト。ラベルは常に表示する。',
    actions: '角丸4pxの青いボタンとアウトラインボタン。行の詳細はアウトライン、通知の閉じるは装飾のないボタン。',
    hierarchy: 'セリフ体の見出しと主要操作を上段に、検索→表の順。詳細は一覧の上に重ねるモーダルで表示する。',
  },
  render(model, ctx) {
    return html`
      <div class="ds-uswds">
        <div class="usa-app" ${model.detail ? 'inert' : ''}>
          ${banner(ctx)} ${header(model, ctx)}
          <div class="usa-section">
            <div class="grid-container">
              ${alert(model)}
              <div class="usa-page-head">
                <h2 class="usa-page-title" tabindex="-1" data-focus="heading">申請一覧</h2>
                <button type="button" class="usa-button" data-action="new">${icon('add', { size: 20, stroke: 2.25 })}新規申請</button>
              </div>
              ${searchArea(model, ctx)} ${table(model)}
            </div>
          </div>
          <div class="usa-identifier">
            <div class="grid-container"><p>${model.system.org}（架空の自治体）　申請管理システム</p></div>
          </div>
        </div>
        ${modal(model, ctx)}
      </div>`;
  },
};
