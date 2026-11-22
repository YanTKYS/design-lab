// 汀線（仮称・K案）。このサイト独自の比較デザイン。公式のデザインシステムではない。
// 独立した試作（site/experiments/k-shoreline-list/・-form/・-dashboard/）の見た目と読み順を、
// 比較サイトの描画契約（render(model, ctx)・data-action・data-bind）に合わせて組み直した。
//
// 一覧の詳細は、選んだ行の直後の行（tr）に1つだけ置く。広いペインでは CSS でその行を表の右の列に移し、
// 選んだ行の淡い緑が右の詳細の面へ続いて見えるようにする。狭いペインでは行の直後にそのまま開く。
// 幅を JavaScript で判定したり、詳細を2つ描いたりはしない。
import { attr, html, raw } from '../html.js';
import { countText, formatDate } from '../query.js';
import { dashboardPage } from './k-shoreline.dashboard.js';
import { formPage } from './k-shoreline.form.js';

const date = (iso) => formatDate(iso, 'slash');
const TITLES = { list: '申請一覧', dashboard: '申請処理ダッシュボード' };
const FORM_TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '申請の入力が完了しました' };

/** 処理状態の記号（色に頼らない手がかり）。 */
export const STATUS_MARK = { received: '○', reviewing: '◐', returned: '△', approved: '●', rejected: '×' };
const statusText = (s) => html`<span class="kl-st"><span aria-hidden="true">${STATUS_MARK[s.value]}</span>${s.label}</span>`;

const MARK = raw('<svg class="kl-top__mark" width="24" height="22" viewBox="0 0 24 22" aria-hidden="true" focusable="false"><path d="M1 21V9C6 3 14 1 23 1v7C15 8 8 10 5 21z" fill="currentColor"/></svg>');

/** 詳細の左端の汀線（装飾。ID を持たないので左右比較でも衝突しない）。 */
const SHORE = raw(
  '<svg class="kl-shore" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="kl-shore__sea" d="M40 0H18C8 30 6 64 14 100H40Z"/><path d="M15 0C5 30 3 64 11 100"/><path d="M10 0C1 30 -1 64 6 100"/></svg>',
);

/* ---------- 枠 ---------- */

function topbar(model, ctx) {
  return html`<header class="kl-top">
    ${MARK}<span class="kl-top__org">${model.system.org}</span><span class="kl-top__system">${model.system.name}</span>
    <nav class="kl-nav" aria-label="メインメニュー">
      <ul>
        ${model.nav.map((n) => html`<li><a href="${ctx.navHref(n)}" data-action="nav" data-target="${n.id}" ${attr('aria-current', n.current && 'page')}>${n.label}</a></li>`)}
      </ul>
    </nav>
    <span class="kl-top__user">審査担当 A</span>
  </header>`;
}

/* ---------- 申請一覧 ---------- */

function tools(model, ctx) {
  const kw = `${ctx.uid}-kl-kw`;
  return html`<div class="kl-tools">
    <form class="kl-search" role="search" aria-label="申請の検索">
      <label for="${kw}">キーワード</label>
      <div><input id="${kw}" type="search" data-bind="keyword" value="${model.keyword}" placeholder="受付番号・申請者名・申請種別など" autocomplete="off" /><button type="submit">検索</button></div>
    </form>
    <fieldset class="kl-status">
      <legend>処理状態</legend>
      <div>
        ${model.statusOptions.map(
          (o) => html`<label class="kl-status__item">
            <input type="radio" name="${ctx.uid}-kl-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
            <span>${o.selected ? html`<span aria-hidden="true">✓ </span>` : ''}${o.label}<span class="kl-status__n">${o.count}<span class="visually-hidden">件</span></span></span>
          </label>`,
        )}
      </div>
    </fieldset>
  </div>`;
}

const sortHead = (c) => html`<th scope="col" aria-sort="${c.ariaSort}">
  <button type="button" class="kl-sort" data-action="sort" data-key="${c.key}">${c.label}<span aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : ''}</span></button>
</th>`;

function detail(d, ctx, { detached = false } = {}) {
  return html`<section class="kl-detail" aria-labelledby="${ctx.uid}-kl-detail">
    ${SHORE}
    <div class="kl-detail__in">
      <div class="kl-detail__head"><h3 id="${ctx.uid}-kl-detail" tabindex="-1" data-focus="detail">申請詳細</h3>
        <button type="button" class="kl-link kl-detail__close" data-action="close-detail">詳細を閉じる<span class="visually-hidden">（${d.id}）</span><span aria-hidden="true"> ×</span></button></div>
      <div class="kl-detail__body">
      <p class="kl-badge">${statusText(d.status)}</p>
      ${detached ? html`<p class="kl-detail__note">現在の検索条件では一覧に表示されていない申請です。</p>` : ''}
      <p class="kl-detail__id">${d.id}</p>
      <p class="kl-detail__name">${d.applicant}</p>
      <p class="kl-detail__kana">${d.kana}</p>
      <dl>
        <div><dt>申請種別</dt><dd>${d.type}</dd></div>
        <div><dt>担当課</dt><dd>${d.department}</dd></div>
        <div><dt>受付方法</dt><dd>${d.channel}</dd></div>
        <div><dt>受付日</dt><dd>${date(d.receivedAt)}</dd></div>
        <div><dt>処理期限</dt><dd>${date(d.dueAt)}</dd></div>
        <div><dt>備考</dt><dd>${d.note || 'なし'}</dd></div>
      </dl>
      </div>
    </div>
  </section>`;
}

function row(r, model, ctx) {
  const open = model.detail?.id === r.id;
  return html`<tr class="kl-row ${open ? 'is-open' : ''}">
      <td class="kl-id" data-label="受付番号">${r.id}</td>
      <td class="kl-name" data-label="申請者">${r.applicant}</td>
      <td class="kl-type" data-label="申請種別">${r.type}</td>
      <td class="kl-date" data-label="受付日">${date(r.receivedAt)}</td>
      <td class="kl-status-cell" data-label="処理状態">${statusText(r.status)}</td>
      <td class="kl-act"><button type="button" class="kl-link" data-action="${open ? 'close-detail' : 'open-detail'}" data-id="${r.id}" aria-expanded="${open ? 'true' : 'false'}">${open ? '閉じる' : '詳細'}<span class="visually-hidden">（${r.id}）</span><span aria-hidden="true">${open ? ' ×' : ' ›'}</span></button></td>
    </tr>${open ? html`<tr class="kl-detail-row"><td colspan="6">${detail(model.detail, ctx)}</td></tr>` : ''}`;
}

/** 空の一覧の案内。その時点で画面にある解除の操作だけを挙げる。 */
function emptyHint(model) {
  const ops = [model.filtered && '「条件をクリア」', model.scope.active && '「引き継ぎを解除」'].filter(Boolean);
  if (!ops.length) return '';
  return model.filtered ? `キーワードを変えるか、${ops.join('か')}を選んでください。` : `${ops[0]}を選ぶと、すべての申請を表示します。`;
}

function listPage(model, ctx) {
  const inRows = model.detail && model.rows.some((r) => r.id === model.detail.id);
  return html`${tools(model, ctx)}
    ${model.scope.active
      ? html`<div class="kl-scope" data-scope>
          <p class="kl-scope__title">ダッシュボードから引き継いだ条件</p>
          <ul>${model.scope.items.map((i) => html`<li>${i.label}：<strong>${i.text}</strong></li>`)}</ul>
          <button type="button" class="kl-link" data-action="clear-scope">引き継ぎを解除</button>
        </div>`
      : ''}
    <div class="kl-work ${model.rows.length ? 'has-rows' : ''} ${inRows ? 'has-detail' : ''}">
      <div class="kl-results__head"><h3>検索結果</h3><p>${countText(model)}${model.keyword ? html`（「${model.keyword}」）` : ''}</p>
        ${model.filtered ? html`<button type="button" class="kl-link" data-action="clear">条件をクリア</button>` : ''}</div>
      ${model.detail && !inRows ? detail(model.detail, ctx, { detached: true }) : ''}
      ${model.rows.length
        ? html`<table class="kl-table"><caption class="visually-hidden">申請一覧（${countText(model)}）。列見出しのボタンで並べ替えできます。</caption>
            <thead><tr>${model.columns.map(sortHead)}<th scope="col" class="kl-col-act"><span class="visually-hidden">操作</span></th></tr></thead>
            <tbody>${model.rows.map((r) => row(r, model, ctx))}</tbody></table>`
        : html`<p class="kl-empty">条件に一致する申請はありません。${emptyHint(model)}</p>`}
      ${model.rows.length && !inRows ? html`<div class="kl-detail-slot"><p class="kl-detail-slot__text">${SHORE}<span>申請の「詳細」を選ぶと、ここに表示します。</span></p></div>` : ''}
    </div>`;
}

/* ---------- 登録 ---------- */

export default {
  id: 'k-shoreline',
  name: '汀線（独自デザイン・K案）',
  shortName: '汀線',
  url: 'https://github.com/YanTKYS/design-lab/blob/main/docs/design-exploration-4/README.md',
  urlLabel: '設計と着想',
  summary:
    'このサイト独自の案（名称は仮称、K案）。水際の汀線に着想し、淡い緑の面と曲線で情報のまとまりと選択を示す。表題の右に等高線のような自作の装飾、明朝の見出し。公式のデザインシステムではない。',
  traits: {
    density: '本文15px、行は細い罫で区切る。表は余白をとり、選んだ行だけを淡い緑の面にする。',
    navigation: '細い罫の帯にグローバルメニュー。現在地は緑の下線。表題の段の右に等高線の装飾。狭い枠ではメニューを帯の下に1行で並べる。',
    table: '受付番号→申請者→申請種別→受付日→処理状態の表。広い枠では選んだ行の淡い緑が右の詳細の面へ続き、詳細の左端を汀線の曲線で受ける。狭い枠では行ごとに縦へ積み、詳細はその行の直後に開く。',
    input: '検索欄と緑の検索ボタン。処理状態は件数付きの選択肢で、選んだものは淡い緑の地・緑の下線・✓で示す。',
    actions: '主操作は緑の塗り、副操作は緑の枠、詳細を開く・閉じる・条件のクリアは下線の文字。',
    hierarchy: '明朝の大きな表題→検索と状態→結果の見出しと件数→表。淡い緑の面が「選んでいるもの」を示す。',
  },
  formTraits: {
    layout: '章ごとに、左の淡い緑の章名の面（陸）と右の入力欄（水際の内側）を汀線の曲線で分け、曲線は章の高さに合わせて伸びる。入力欄は2列で、申請内容と同意は全幅。狭い枠では章名を上に置き、入力欄を1列に積む。',
    label: '太字の項目名の横に、枠囲みの「必須」（淡い緑の地）／「任意」（枠だけ）。補足は入力欄の下。',
    errors: '上部のエラー一覧（左に赤い帯）へフォーカス。章名の下に「エラー n件」、各欄は赤い枠と「エラー」の文言。',
    confirm: '同じ章と曲線のまま値を並べ、各項目の「修正」から元の欄へ戻る。手順は丸い番号と線で、現在の手順は緑の丸。',
  },
  dashboardTraits: {
    kpi: '淡い緑の帯に4つの指標を細い罫で区切って並べ、数値は明朝。各指標から同じ条件の一覧へ（0件の指標はリンクにしない）。',
    density: '指標の帯、月別と処理状況、淡い緑の面に入れた申請種別の2列。表は細い罫で行を区切る。',
    chart: '月別は、各月の点・縦の線・点の真上の件数が実測の値。等高線のような滑らかな線と面は推移の目安で、単調な補間なので月の間に実在しない山や谷を作らず、0件の月は基準線に置く。',
    filter: '表題の段に、基準日・集計の範囲と、対象期間・担当課のセレクト・リセットを置く。集計の定義は折りたたみ。',
    hierarchy: '表題と集計条件→指標の帯→月別・処理状況→申請種別。中間の幅では指標を2列2段、狭い枠では1列に積む。',
  },
  errorFocus: 'summary',
  render(model, ctx) {
    const title = model.screen === 'form' ? FORM_TITLES[model.form.step] : TITLES[model.screen] ?? TITLES.list;
    const screen = model.screen === 'form' || model.screen === 'dashboard' ? model.screen : 'list';
    return html`<div class="ds-k-shoreline">
      ${topbar(model, ctx)}
      <div class="kl-hero kl-hero--${screen}">
        <div class="kl-hero__text">
          <div class="kl-hero__title"><h2 class="kl-title" tabindex="-1" data-focus="heading">${title}</h2>${screen === 'dashboard' ? heroRef(model.dashboard) : ''}</div>
          ${screen === 'list' ? html`<p class="kl-hero__count"><b>${model.status ? model.statusOptions.find((o) => o.selected).label : model.keyword ? '検索結果' : 'すべて'}</b><span>${model.shown}</span>件 ／ 全${model.total}件</p><button type="button" class="kl-btn kl-new" data-action="new">＋ 新規申請</button>` : ''}
          ${screen === 'form' ? formSteps(model.form) : ''}
          ${screen === 'dashboard' ? heroConditions(model.dashboard, ctx) : ''}
        </div>
        <span class="kl-hero__art" aria-hidden="true"></span>
      </div>
      <div class="kl-body">
        ${model.notice
          ? html`<div class="kl-notice" role="status">
              <p><strong>${model.notice.title}</strong>　${model.notice.text}</p>
              <button type="button" class="kl-link" data-action="dismiss-notice">閉じる<span class="visually-hidden">（通知）</span></button>
            </div>`
          : ''}
        ${screen === 'form' ? formPage(model, ctx) : screen === 'dashboard' ? dashboardPage(model, ctx) : listPage(model, ctx)}
      </div>
    </div>`;
  },
};

function formSteps(form) {
  return html`<ol class="ks-steps" aria-label="申請の手順（ステップ ${form.stepIndex + 1} / ${form.steps.length}）">
    ${form.steps.map(
      (s) => html`<li class="${s.current ? 'is-current' : ''} ${s.done ? 'is-done' : ''}" ${attr('aria-current', s.current && 'step')}><span class="ks-steps__n">${s.number}</span><span class="ks-steps__label">${s.label}</span>${s.current ? html`<small>現在</small>` : s.done ? html`<small>済</small>` : ''}</li>`,
    )}
  </ol>`;
}

/** ダッシュボード：表題の横の基準日と集計の範囲。 */
const heroRef = (d) => html`<p class="kd-ref">基準日　${d.refDate}<span>${d.scopeText}</span></p>`;

/** ダッシュボード：表題の段に置く集計条件（試作と同じ位置）。 */
function heroConditions(d, ctx) {
  const select = (name, label, options) => html`<div class="kd-cond__field">
    <label for="${ctx.uid}-kd-${name}">${label}</label>
    <select id="${ctx.uid}-kd-${name}" data-bind="${name}">${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}</select>
  </div>`;
  return html`<div class="kd-cond" role="group" aria-label="集計条件">
    ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
    <button type="button" class="kd-reset" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>既定に戻す</button>
  </div>`;
}
