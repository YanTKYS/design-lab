// 糸の交点（沖縄テーマの独自デザイン。名称は仮称）。宮古上布の経糸・緯糸・十字絣に着想した、このサイト独自の比較デザイン。
// 公式のデザインシステムでも、伝統工芸の再現でもない。独立した試作（site/experiments/okinawa-thread/）の情報構造を、
// 比較サイトの描画契約（render(model, ctx)・data-action・data-bind）に合わせて組み直した。
import { attr, html, raw } from '../html.js';
import { icon } from '../icons.js';
import { countText, formatDate } from '../query.js';
import { dashboardPage } from './okinawa-thread.dashboard.js';
import { formPage } from './okinawa-thread.form.js';

const date = (iso) => formatDate(iso, 'slash');
const STATUS_ICONS = { received: 'inbox', reviewing: 'clock', returned: 'alert', approved: 'check', rejected: null };
/** 番号と状態を先に読み、続けて申請者・種別・受付日を読む列の順。 */
const ORDER = ['id', 'status', 'applicant', 'type', 'receivedAt'];
const TITLES = { list: '申請一覧', dashboard: '申請処理ダッシュボード' };
const FORM_TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '申請の入力が完了しました' };

/** 処理状態：正式名を常に出し、アイコンと枠の形でも区別する（色だけに頼らない）。 */
export const badge = (s) => html`<span class="ot-badge" data-tone="${s.value}">${STATUS_ICONS[s.value] ? icon(STATUS_ICONS[s.value], { size: 14, stroke: 2 }) : ''}${s.label}</span>`;

/** 章見出しの前の小さな交点の印（装飾）。 */
export const mark = raw(
  '<svg class="ot-mark" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true" focusable="false"><path d="M1 4h10M1 8h10M4 1v10M8 1v10"/></svg>',
);

/* ---------- 見出し端の十字絣の反復（自作の図形。装飾なので読み上げない） ---------- */

const TILE = { w: 136, h: 128 };
function ring(rx, ry, step) {
  const cx = TILE.w / 2;
  const cy = TILE.h / 2;
  const v = [
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
  ];
  const points = [];
  v.forEach(([x1, y1], i) => {
    const [x2, y2] = v[(i + 1) % 4];
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let k = 0; k < n; k += 1) points.push([(x1 + ((x2 - x1) * k) / n).toFixed(1), (y1 + ((y2 - y1) * k) / n).toFixed(1)]);
  });
  return points;
}
const OUTER = ring(64, 60, 13);
const INNER = ring(44, 40, 12);

function pattern(uid) {
  const x = `${uid}-ot-x`;
  const uses = (pts) => pts.map(([px, py]) => `<use href="#${x}" x="${px}" y="${py}"/>`).join('');
  return raw(`<svg class="ot-hero__pattern" aria-hidden="true" focusable="false">
    <defs>
      <path id="${x}" d="M-3.5 0h7M0 -3.5v7"/>
      <pattern id="${uid}-ot-kasuri" patternUnits="userSpaceOnUse" width="${TILE.w}" height="${TILE.h}">
        <g fill="none" stroke-linecap="square" stroke-width="1.6"><g stroke="#e9edf0">${uses(OUTER)}</g><g stroke="#6f9cbf">${uses(INNER)}</g></g>
      </pattern>
      <pattern id="${uid}-ot-weft" patternUnits="userSpaceOnUse" width="4" height="4"><path d="M0 3.5h4" stroke="#ffffff" stroke-opacity=".05"/></pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#${uid}-ot-weft)"/>
    <rect width="100%" height="100%" fill="url(#${uid}-ot-kasuri)"/>
  </svg>`);
}

/* ---------- 枠 ---------- */

function topbar(model, ctx) {
  const open = Boolean(ctx.ui.nav);
  return html`<header class="ot-topbar">
    <div class="ot-topbar__brand">
      <svg class="ot-topbar__mark" width="24" height="24" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M7 2v22M13 2v22M19 2v22M2 7h22M2 13h22M2 19h22" /></svg>
      <span class="ot-topbar__org">${model.system.org}</span><span class="ot-topbar__system">${model.system.name}</span>
    </div>
    <button type="button" class="ot-menu" data-action="toggle-ui" data-key="nav" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${ctx.uid}-ot-nav">
      ${icon(open ? 'close' : 'menu', { size: 18 })}${open ? '閉じる' : 'メニュー'}
    </button>
    <nav class="ot-nav ${open ? 'is-open' : ''}" id="${ctx.uid}-ot-nav" aria-label="メインメニュー">
      <ul>
        ${model.nav.map(
          (n) => html`<li><a href="${ctx.navHref(n)}" data-action="nav" data-target="${n.id}" ${attr('aria-current', n.current && 'page')}>${n.label}</a></li>`,
        )}
      </ul>
    </nav>
  </header>`;
}

/* ---------- 申請一覧 ---------- */

function conditions(model, ctx) {
  const kw = `${ctx.uid}-ot-kw`;
  return html`<div class="ot-cond">
    <form class="ot-search" role="search" aria-label="申請の検索">
      <label class="ot-label" for="${kw}">キーワード</label>
      <div class="ot-search__row">
        <input class="ot-input" id="${kw}" type="search" data-bind="keyword" value="${model.keyword}" aria-describedby="${kw}-help" autocomplete="off" />
        <button type="submit" class="ot-btn ot-btn--primary">検索</button>
      </div>
      <p class="ot-help" id="${kw}-help">受付番号・申請者名（ふりがな可）・申請種別・担当課で探せます。</p>
    </form>
    <fieldset class="ot-status">
      <legend class="ot-label">処理状態</legend>
      <div class="ot-status__items">
        ${model.statusOptions.map(
          (o) => html`<label class="ot-status__item ${o.selected ? 'is-selected' : ''}">
            <input type="radio" name="${ctx.uid}-ot-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
            <span class="ot-status__label">${o.selected ? icon('check', { size: 14, stroke: 2.5 }) : ''}${o.label}</span><span class="ot-num ot-status__count">${o.count}<span class="visually-hidden">件</span></span>
          </label>`,
        )}
      </div>
    </fieldset>
  </div>`;
}

function resultHead(model, ctx) {
  const status = model.statusOptions.find((o) => o.selected && o.value);
  const terms = [model.keyword && `「${model.keyword}」`, status?.label].filter(Boolean);
  return html`<div class="ot-result-head">
      <h3 class="ot-chapter" id="${ctx.uid}-ot-ledger">${mark}申請台帳</h3>
      <p class="ot-count">${countText(model)}</p>
      <button type="button" class="ot-btn ot-btn--ghost ot-btn--sm ot-result-head__new" data-action="new">${icon('add', { size: 14, stroke: 2.25 })}新規申請</button>
    </div>
    ${model.scope.active
      ? html`<div class="ot-scope" data-scope>
          <p class="ot-scope__title">ダッシュボードから引き継いだ条件</p>
          <ul>${model.scope.items.map((i) => html`<li>${i.label}：<strong>${i.text}</strong></li>`)}</ul>
          <button type="button" class="ot-btn ot-btn--ghost ot-btn--sm" data-action="clear-scope">引き継ぎを解除</button>
        </div>`
      : ''}
    <div class="ot-filterline">
      ${model.filtered
        ? html`<p><span class="ot-filterline__tag">絞り込み中</span>${terms.join(' ・ ')}</p>
            <button type="button" class="ot-btn ot-btn--text" data-action="clear">条件をクリア</button>`
        : html`<p class="ot-muted">検索語・処理状態の絞り込みなし</p>`}
    </div>`;
}

/** 選んだ記録の直下に、同じ「項目名｜値」の軸で詳細を差し込む。 */
function detail(d, ctx, { detached = false } = {}) {
  const items = [
    ...(detached
      ? [
          ['申請者', d.applicant],
          ['申請種別', d.type],
          ['処理状態', badge(d.status)],
        ]
      : []),
    ['担当課', d.department],
    ['受付方法', d.channel],
    ['処理期限', html`<span class="ot-num">${date(d.dueAt)}</span>`],
    ['備考', d.note || 'なし'],
  ];
  return html`<section class="ot-detail" aria-labelledby="${ctx.uid}-ot-detail">
    <div class="ot-detail__head">
      <h4 class="ot-detail__title" id="${ctx.uid}-ot-detail" tabindex="-1" data-focus="detail">申請詳細<span class="ot-num">（${d.id}）</span></h4>
      <button type="button" class="ot-btn ot-btn--ghost ot-btn--sm" data-action="close-detail">${icon('chevronUp', { size: 14, stroke: 2 })}詳細を閉じる</button>
    </div>
    ${detached ? html`<p class="ot-muted ot-detail__note">現在の検索条件では一覧に表示されていない申請です。</p>` : ''}
    <dl class="ot-axis">${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
  </section>`;
}

const LABELS = { id: '受付番号', status: '処理状態', applicant: '申請者', type: '申請種別', receivedAt: '受付日' };

function cell(key, r) {
  const label = attr('data-label', LABELS[key]);
  if (key === 'id') return html`<td class="ot-num ot-strong" ${label}>${r.id}</td>`;
  if (key === 'status') return html`<td ${label}>${badge(r.status)}</td>`;
  if (key === 'receivedAt') return html`<td class="ot-num" ${label}>${date(r.receivedAt)}</td>`;
  return html`<td ${label}>${r[key]}</td>`;
}

function table(model, ctx) {
  const cols = ORDER.map((k) => model.columns.find((c) => c.key === k));
  const arrow = (c) => icon(c.sorted === 'asc' ? 'arrowUp' : c.sorted === 'desc' ? 'arrowDown' : 'arrowsUpDown', { size: 14, stroke: 2 });
  return html`<table class="ot-ledger">
    <caption class="visually-hidden">申請（${countText(model)}）。列見出しのボタンで並べ替えできます。</caption>
    <thead>
      <tr>
        ${cols.map(
          (c) => html`<th scope="col" aria-sort="${c.ariaSort}" class="${c.sorted ? 'is-sorted' : ''}"><button type="button" class="ot-sort" data-action="sort" data-key="${c.key}">${c.label}${arrow(c)}</button></th>`,
        )}
        <th scope="col" class="ot-col-action"><span class="visually-hidden">詳細</span></th>
      </tr>
    </thead>
    <tbody>
      ${model.rows.length
        ? model.rows.map((r) => {
            const open = model.detail?.id === r.id;
            return html`<tr class="ot-ledger-row ${open ? 'is-open' : ''}">
                ${ORDER.map((k) => cell(k, r))}
                <td class="ot-col-action">
                  <button type="button" class="ot-btn ot-btn--ghost ot-btn--sm" data-action="${open ? 'close-detail' : 'open-detail'}" data-id="${r.id}" aria-expanded="${open ? 'true' : 'false'}">
                    ${icon(open ? 'chevronUp' : 'chevronDown', { size: 14, stroke: 2 })}${open ? '閉じる' : '詳細'}<span class="visually-hidden">（${r.id}）</span>
                  </button>
                </td>
              </tr>
              ${open ? html`<tr class="ot-detail-row"><td colspan="6">${detail(model.detail, ctx)}</td></tr>` : ''}`;
          })
        : html`<tr><td colspan="6" class="ot-empty">条件に一致する申請はありません</td></tr>`}
    </tbody>
  </table>`;
}

function listPage(model, ctx) {
  const detached = model.detail && !model.rows.some((r) => r.id === model.detail.id);
  return html`${conditions(model, ctx)}
    <section class="ot-ledger-section" aria-labelledby="${ctx.uid}-ot-ledger">
      ${resultHead(model, ctx)} ${detached ? detail(model.detail, ctx, { detached: true }) : ''} ${table(model, ctx)}
    </section>`;
}

/* ---------- 登録 ---------- */

export default {
  id: 'okinawa-thread',
  name: '糸の交点（沖縄テーマの独自デザイン）',
  shortName: '糸の交点',
  url: 'https://github.com/YanTKYS/design-lab/blob/main/docs/okinawa-ui-study/README.md',
  urlLabel: '設計と着想',
  summary:
    'このサイト独自の沖縄テーマ案（名称は仮称）。宮古上布の経糸・緯糸・十字絣に着想し、濃藍の地に明るい入力面、本文左の格子帯、章・項目名・値を区切る縦横の軸で読み順を示す。公式のデザインシステムや伝統工芸の再現ではない。',
  traits: {
    density: '本文16px。濃藍の地に横罫だけで行を区切り、縦線は番号・状態の右の1本に絞って線を増やさない。',
    navigation: '濃藍のシステム名の帯にグローバルメニュー、見出し面の右端に十字の反復模様。狭い枠ではメニューボタンで開閉する。',
    table: '受付番号→処理状態→申請者→申請種別→受付日の読み順に固定。詳細は選んだ行の直下に、同じ「項目名｜値」の軸で差し込む。狭い枠では行ごとにラベル付きで縦に読む。',
    input: '明るい無地の検索欄と、件数付きの6択の状態。選択は生成りの塗り・チェック・太字、フォーカスは別の黄色い外枠。',
    actions: '主操作は生成りの塗りに濃藍の文字、副操作は細い枠、クリアは下線の文字。',
    hierarchy: '本文左の格子帯と章の二重罫が全画面に通り、明朝の章見出し→項目名→値の順に読む。',
  },
  formTraits: {
    layout: '「章｜項目名｜入力欄」の3本の軸。1行に1項目で、狭い枠では項目名を入力欄の直上に置く。',
    label: '項目名の横に縦線を挟んで「必須」「任意」を小さく添え、補足は入力欄の直上に置く。',
    errors: '上部のサマリー（件数と項目名のリンク）へフォーカス。各欄は淡い赤の「エラー」と理由、太い枠で示す。',
    confirm: '四角の番号の手順表示。確認は「項目名｜値」の軸で読み、各行の「修正」から元の欄へ戻る。主操作は生成りの塗り。',
  },
  dashboardTraits: {
    kpi: '4枚のカードではなく「指標名→値→定義→一覧へ」の行。先頭の受付件数だけ明るい行で総数を示す。',
    density: '濃藍の地に横罫の行を積む。グラフ・表の領域には模様を敷かない。',
    chart: '月別は月を縦にたどる横棒で、件数を棒の端に文字で添える。状態と種別は件数・割合の表。',
    filter: '期間・担当課のセレクトとリセット、基準日を章の前の一列に置く。',
    hierarchy: '条件→受付と処理の概況→月別・処理状況→申請種別の順。章の二重罫で区切る。',
  },
  errorFocus: 'summary',
  render(model, ctx) {
    const title = model.screen === 'form' ? FORM_TITLES[model.form.step] : TITLES[model.screen] ?? TITLES.list;
    return html`<div class="ds-okinawa-thread">
      ${topbar(model, ctx)}
      <div class="ot-hero">
        <h2 class="ot-hero__title" tabindex="-1" data-focus="heading">${title}</h2>
        ${pattern(ctx.uid)}
      </div>
      <div class="ot-body">
        ${model.notice
          ? html`<div class="ot-notice">
              ${icon('info', { size: 18 })}
              <p><strong>${model.notice.title}</strong> ${model.notice.text}</p>
              <button type="button" class="ot-btn ot-btn--ghost ot-btn--sm" data-action="dismiss-notice">閉じる<span class="visually-hidden">（通知）</span></button>
            </div>`
          : ''}
        ${model.screen === 'form' ? formPage(model, ctx) : model.screen === 'dashboard' ? dashboardPage(model, ctx) : listPage(model, ctx)}
      </div>
      <footer class="ot-footer"><p>${model.system.org}（架空の自治体）</p></footer>
    </div>`;
  },
};
