// デジタル庁デザインシステムの考え方を参考にした表示。
// 16px 基準の本文と広い行間、ラベルを入力欄の上に置く検索条件パネル、
// 罫線つきテーブル、黄色＋黒の太いフォーカスリングが特徴。

import { attr, html } from '../html.js';
import { TONE_ICONS, icon } from '../icons.js';
import { countText, formatDate } from '../query.js';
import { formPage } from './dads.form.js';

const CHIP_COLORS = { info: 'light-blue', progress: 'blue', warning: 'orange', success: 'green', error: 'red' };

function header(model, ctx) {
  const menuOpen = Boolean(ctx.ui.menu);
  return html`
    <header class="dads-header">
      <div class="dads-header__inner">
        <a class="dads-header__logo" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">
          <svg class="dads-header__emblem" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M18 7l3 7h7l-5.5 4.5 2 7.5L18 21.5 11.5 26l2-7.5L8 14h7z" fill="currentColor" />
          </svg>
          <span class="dads-header__org">${model.system.org}</span>
          <span class="dads-header__system">${model.system.name}</span>
        </a>
        <ul class="dads-utility">
          <li><a class="dads-link" href="#" data-action="nav" data-target="help" data-label="ヘルプ">ヘルプ</a></li>
          <li class="dads-utility__user">${icon('user', { size: 20 })}${model.system.user}</li>
        </ul>
        <button
          type="button"
          class="dads-menu-button"
          data-action="toggle-ui"
          data-key="menu"
          aria-expanded="${menuOpen ? 'true' : 'false'}"
          aria-controls="${ctx.uid}-dads-gnav"
        >
          ${icon(menuOpen ? 'close' : 'menu', { size: 24 })}<span>${menuOpen ? '閉じる' : 'メニュー'}</span>
        </button>
      </div>
      <nav class="dads-gnav ${menuOpen ? 'is-open' : ''}" id="${ctx.uid}-dads-gnav" aria-label="グローバルメニュー">
        <ul class="dads-gnav__list">
          ${model.nav.map(
            (item) => html`
              <li>
                <a
                  class="dads-gnav__link"
                  href="${ctx.navHref(item)}"
                  data-action="nav"
                  data-target="${item.id}"
                  ${attr('aria-current', item.current && 'page')}
                  >${icon(item.icon, { size: 20 })}${item.label}</a
                >
              </li>`,
          )}
        </ul>
      </nav>
    </header>`;
}

function breadcrumb(model, ctx) {
  return html`
    <nav class="dads-breadcrumb" aria-label="現在位置">
      <ol>
        <li><a class="dads-link" href="#" data-action="nav" data-target="home" data-label="ホーム">ホーム</a></li>
        ${model.screen === 'form'
          ? html`<li><a class="dads-link" href="${ctx.href({ screen: 'list', detail: null })}" data-action="nav" data-target="applications">申請一覧</a></li>
              <li><span aria-current="page">新規申請</span></li>`
          : model.detail
            ? html`<li><a class="dads-link" href="${ctx.href({ detail: null })}" data-action="close-detail">申請一覧</a></li>
                <li><span aria-current="page">申請詳細</span></li>`
            : html`<li><span aria-current="page">申請一覧</span></li>`}
      </ol>
    </nav>`;
}

function notice(model) {
  if (!model.notice) return '';
  return html`
    <div class="dads-notification" data-type="info">
      <h3 class="dads-notification__heading">${icon('info', { size: 24, label: 'お知らせ' })}<span>${model.notice.title}</span></h3>
      <button type="button" class="dads-notification__close" data-action="dismiss-notice">
        ${icon('close', { size: 24 })}<span>閉じる</span>
      </button>
      <p class="dads-notification__body">${model.notice.text}</p>
    </div>`;
}

function statusChip(status) {
  return html`<span class="dads-chip" data-color="${CHIP_COLORS[status.tone]}"
    >${icon(TONE_ICONS[status.tone], { size: 16, stroke: 2 })}${status.label}</span
  >`;
}

function sortIcon(column) {
  if (column.sorted === 'asc') return icon('arrowUp', { size: 20 });
  if (column.sorted === 'desc') return icon('arrowDown', { size: 20 });
  return icon('arrowsUpDown', { size: 20 });
}

function listPage(model, ctx) {
  const kwId = `${ctx.uid}-dads-kw`;
  const stId = `${ctx.uid}-dads-st`;
  return html`
    <div class="dads-page-head">
      <h2 class="dads-heading" tabindex="-1" data-focus="heading">申請一覧</h2>
      <button type="button" class="dads-button" data-type="solid-fill" data-size="md" data-action="new">
        ${icon('add', { size: 20, stroke: 2 })}新規申請
      </button>
    </div>
    <p class="dads-lead">受け付けた申請を検索し、内容と処理状況を確認できます。</p>

    <section class="dads-search" aria-labelledby="${ctx.uid}-dads-search-title">
      <h3 class="dads-section-title" id="${ctx.uid}-dads-search-title">検索条件</h3>
      <form class="dads-search__form" role="search" aria-labelledby="${ctx.uid}-dads-search-title">
        <div class="dads-form-control dads-form-control--keyword">
          <label class="dads-form-control__label" for="${kwId}">キーワード</label>
          <p class="dads-form-control__support" id="${kwId}-support">受付番号、申請者名（ふりがな可）、申請種別、担当課で検索できます</p>
          <input
            class="dads-input"
            id="${kwId}"
            type="search"
            data-bind="keyword"
            value="${model.keyword}"
            aria-describedby="${kwId}-support"
            autocomplete="off"
          />
        </div>
        <div class="dads-form-control">
          <label class="dads-form-control__label" for="${stId}">処理状態</label>
          <div class="dads-select">
            <select class="dads-select__select" id="${stId}" data-bind="status">
              ${model.statusOptions.map(
                (o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}（${o.count}件）</option>`,
              )}
            </select>
            ${icon('chevronDown', { size: 16, stroke: 2, className: 'dads-select__icon' })}
          </div>
        </div>
        <div class="dads-search__actions">
          <button type="submit" class="dads-button" data-type="solid-fill" data-size="md">
            ${icon('search', { size: 20, stroke: 2 })}検索
          </button>
          <button type="button" class="dads-button" data-type="text" data-size="md" data-action="clear">条件をクリア</button>
        </div>
      </form>
    </section>

    <div class="dads-result-head">
      <h3 class="dads-section-title">検索結果</h3>
      <p class="dads-count">${countText(model)}</p>
    </div>

    ${model.rows.length === 0
      ? html`<p class="dads-empty">条件に一致する申請はありません。検索条件を変更してください。</p>`
      : html`
          <div class="dads-table-wrap" role="region" aria-label="申請一覧の表" tabindex="0">
            <table class="dads-table">
              <thead>
                <tr>
                  ${model.columns.map(
                    (c) => html`
                      <th scope="col" aria-sort="${c.ariaSort}">
                        <button type="button" class="dads-table__sort" data-action="sort" data-key="${c.key}">
                          ${c.label}${sortIcon(c)}
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
                      <td class="dads-table__id">${row.id}</td>
                      <td>${row.applicant}</td>
                      <td>${row.type}</td>
                      <td class="dads-table__date">${formatDate(row.receivedAt)}</td>
                      <td>${statusChip(row.status)}</td>
                      <td class="dads-table__action">
                        <button
                          type="button"
                          class="dads-button"
                          data-type="outline"
                          data-size="xs"
                          data-action="open-detail"
                          data-id="${row.id}"
                        >
                          詳細<span class="visually-hidden">（${row.id}）</span>
                        </button>
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
    ['担当課', d.department],
    ['受付日', formatDate(d.receivedAt)],
    ['受付方法', d.channel],
    ['処理期限', formatDate(d.dueAt)],
    ['処理状態', statusChip(d.status)],
    ['備考', d.note || 'なし'],
  ];
  return html`
    <h2 class="dads-heading" tabindex="-1" data-focus="detail">申請詳細</h2>
    <p class="dads-lead">受付番号 ${d.id} の申請内容です。</p>
    <div class="dads-table-wrap">
      <table class="dads-table dads-table--rows">
        <tbody>
          ${rows.map(([label, value]) => html`<tr><th scope="row">${label}</th><td>${value}</td></tr>`)}
        </tbody>
      </table>
    </div>
    <div class="dads-detail-actions">
      <a class="dads-button" data-type="outline" data-size="md" href="${ctx.href({ detail: null })}" data-action="close-detail">
        ${icon('chevronLeft', { size: 20, stroke: 2 })}申請一覧に戻る
      </a>
    </div>`;
}

export default {
  id: 'dads',
  name: 'デジタル庁デザインシステム',
  shortName: 'デジタル庁',
  url: 'https://design.digital.go.jp/dads/',
  summary:
    '行政サービス向け。16px・行間1.7の読みやすい本文、ラベルと補足を欄の上に置く入力、黄色と黒の太いフォーカス表示など、アクセシビリティを重視した日本語UI。',
  traits: {
    density: '本文16px・行間1.7、セル余白も大きめの「ゆったり」した密度。日本語の読みやすさを優先する。',
    navigation: 'ヘッダー（自治体名＋システム名、ユーティリティリンク）の下に横並びのグローバルメニュー。パンくずで現在位置を示す。',
    table: '見出し行をグレー背景にした罫線つきの表。並べ替えは下線つきの見出しボタン＋矢印アイコン。状態は枠つきラベル＋アイコン。',
    input: '「検索条件」パネルに、ラベル・補足説明・入力欄を縦に積む。高さ48px以上の大きな入力欄とセレクトボックス。',
    actions: '角丸8pxの塗り／アウトライン／テキストボタン。主要操作は塗り、行内の詳細は小さいアウトラインボタン。',
    hierarchy: 'パンくず → ページ見出し → 説明文 → 検索条件 → 検索結果の順に縦へ積み、詳細は別ページとして表示する。',
  },
  formTraits: {
    layout: '1列の縦積み。「申請者の情報」「申請の内容」「確認事項」の見出しで区切り、項目の間隔を広く（32px）取る。最大幅は約40rem。',
    label: 'ラベルの横に赤い「※必須」または「任意」を明示。補足と入力例はラベルの直下に置く。入力欄は高さ48px・角丸8px。',
    errors: 'エラー文は入力欄の直下に「＊」付きの赤文字で出し、枠も赤くする。上部には通知バナーで件数と項目名を示し、最初のエラー項目へフォーカスを移す。',
    confirm: '入力→確認→完了をステップ表示。確認は項目名つきの罫線表で、大きな「この内容で申請する」と「入力画面に戻って修正する」を並べる。',
  },
  errorFocus: 'field',
  render(model, ctx) {
    return html`
      <div class="ds-dads" data-page="${model.detail ? 'detail' : 'list'}">
        ${header(model, ctx)}
        <div class="dads-main">
          ${breadcrumb(model, ctx)} ${notice(model)}
          ${model.screen === 'form' ? formPage(model, ctx) : model.detail ? detailPage(model, ctx) : listPage(model, ctx)}
        </div>
        <footer class="dads-footer"><p>© ${model.system.org}（架空の自治体）</p></footer>
      </div>`;
  },
};
