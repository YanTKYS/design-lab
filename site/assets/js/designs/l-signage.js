// 標示盤（仮称・L案）。このサイト独自の比較デザイン。公式のデザインシステムではない。
// 独立した試作（site/experiments/l-signage-list/・-form/・-dashboard/）の見た目と読み順を、
// 比較サイトの描画契約（render(model, ctx)・data-action・data-bind）に合わせて組み直した。
// 暗い盤面に 5×7 のドット文字で件数を点灯させ、選んだ状態・選んだ行・詳細を琥珀で結ぶ。
// ドット文字は装飾（aria-hidden）で、数値は読み上げられる文字でも1回だけ置く。
import { attr, html, raw } from '../html.js';
import { countText, formatDate } from '../query.js';
import { dashboardPage } from './l-signage.dashboard.js';
import { formPage } from './l-signage.form.js';

const date = (iso) => formatDate(iso, 'slash');
const TITLES = { list: '申請一覧', dashboard: '申請処理ダッシュボード' };

/** 処理状態の記号（色に頼らない手がかり）。 */
export const STATUS_MARK = { received: '○', reviewing: '◐', returned: '△', approved: '●', rejected: '×' };
const statusText = (s) => html`<span class="ll-st"><span aria-hidden="true">${STATUS_MARK[s.value]}</span>${s.label}</span>`;

/* ---------- ドット文字（7段）：数字・小数点・ダッシュ・消灯の桁 ---------- */

const GLYPHS = {
  0: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  1: ['00110', '01110', '00110', '00110', '00110', '00110', '01111'],
  2: ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
  3: ['01110', '11011', '00011', '00110', '00011', '11011', '01110'],
  4: ['00011', '00111', '01011', '11011', '11111', '00011', '00011'],
  5: ['11111', '11000', '11110', '00011', '00011', '11011', '01110'],
  6: ['00110', '01100', '11000', '11110', '11011', '11011', '01110'],
  7: ['11111', '00011', '00110', '00110', '01100', '01100', '01100'],
  8: ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
  9: ['01110', '11011', '11011', '01111', '00011', '00110', '01100'],
  '.': ['00', '00', '00', '00', '00', '11', '11'],
  '—': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'], // 消灯の桁（盤面の幅をそろえる。0 で埋めると「08」と読めてしまう）
};

/**
 * 値をドット文字の SVG にする（装飾。読み上げない）。1桁は左に消灯の桁を足して2桁の幅にそろえる。
 * 使えない文字は消灯の桁として描き、値そのものは呼び出し側が文字で別に置く。
 */
export function dots(value, cls = 'l-dots') {
  const chars = String(value).padStart(2, ' ').split('');
  let x = 0;
  const circles = [];
  for (const c of chars) {
    const glyph = GLYPHS[c] ?? GLYPHS[' '];
    glyph.forEach((row, y) => [...row].forEach((on, i) => circles.push(`<circle cx="${x + i + 0.5}" cy="${y + 0.5}" r="0.38" class="${on === '1' ? 'on' : 'off'}"/>`)));
    x += glyph[0].length + 1;
  }
  const w = Math.max(1, x - 1);
  return raw(`<svg class="${cls}" viewBox="0 0 ${w} 7" style="--w:${w}" aria-hidden="true" focusable="false">${circles.join('')}</svg>`);
}

/* ---------- 枠 ---------- */

const MARK = raw(
  '<svg class="ls-top__mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3h15l-1 18H4z" fill="currentColor"/><path d="M8 8h9M8 12h9M7.6 16h9" stroke="#efeee6" stroke-width="2"/></svg>',
);

function topbar(model, ctx) {
  return html`<header class="ls-top">
    ${MARK}<span class="ls-top__org">${model.system.org}</span><span class="ls-top__system">${model.system.name}</span>
    <nav class="ls-nav" aria-label="メインメニュー">
      <ul>
        ${model.nav.map((n) => html`<li><a href="${ctx.navHref(n)}" data-action="nav" data-target="${n.id}" ${attr('aria-current', n.current && 'page')}>${n.label}</a></li>`)}
      </ul>
    </nav>
    <span class="ls-top__user">審査担当 A</span>
  </header>`;
}

/* ---------- 申請一覧 ---------- */

function head(model, ctx) {
  const kw = `${ctx.uid}-ll-kw`;
  return html`<div class="ll-head">
    <h2 class="ll-title" tabindex="-1" data-focus="heading">申請一覧</h2>
    <form class="ll-search" role="search" aria-label="申請の検索">
      <label for="${kw}">キーワード</label>
      <input id="${kw}" type="search" data-bind="keyword" value="${model.keyword}" placeholder="受付番号・申請者名・申請種別など" autocomplete="off" /><button type="submit">検索</button>
    </form>
  </div>`;
}

/** 盤面：状態ごとの件数をドット文字で点灯。選んだ状態は琥珀・✓・太字（選択はラジオで、共通の絞り込みにつなぐ）。 */
function board(model, ctx) {
  return html`<fieldset class="ll-board">
    <legend class="ll-board__label">処理状態</legend>
    ${model.statusOptions.map(
      (o) => html`<label class="ll-cell">
        <input type="radio" name="${ctx.uid}-ll-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
        <span class="ll-cell__face">
          <span class="ll-cell__label">${o.selected ? html`<span class="ll-cell__check" aria-hidden="true">✓</span>` : ''}${o.label}</span>
          ${dots(o.count, 'l-dots ll-cell__dots')}<span class="visually-hidden">${o.count}件</span>
        </span>
      </label>`,
    )}
  </fieldset>`;
}

const sortHead = (c) => html`<th scope="col" aria-sort="${c.ariaSort}">
  <button type="button" class="ll-sort" data-action="sort" data-key="${c.key}">${c.label}<span aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : ''}</span></button>
</th>`;

function detail(d, ctx, { detached = false } = {}) {
  const items = [
    ['申請者', d.applicant],
    ['ふりがな', d.kana],
    ['申請種別', d.type],
    ['担当課', d.department],
    ['受付日', date(d.receivedAt)],
    ['受付方法', d.channel],
    ['処理期限', date(d.dueAt)],
    ['備考', d.note || 'なし'],
  ];
  return html`<section class="ll-detail" aria-labelledby="${ctx.uid}-ll-detail">
    <div class="ll-detail__id">
      <h3 id="${ctx.uid}-ll-detail" tabindex="-1" data-focus="detail">申請詳細</h3><p>${d.id}</p>
      <p class="ll-detail__st">${statusText(d.status)}</p>
      ${detached ? html`<p class="ll-detail__note">現在の検索条件では一覧に表示されていない申請です。</p>` : ''}
      <button type="button" class="ll-link" data-action="close-detail">詳細を閉じる<span class="visually-hidden">（${d.id}）</span></button>
    </div>
    <dl>${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
  </section>`;
}

function row(r, model, ctx) {
  const open = model.detail?.id === r.id;
  return html`<tr class="ll-row ${open ? 'is-open' : ''}">
      <td class="ll-id" data-label="受付番号">${r.id}</td>
      <td class="ll-name" data-label="申請者">${r.applicant}</td>
      <td class="ll-type" data-label="申請種別">${r.type}</td>
      <td class="ll-date" data-label="受付日">${date(r.receivedAt)}</td>
      <td class="ll-status-cell" data-label="処理状態">${statusText(r.status)}</td>
      <td class="ll-act"><button type="button" data-action="${open ? 'close-detail' : 'open-detail'}" data-id="${r.id}" aria-expanded="${open ? 'true' : 'false'}">${open ? '閉じる' : '詳細'}<span class="visually-hidden">（${r.id}）</span><span aria-hidden="true">${open ? ' −' : ' ＋'}</span></button></td>
    </tr>${open ? html`<tr class="ll-detail-row"><td colspan="6">${detail(model.detail, ctx)}</td></tr>` : ''}`;
}

/** 空の一覧の案内。その時点で画面にある解除の操作だけを挙げる。 */
function emptyHint(model) {
  const ops = [model.filtered && '「条件をクリア」', model.scope.active && '「引き継ぎを解除」'].filter(Boolean);
  if (!ops.length) return '';
  return model.filtered ? `キーワードを変えるか、${ops.join('か')}を選んでください。` : `${ops[0]}を選ぶと、すべての申請を表示します。`;
}

function listPage(model, ctx) {
  const sel = model.statusOptions.find((o) => o.selected && o.value);
  const inRows = model.detail && model.rows.some((r) => r.id === model.detail.id);
  return html`${head(model, ctx)}${board(model, ctx)}
    ${model.scope.active
      ? html`<div class="ll-scope" data-scope>
          <p class="ll-scope__title">ダッシュボードから引き継いだ条件</p>
          <ul>${model.scope.items.map((i) => html`<li>${i.label}：<strong>${i.text}</strong></li>`)}</ul>
          <button type="button" class="ll-link" data-action="clear-scope">引き継ぎを解除</button>
        </div>`
      : ''}
    <div class="ll-count">
      <p><b>${sel ? sel.label : model.keyword ? '検索結果' : 'すべて'}</b><span class="ll-count__n">${countText(model)}</span>${model.keyword ? html`<span class="ll-count__kw">「${model.keyword}」</span>` : ''}</p>
      <div class="ll-count__ops">
        ${model.filtered ? html`<button type="button" class="ll-link" data-action="clear">条件をクリア</button>` : ''}
        <button type="button" class="ls-btn ls-btn--ghost ll-new" data-action="new">＋ 新規申請</button>
      </div>
    </div>
    ${model.detail && !inRows ? detail(model.detail, ctx, { detached: true }) : ''}
    ${model.rows.length
      ? html`<table class="ll-table"><caption class="visually-hidden">申請一覧（${countText(model)}）。列見出しのボタンで並べ替えできます。</caption>
          <thead><tr>${model.columns.map(sortHead)}<th scope="col" class="ll-col-act"><span class="visually-hidden">操作</span></th></tr></thead>
          <tbody>${model.rows.map((r) => row(r, model, ctx))}</tbody></table>`
      : html`<p class="ll-empty">条件に一致する申請はありません。${emptyHint(model)}</p>`}`;
}

/* ---------- 登録 ---------- */

export default {
  id: 'l-signage',
  name: '標示盤（独自デザイン・L案）',
  shortName: '標示盤',
  url: 'https://github.com/YanTKYS/design-lab/blob/main/docs/design-exploration-4/README.md',
  urlLabel: '設計と着想',
  summary:
    'このサイト独自の案（名称は仮称、L案）。駅や空港の標示盤に着想し、暗い緑黒の盤面に 5×7 のドット文字で件数を点灯させ、選んだ状態・行・現在の手順を琥珀で示す。公式のデザインシステムではない。',
  traits: {
    density: '暗い盤面に本文15px。表は細い罫で行を区切り、行の高さは詰めすぎない。上段の盤面で全体の件数を先に見せる。',
    navigation: '生成りの帯にグローバルメニュー。現在地は太字と下線。狭い枠ではメニューを帯の下に1行で並べる。',
    table: '受付番号→申請者→申請種別→受付日→処理状態の表。選んだ行は琥珀の地と太字、詳細はその直下に左の琥珀の帯で開く。狭い枠では行ごとに縦へ積み、列見出しは並べ替えの札の列になる。',
    input: '盤面の6区画（すべて・各状態）が処理状態の選択肢で、件数をドット文字で点灯する。選んだ区画は琥珀・✓・太字。検索欄は暗い地に生成りの検索ボタン。',
    actions: '主操作は琥珀の塗り、副操作は細い枠、条件のクリアは琥珀の下線の文字。フォーカスは琥珀と混同しない生成りの外枠。',
    hierarchy: '大きな表題と検索→状態の盤面→件数と操作→表。琥珀が「いま選んでいるもの」を盤面・行・詳細で結ぶ。',
  },
  formTraits: {
    layout: '左の列に現在の手順（琥珀の地にドット文字）と、琥珀の縦の罫から枝分かれした章名。右の列に入力欄（2列、申請内容と同意は全幅）。下段に「次の手順」と、そこへ進む操作を点線でつなぐ。中間の幅では入力欄を1列、狭い枠では全体を1列にし、罫は左端に通す。',
    label: '太字の項目名の右に、枠囲みの「必須」／文字だけの「任意」。補足は入力欄の下。',
    errors: '上部のエラー一覧（左に赤い帯）へフォーカス。章名の下に「エラー n件」、各欄は赤い枠・左の帯と「！ エラー」の理由。',
    confirm: '同じ章と罫のまま値を並べ、各項目の「修正」から元の欄へ戻る。下段の点線の先に「申請する」。',
  },
  dashboardTraits: {
    kpi: '4指標をドット文字の盤面で点灯。処理待ちは琥珀の区画で、下の処理状態の表の「処理待ち」の区分と同じ色・同じ言葉で結ぶ。各指標から同じ条件の一覧へ（0件はリンクにしない）。',
    density: '盤面・月別・処理状況・申請種別を、見出しの帯と細い罫で区切って積む。',
    chart: '月別と申請種別は「1目盛り＝1件」の点灯で、点灯の数が件数と一致する（最多の値に合わせて縮めない）。右端に件数を数字でも書く。',
    filter: '表題の右に対象期間・担当課のセレクトと「既定に戻す」。基準日と集計の範囲は表題の下、集計の定義は盤面の上の折りたたみ。',
    hierarchy: '表題と集計条件→指標の盤面→月別・処理状況→申請種別。処理状況は「処理待ち／処理完了」の区分で束ねる。',
  },
  errorFocus: 'summary',
  render(model, ctx) {
    const screen = model.screen === 'form' || model.screen === 'dashboard' ? model.screen : 'list';
    return html`<div class="ds-l-signage">
      ${topbar(model, ctx)}
      <div class="ls-main">
        ${model.notice
          ? html`<div class="ls-notice" role="status">
              <p><strong>${model.notice.title}</strong>　${model.notice.text}</p>
              <button type="button" class="ll-link" data-action="dismiss-notice">閉じる<span class="visually-hidden">（通知）</span></button>
            </div>`
          : ''}
        ${screen === 'form' ? formPage(model, ctx) : screen === 'dashboard' ? dashboardPage(model, ctx, TITLES.dashboard) : listPage(model, ctx)}
      </div>
    </div>`;
  },
};
