// Material 3 の公開ガイドを参考にした独自実装。公式コンポーネントへの依存はない。
import { attr, html } from '../html.js';
import { icon, TONE_ICONS } from '../icons.js';
import { countText, formatDate } from '../query.js';
import { formPage } from './material3.form.js';
import { dashboardPage } from './material3.dashboard.js';

function navigation(model, ctx) {
  return html`<nav class="m3-nav ${ctx.ui.nav ? 'is-open' : ''}" id="${ctx.uid}-m3-nav" aria-label="ナビゲーション">
    <ul>
      ${model.nav.map(
        (n) =>
          html`<li>
            <a href="${ctx.navHref(n)}" data-action="nav" data-target="${n.id}" ${attr('aria-current', n.current && 'page')}>
              ${icon(n.icon, { size: 24, className: 'm3-nav__indicator' })}<span>${n.label}</span>
            </a>
          </li>`,
      )}
    </ul>
  </nav>`;
}

const statusBadge = (s) => html`<span class="m3-status tone-${s.tone}">${icon(TONE_ICONS[s.tone], { size: 16 })}${s.label}</span>`;

function listPage(model, ctx) {
  const id = `${ctx.uid}-m3-search`;
  return html`<div class="m3-page-head">
      <div>
        <h2 tabindex="-1" data-focus="heading">申請一覧</h2>
        <p class="m3-support">${countText(model)}を表示</p>
      </div>
      <button type="button" class="m3-button m3-button--filled" data-action="new">${icon('add')}新規申請</button>
    </div>
    <form class="m3-search" role="search" aria-label="申請の検索">
      ${icon('search', { size: 24 })}<label class="visually-hidden" for="${id}">検索</label>
      <input
        id="${id}"
        type="search"
        data-bind="keyword"
        value="${model.keyword}"
        placeholder="受付番号・申請者・種別・担当課を検索"
        autocomplete="off"
      />
      ${model.keyword
        ? html`<button type="button" class="m3-icon-button" data-action="clear-keyword" aria-label="検索語を消去">${icon('close')}</button>`
        : ''}
    </form>
    <div class="m3-filters" role="radiogroup" aria-label="処理状態で絞り込み">
      ${model.statusOptions.map(
        (o) =>
          html`<label class="m3-chip"
            ><input type="radio" name="${ctx.uid}-m3-status" data-bind="status" value="${o.value}" ${o.selected ? 'checked' : ''} /><span
              >${o.selected ? icon('check', { size: 16 }) : ''}${o.label}<small>${o.count}</small></span
            ></label
          >`,
      )}
    </div>
    ${model.scope.active
      ? html`<div class="m3-scope" data-scope>
          <strong>引き継いだ絞り込み</strong>${model.scope.items.map((i) => html`<span>${i.label}：${i.text}</span>`)}<button
            type="button"
            class="m3-button"
            data-action="clear-scope"
          >
            解除
          </button>
        </div>`
      : ''}
    <section class="m3-surface" aria-label="申請一覧">
      ${model.rows.length
        ? html`<div class="m3-table-scroll" role="region" aria-label="申請一覧の表（横スクロール可）" tabindex="0">
            <table class="m3-table">
              <thead>
                <tr>
                  ${model.columns.map(
                    (c) =>
                      html`<th scope="col" aria-sort="${c.ariaSort}">
                        <button type="button" data-action="sort" data-key="${c.key}">
                          ${c.label}${icon(c.sorted === 'asc' ? 'arrowUp' : c.sorted === 'desc' ? 'arrowDown' : 'arrowsUpDown', {
                            size: 16,
                          })}
                        </button>
                      </th>`,
                  )}
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                ${model.rows.map(
                  (r) =>
                    html`<tr>
                      <td class="m3-number">${r.id}</td>
                      <td>${r.applicant}</td>
                      <td>${r.type}</td>
                      <td>${formatDate(r.receivedAt, 'slash')}</td>
                      <td>${statusBadge(r.status)}</td>
                      <td>
                        <button type="button" class="m3-button" data-action="open-detail" data-id="${r.id}">
                          詳細<span class="visually-hidden">（${r.id}）</span>
                        </button>
                      </td>
                    </tr>`,
                )}
              </tbody>
            </table>
          </div>`
        : html`<p class="m3-empty">${icon('search', { size: 32 })}条件に一致する申請はありません</p>`}
    </section>`;
}

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
  return html`<div class="m3-scrim" data-action="close-detail"></div>
    <section class="m3-dialog" role="dialog" aria-modal="true" aria-labelledby="${ctx.uid}-m3-detail" data-modal>
      <header>
        <span class="m3-dialog__symbol">${icon('document', { size: 28 })}</span>
        <h3 id="${ctx.uid}-m3-detail" tabindex="-1" data-focus="detail">申請の詳細</h3>
        ${statusBadge(d.status)}
      </header>
      <dl class="m3-summary">
        ${fields.map(
          ([k, v]) =>
            html`<div>
              <dt>${k}</dt>
              <dd>${v}</dd>
            </div>`,
        )}
      </dl>
      <footer>
        <button type="button" class="m3-button" data-action="close-detail">閉じる</button>
      </footer>
    </section>`;
}

export default {
  id: 'material3',
  name: 'Google Material Design 3',
  shortName: 'Material 3',
  url: 'https://m3.material.io/',
  summary:
    'デスクトップ業務向けの Material 3。選択インジケーター付きナビゲーションレールと色調の異なるサーフェスで領域を分け、検索バー・フィルターチップ・明確な操作階層で申請を扱う比較用の独自実装。',
  traits: {
    density: '本文14px、表は約52pxの行。丸いサーフェス内に密度のある表を置き、行をカードへ分解しない。',
    navigation: '淡いトップアプリバーと、アイコンの背後に選択インジケーターを持つナビゲーションレール。狭い枠ではメニューボタンで展開。',
    table: '区切り線で行を追うデータテーブル。全列の並べ替えと文字・アイコン付き状態を備え、狭い枠では表だけを横スクロール。',
    input: '丸い検索バーと、チェック・件数を添えた処理状態のフィルターチップ。',
    actions: '新規申請は Filled、行の詳細は Text ボタン。ピル形状と状態レイヤーで操作の優先度を示す。',
    hierarchy: '検索→チップ→一覧の順に絞り込む。詳細は中央の角丸28pxのダイアログで読み、閉じると元の行へ戻る。',
  },
  formTraits: {
    layout: 'デスクトップでは手順と補足のサイド領域＋2列の入力面。狭い枠では1列に積む。',
    label: 'Filled 型の入力面の上部に常時ラベルを置く。下線、56px以上の高さ、欄外の補足、必須／任意の文字表示。',
    errors: '赤い下線・ラベルとアイコン付きの理由を各項目に表示。上部に件数を示し、最初のエラー項目へフォーカス。',
    confirm: '手順の現在地を保ち、確認はラベルと値の一覧。主操作は Filled、戻る操作は Outlined、キャンセルは Text。',
  },
  dashboardTraits: {
    kpi: '受付件数を広い Primary container のサーフェスで強調し、残る3指標を隣の指標群にまとめる。',
    density: '左に集計条件と定義、右に主要指標と可視化を配置。枠が狭いと条件を先頭に積む。',
    chart: '月別は丸い縦棒、処理状態は文字の凡例付きドーナツ、種別は横棒。値と割合はすべて文字でも示す。',
    filter: 'ラベル付きの Outlined セレクトを専用の条件パネルへまとめ、リセットと一覧への操作を分離。',
    hierarchy: '条件→主要指標→月別→状態・種別の順。影の多用を避け、背景色の段階と余白でサーフェスを区別。',
  },
  errorFocus: 'field',
  render(model, ctx) {
    const overlay = model.screen === 'list' && model.detail;
    return html`<div class="ds-material3">
      <div class="m3-app" ${overlay ? 'inert' : ''}>
        <header class="m3-appbar">
          <button
            type="button"
            class="m3-icon-button m3-menu"
            data-action="toggle-ui"
            data-key="nav"
            aria-label="ナビゲーション"
            aria-controls="${ctx.uid}-m3-nav"
            aria-expanded="${ctx.ui.nav ? 'true' : 'false'}"
          >
            ${icon('menu', { size: 24 })}</button
          ><span class="m3-brand">${icon('home', { size: 24 })}</span>
          <div><strong>${model.system.name}</strong><span>${model.system.org}</span></div>
          <span class="m3-account">${icon('user')}<span>${model.system.user}</span></span>
        </header>
        <div class="m3-body">
          ${navigation(model, ctx)}
          <div class="m3-content">
            ${model.notice
              ? html`<div class="m3-notice">
                  ${icon('info')}
                  <p><strong>${model.notice.title}</strong> ${model.notice.text}</p>
                  <button type="button" class="m3-icon-button" data-action="dismiss-notice" aria-label="通知を閉じる">
                    ${icon('close')}
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
