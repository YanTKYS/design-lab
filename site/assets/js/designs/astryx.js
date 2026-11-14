// Meta Astryx の公開資料（Neutral テーマ、サイドナビのシェル、Table ページのテンプレート）を参考にした独自実装。
// 公式の React コンポーネント（@astryxdesign/core）や CDN には依存せず、公式の再現・準拠・性能を示すものではない。
import { attr, html } from '../html.js';
import { icon, TONE_ICONS } from '../icons.js';
import { countText, formatDate } from '../query.js';
import { formPage } from './astryx.form.js';
import { dashboardPage } from './astryx.dashboard.js';

const badge = (s) => html`<span class="ax-badge tone-${s.tone}">${icon(TONE_ICONS[s.tone], { size: 14 })}${s.label}</span>`;

function sideNav(model, ctx) {
  return html`<nav class="ax-side ${ctx.ui.nav ? 'is-open' : ''}" id="${ctx.uid}-ax-nav" aria-label="ナビゲーション">
    <div class="ax-brand">
      <span class="ax-brand__mark">${icon('home', { size: 18 })}</span>
      <div><strong>${model.system.name}</strong><span>${model.system.org}</span></div>
    </div>
    <p class="ax-side__heading">業務</p>
    <ul>
      ${model.nav.map(
        (n) =>
          html`<li>
            <a href="${ctx.navHref(n)}" data-action="nav" data-target="${n.id}" ${attr('aria-current', n.current && 'page')}>
              ${icon(n.icon, { size: 18 })}<span>${n.label}</span>
            </a>
          </li>`,
      )}
    </ul>
    <p class="ax-side__user">${icon('user', { size: 18 })}<span>${model.system.user}</span></p>
  </nav>`;
}

/** 一覧の上に置く、レコード単位の事実（MetadataList）。表の列に同じ値を繰り返さない。 */
function facts(model) {
  const sorted = model.columns.find((c) => c.sorted);
  const status = model.statusOptions.find((o) => o.selected);
  const items = [
    ['表示件数', countText(model)],
    ['処理状態', status?.value ? status.label : 'すべて'],
    ['並び順', sorted ? `${sorted.label}（${sorted.sorted === 'asc' ? '昇順' : '降順'}）` : '—'],
  ];
  return html`<dl class="ax-meta" aria-label="表示中の条件">
    ${items.map(
      ([k, v]) =>
        html`<div>
          <dt>${k}</dt>
          <dd>${v}</dd>
        </div>`,
    )}
  </dl>`;
}

function listPage(model, ctx) {
  const searchId = `${ctx.uid}-ax-search`;
  const statusId = `${ctx.uid}-ax-status`;
  const byStatus = model.statusOptions
    .slice(1)
    .map((o) => ({ ...o, shown: model.rows.filter((r) => r.status.value === o.value).length }))
    .filter((o) => o.shown > 0);
  return html`<div class="ax-masthead">
      <div>
        <h2 tabindex="-1" data-focus="heading">申請一覧</h2>
        <p class="ax-sub">受け付けた申請の検索と処理状況の確認</p>
      </div>
      <button type="button" class="ax-button ax-button--primary" data-action="new">${icon('add', { size: 18 })}新規申請</button>
    </div>
    ${facts(model)}
    <form class="ax-toolbar" role="search" aria-label="申請の検索">
      <div class="ax-search">
        ${icon('search', { size: 18 })}<label class="visually-hidden" for="${searchId}">検索</label>
        <input
          id="${searchId}"
          type="search"
          data-bind="keyword"
          value="${model.keyword}"
          placeholder="受付番号・申請者・種別・担当課を検索"
          autocomplete="off"
        />
        ${model.keyword
          ? html`<button type="button" class="ax-icon-button" data-action="clear-keyword" aria-label="検索語を消去">${icon('close', { size: 16 })}</button>`
          : ''}
      </div>
      <div class="ax-select-field">
        <label for="${statusId}">処理状態</label>
        <select id="${statusId}" data-bind="status">
          ${model.statusOptions.map(
            (o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}（${o.count}）</option>`,
          )}
        </select>
      </div>
    </form>
    ${model.scope.active
      ? html`<div class="ax-banner ax-banner--info" data-scope>
          ${icon('info', { size: 18 })}
          <p><strong>引き継いだ絞り込み</strong>${model.scope.items.map((i) => html`<span>${i.label}：${i.text}</span>`)}</p>
          <button type="button" class="ax-button ax-button--secondary" data-action="clear-scope">解除</button>
        </div>`
      : ''}
    ${model.filtered
      ? html`<div class="ax-banner ax-banner--warning" role="status">
          ${icon('alert', { size: 18 })}
          <p><strong>絞り込み中です。</strong>${model.total}件のうち ${model.shown}件を表示しています。</p>
          <button type="button" class="ax-button ax-button--secondary" data-action="clear">条件をクリア</button>
        </div>`
      : ''}
    <section class="ax-card" aria-label="申請一覧">
      ${model.rows.length
        ? html`<div class="ax-table-scroll" role="region" aria-label="申請一覧の表（横スクロール可）" tabindex="0">
              <table class="ax-table">
                <thead>
                  <tr>
                    ${model.columns.map(
                      (c) =>
                        html`<th scope="col" aria-sort="${c.ariaSort}">
                          <button type="button" data-action="sort" data-key="${c.key}">
                            ${c.label}${icon(c.sorted === 'asc' ? 'arrowUp' : c.sorted === 'desc' ? 'arrowDown' : 'arrowsUpDown', {
                              size: 14,
                            })}
                          </button>
                        </th>`,
                    )}
                    <th scope="col"><span class="visually-hidden">操作</span></th>
                  </tr>
                </thead>
                <tbody>
                  ${model.rows.map(
                    (r) =>
                      html`<tr>
                        <td class="ax-number ax-strong">${r.id}</td>
                        <td>${r.applicant}</td>
                        <td>${r.type}</td>
                        <td class="ax-number">${formatDate(r.receivedAt, 'slash')}</td>
                        <td>${badge(r.status)}</td>
                        <td class="ax-cell-action">
                          <button type="button" class="ax-button ax-button--secondary ax-button--sm" data-action="open-detail" data-id="${r.id}">
                            詳細<span class="visually-hidden">（${r.id}）</span>
                          </button>
                        </td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            </div>
            <div class="ax-summary">
              <span class="ax-summary__label">表示中の内訳</span>
              ${byStatus.map((o) => html`<span class="ax-summary__item">${badge(o)}<b>${o.shown}</b>件</span>`)}
            </div>`
        : html`<div class="ax-empty">
            ${icon('search', { size: 28 })}
            <p><strong>条件に一致する申請はありません</strong></p>
            <p class="ax-sub">キーワードや処理状態を変更してください。</p>
            <button type="button" class="ax-button ax-button--secondary" data-action="clear">条件をクリア</button>
          </div>`}
    </section>`;
}

/** 詳細は右側のシート（Layout のサイドパネルに相当）で読む。閉じると元の行へ戻る。 */
function detail(model, ctx) {
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
  return html`<div class="ax-scrim" data-action="close-detail"></div>
    <section class="ax-sheet" role="dialog" aria-modal="true" aria-labelledby="${ctx.uid}-ax-detail" data-modal>
      <header>
        <div>
          <h3 id="${ctx.uid}-ax-detail" tabindex="-1" data-focus="detail">申請の詳細</h3>
          ${badge(d.status)}
        </div>
        <button type="button" class="ax-icon-button" data-action="close-detail" aria-label="閉じる">${icon('close', { size: 18 })}</button>
      </header>
      <dl class="ax-meta ax-meta--stack">
        ${fields.map(
          ([k, v]) =>
            html`<div>
              <dt>${k}</dt>
              <dd>${v}</dd>
            </div>`,
        )}
      </dl>
    </section>`;
}

export default {
  id: 'astryx',
  name: 'Meta Astryx',
  shortName: 'Astryx',
  url: 'https://astryx.atmeta.com/',
  summary:
    'Meta が公開する Astryx の Neutral テーマ（無彩色の面・淡い罫線・黒の主操作）と、サイドナビのシェル、条件を固定帯に置く Table ページの考え方を参考にした比較用の独自実装。公式の React コンポーネントではなく、公式の再現・準拠・性能を示すものではない。',
  traits: {
    density: '本文14px、行は約44px。罫線を引かず行のホバーで追わせる、無彩色で静かな表。',
    navigation: '上部バーを持たず、グループ見出し付きの左サイドナビだけで移動する。選択項目は淡いグレーで塗る。狭い枠ではメニューボタンで展開。',
    table: '行の罫線なし・数値は等幅数字。列見出しのボタンで全列を並べ替え、表の下に表示中の内訳を集計する。狭い枠では表だけを横スクロール。',
    input: '見出しの下に、レコード単位の事実（表示件数・処理状態・並び順）を並べ、検索ボックスと処理状態セレクトを1行のツールバーにまとめる。',
    actions: '新規申請は黒の Primary、行の詳細は罫線付きの Secondary。絞り込み中は警告バナーに「条件をクリア」を置く。',
    hierarchy: '見出し→条件の事実→ツールバー→バナー→表の順。詳細は右側のシートで読み、閉じると元の行へ戻る。',
  },
  formTraits: {
    layout: '現在地を示す横向きの進行表示を上部に置き、1段階ずつ全幅の面に表示する。項目は2列のグリッドで、狭い枠では1列。',
    label: '項目名の下に補足を置く。必須が標準なので、必須ではない項目にだけ「任意」を表示し、先頭で規則を示す。同意のチェックだけ個別に「必須」を表示。',
    errors: '上部の赤いバナーで件数を知らせ、各項目の下に赤い枠で理由を表示。最初のエラー項目へフォーカスする。',
    confirm: '確認は項目名と値の一覧。主操作は黒の Primary、戻る操作は Secondary、キャンセルは枠なしで区別する。',
  },
  dashboardTraits: {
    kpi: '4つの指標を同じ大きさのタイルに並べ、完了率にだけ進捗バーを添える。強調せず数値の大きさで読ませる。',
    density: '集計条件を上部の固定帯に置き、指標タイル→グラフ→内訳の表の3段で下へ読み進める。',
    chart: '月別は無彩色の縦棒、種別は横棒、処理状況は積み上げ棒と内訳の表。値と割合はすべて文字でも示す。',
    filter: '期間と担当課を横並びのセレクトにして、リセットと集計の定義を同じ帯に置く。',
    hierarchy: '条件→指標→グラフ→表の順。面は白と淡い罫線で区切り、影を使わない。',
  },
  errorFocus: 'field',
  render(model, ctx) {
    const overlay = model.screen === 'list' && model.detail;
    return html`<div class="ds-astryx">
      <div class="ax-app" ${overlay ? 'inert' : ''}>
        <header class="ax-topbar">
          <button
            type="button"
            class="ax-icon-button"
            data-action="toggle-ui"
            data-key="nav"
            aria-label="ナビゲーション"
            aria-controls="${ctx.uid}-ax-nav"
            aria-expanded="${ctx.ui.nav ? 'true' : 'false'}"
          >
            ${icon('menu', { size: 20 })}
          </button>
          <strong>${model.system.name}</strong>
        </header>
        <div class="ax-body">
          ${sideNav(model, ctx)}
          <div class="ax-content">
            ${model.notice
              ? html`<div class="ax-banner ax-banner--info">
                  ${icon('info', { size: 18 })}
                  <p><strong>${model.notice.title}</strong> ${model.notice.text}</p>
                  <button type="button" class="ax-icon-button" data-action="dismiss-notice" aria-label="通知を閉じる">
                    ${icon('close', { size: 16 })}
                  </button>
                </div>`
              : ''}
            ${model.screen === 'form'
              ? formPage(model, ctx)
              : model.screen === 'dashboard'
                ? dashboardPage(model, ctx)
                : listPage(model, ctx)}
          </div>
        </div>
      </div>
      ${model.screen === 'list' ? detail(model, ctx) : ''}
    </div>`;
  },
};
