// GOV.UK Design System の考え方を参考にした表示（2025年のブランド刷新後の配色）。
// 大きな文字と余白、ラベル＋ヒント＋入力の縦積み、左側の絞り込み列、
// 行の「表示」リンク、戻るリンクのある別ページ型の詳細、緑の主要ボタンが特徴。
// 王冠ロゴなど GOV.UK 固有の識別要素は使わない。

import { attr, html } from '../html.js';
import { countText, formatDate } from '../query.js';
import { formPage } from './govuk.form.js';

const TAG_COLORS = { info: '', progress: 'purple', warning: 'orange', success: 'green', error: 'red' };

function header(model, ctx) {
  const open = Boolean(ctx.ui.menu);
  return html`
    <header class="gvk-header">
      <div class="gvk-width-container">
        <a class="gvk-header__logo" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">${model.system.org}</a>
      </div>
    </header>
    <section class="gvk-service-nav" aria-label="サービス情報">
      <div class="gvk-width-container gvk-service-nav__container">
        <span class="gvk-service-nav__name">${model.system.name}</span>
        <button
          type="button"
          class="gvk-service-nav__toggle"
          data-action="toggle-ui"
          data-key="menu"
          aria-expanded="${open ? 'true' : 'false'}"
          aria-controls="${ctx.uid}-gvk-nav"
        >
          メニュー
        </button>
        <nav class="gvk-service-nav__wrapper ${open ? 'is-open' : ''}" id="${ctx.uid}-gvk-nav" aria-label="メニュー">
          <ul class="gvk-service-nav__list">
            ${model.nav.map(
              (item) => html`
                <li class="gvk-service-nav__item ${item.current ? 'gvk-service-nav__item--active' : ''}">
                  <a
                    class="gvk-service-nav__link"
                    href="${ctx.navHref(item)}"
                    data-action="nav"
                    data-target="${item.id}"
                    ${attr('aria-current', item.current && 'page')}
                    >${item.current ? html`<strong>${item.label}</strong>` : item.label}</a
                  >
                </li>`,
            )}
          </ul>
        </nav>
      </div>
    </section>`;
}

function banner(model) {
  if (!model.notice) return '';
  return html`
    <div class="gvk-notification-banner">
      <div class="gvk-notification-banner__header"><h3 class="gvk-notification-banner__title">お知らせ</h3></div>
      <div class="gvk-notification-banner__content">
        <p class="gvk-notification-banner__heading">${model.notice.title}</p>
        <p class="gvk-body">${model.notice.text}</p>
        <p class="gvk-body"><button type="button" class="gvk-link-button" data-action="dismiss-notice">このお知らせを閉じる</button></p>
      </div>
    </div>`;
}

function tag(status) {
  return html`<strong class="gvk-tag ${TAG_COLORS[status.tone] ? `gvk-tag--${TAG_COLORS[status.tone]}` : ''}">${status.label}</strong>`;
}

function filters(model, ctx) {
  const kwId = `${ctx.uid}-gvk-kw`;
  return html`
    <form class="gvk-filter" role="search" aria-label="申請の絞り込み">
      <h3 class="gvk-heading-m">絞り込み</h3>
      <div class="gvk-form-group">
        <label class="gvk-label gvk-label--s" for="${kwId}">キーワード</label>
        <div class="gvk-hint" id="${kwId}-hint">受付番号、申請者名、申請種別など</div>
        <input class="gvk-input" id="${kwId}" type="search" data-bind="keyword" value="${model.keyword}" aria-describedby="${kwId}-hint" autocomplete="off" />
      </div>
      <div class="gvk-form-group">
        <fieldset class="gvk-fieldset">
          <legend class="gvk-fieldset__legend">処理状態</legend>
          <div class="gvk-radios gvk-radios--small">
            ${model.statusOptions.map(
              (o, i) => html`
                <div class="gvk-radios__item">
                  <input class="gvk-radios__input" id="${ctx.uid}-gvk-st-${i}" type="radio" name="${ctx.uid}-gvk-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
                  <label class="gvk-label gvk-radios__label" for="${ctx.uid}-gvk-st-${i}">${o.label}（${o.count}件）</label>
                </div>`,
            )}
          </div>
        </fieldset>
      </div>
      <div class="gvk-button-group">
        <button type="submit" class="gvk-button gvk-button--secondary">検索する</button>
        <a class="gvk-link" href="${ctx.href({ keyword: '', status: '' })}" data-action="clear">条件をクリア</a>
      </div>
    </form>`;
}

function sortButton(c) {
  return html`
    <button type="button" class="gvk-sort" data-action="sort" data-key="${c.key}">
      ${c.label}<span class="gvk-sort__arrow gvk-sort__arrow--${c.sorted ?? 'none'}" aria-hidden="true"></span>
    </button>`;
}

function results(model, ctx) {
  return html`
    <div class="gvk-results-head">
      <h3 class="gvk-heading-m">${model.shown}件の申請</h3>
      <button type="button" class="gvk-button" data-action="new">新規申請</button>
    </div>
    ${model.filtered ? html`<p class="gvk-body-s gvk-secondary">${countText(model)}を表示しています</p>` : ''}
    ${model.rows.length === 0
      ? html`<p class="gvk-body">一致する申請はありません。</p>
          <p class="gvk-body">次のことを試してください。</p>
          <ul class="gvk-list gvk-list--bullet">
            <li>キーワードの綴りを確認する</li>
            <li>処理状態の絞り込みを「すべて」にする</li>
          </ul>`
      : html`
          <div class="gvk-table-wrap">
            <table class="gvk-table">
              <caption class="visually-hidden">申請一覧（列見出しのボタンで並べ替え）</caption>
              <thead>
                <tr>
                  ${model.columns.map((c) => html`<th scope="col" class="gvk-table__header" aria-sort="${c.ariaSort}">${sortButton(c)}</th>`)}
                  <th scope="col" class="gvk-table__header"><span class="visually-hidden">操作</span></th>
                </tr>
              </thead>
              <tbody>
                ${model.rows.map(
                  (row) => html`
                    <tr>
                      <td class="gvk-table__cell gvk-nowrap">${row.id}</td>
                      <td class="gvk-table__cell">${row.applicant}</td>
                      <td class="gvk-table__cell">${row.type}</td>
                      <td class="gvk-table__cell gvk-nowrap">${formatDate(row.receivedAt)}</td>
                      <td class="gvk-table__cell">${tag(row.status)}</td>
                      <td class="gvk-table__cell gvk-nowrap">
                        <a class="gvk-link" href="${ctx.href({ detail: row.id })}" data-action="open-detail" data-id="${row.id}"
                          >表示<span class="visually-hidden">（${row.id}）</span></a
                        >
                      </td>
                    </tr>`,
                )}
              </tbody>
            </table>
          </div>`}`;
}

function detailPage(model, ctx) {
  const d = model.detail;
  const rows = [
    ['受付番号', d.id],
    ['申請者', d.applicant],
    ['申請種別', d.type],
    ['処理状態', tag(d.status)],
    ['担当課', d.department],
    ['受付日', formatDate(d.receivedAt)],
    ['受付方法', d.channel],
    ['処理期限', formatDate(d.dueAt)],
    ['備考', d.note || 'なし'],
  ];
  return html`
    <a class="gvk-back-link" href="${ctx.href({ detail: null })}" data-action="close-detail">戻る</a>
    <div class="gvk-main">
      <span class="gvk-caption-l">受付番号 ${d.id}</span>
      <h2 class="gvk-heading-l" tabindex="-1" data-focus="detail">${d.type}</h2>
      <dl class="gvk-summary-list">
        ${rows.map(
          ([k, v]) => html`<div class="gvk-summary-list__row"><dt class="gvk-summary-list__key">${k}</dt><dd class="gvk-summary-list__value">${v}</dd></div>`,
        )}
      </dl>
      <a class="gvk-button gvk-button--secondary" href="${ctx.href({ detail: null })}" data-action="close-detail">申請一覧に戻る</a>
    </div>`;
}

function listPage(model, ctx) {
  return html`
    <div class="gvk-main">
      ${banner(model)}
      <span class="gvk-caption-l">${model.system.name}</span>
      <h2 class="gvk-heading-xl" tabindex="-1" data-focus="heading">申請一覧</h2>
      <div class="gvk-grid-row">
        <div class="gvk-grid-column-one-quarter">${filters(model, ctx)}</div>
        <div class="gvk-grid-column-three-quarters">${results(model, ctx)}</div>
      </div>
    </div>`;
}

export default {
  id: 'govuk',
  name: 'GOV.UK Design System',
  shortName: 'GOV.UK',
  url: 'https://design-system.service.gov.uk/',
  summary:
    '英国政府の行政サービス向け。誰でも迷わず使えることを最優先に、大きな文字と余白、1列で上から読む構成、リンク中心の操作、緑の主要ボタンでシンプルにまとめる。',
  traits: {
    density: '本文19px・見出し48pxの低密度。余白を大きく取り、表でも1行に詰め込まない。最大幅960pxで読みやすさを優先する。',
    navigation: '青いヘッダー（組織名）と、サービス名＋項目を並べたサービスナビゲーション。現在地は太字と下線の帯で示す。',
    table: '横罫線だけの簡素な表。見出しは太字、状態は四角いタグ、行の操作はボタンではなく「表示」リンク。',
    input: 'ラベル・ヒント・入力欄を縦に積む。2pxの黒枠の入力欄と、大きな円のラジオボタンで絞り込む。',
    actions: '角のない緑の主要ボタン（下に影）と灰色の副ボタン。補助的な操作はリンクで表す。',
    hierarchy: '見出しの左に絞り込み列、右に結果を置く。詳細は「戻る」リンク付きの別ページで、要約リストとして表示する。',
  },
  formTraits: {
    layout: '1列で1つの流れ。項目の間隔は30px、見出しは大きく。入力欄の幅は内容に合わせて変え、すべて同じ幅にはしない。',
    label: 'ラベル（太字）→ヒント→エラー→入力欄の順。必須は無印で、任意の項目だけ「（任意）」と示す。2pxの黒枠の入力欄と大きな四角のチェックボックス。',
    errors: '先頭に「問題があります」のエラーサマリー（赤い太枠）を出してフォーカスを移し、各項目へのリンクを示す。エラー項目は左に赤い帯、メッセージは太字の赤。',
    confirm: '「回答内容を確認してください」の要約リストで、各行に「変更」リンク（その項目へ戻る）。緑の「この内容で申請する」で、緑の完了パネルを表示。',
  },
  errorFocus: 'summary',
  render(model, ctx) {
    const page =
      model.screen === 'form' ? formPage(model, ctx, banner(model)) : model.detail ? detailPage(model, ctx) : listPage(model, ctx);
    return html`
      <div class="ds-govuk" data-page="${model.detail ? 'detail' : 'list'}">
        ${header(model, ctx)}
        <div class="gvk-width-container gvk-page">${page}</div>
        <footer class="gvk-footer">
          <div class="gvk-width-container"><p>© ${model.system.org}（架空の自治体）</p></div>
        </footer>
      </div>`;
  },
};
