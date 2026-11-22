// 二色刷り（仮称・J案）。このサイト独自の比較デザイン。公式のデザインシステムではない。
// 独立した試作（site/experiments/j-risograph-list/・-form/・-dashboard/）の見た目と読み順を、
// 比較サイトの描画契約（render(model, ctx)・data-action・data-bind）に合わせて組み直した。
// 生成りの紙に青と蛍光ピンクの2版。ピンク（版ずれ・網点）は飾りと選択の地に限り、状態は記号と文字、選択は青の帯と文言でも示す。
import { attr, html } from '../html.js';
import { countText, formatDate } from '../query.js';
import { dashboardPage } from './j-risograph.dashboard.js';
import { formPage } from './j-risograph.form.js';

const date = (iso) => formatDate(iso, 'slash');
const TITLES = { list: '申請一覧', dashboard: '申請処理ダッシュボード' };
const FORM_TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '申請の入力が完了しました' };

/** 処理状態の記号（色に頼らない手がかり）。 */
export const STATUS_MARK = { received: '○', reviewing: '◐', returned: '△', approved: '●', rejected: '×' };
const statusText = (s) => html`<span class="jl-st"><span aria-hidden="true">${STATUS_MARK[s.value]}</span>${s.label}</span>`;

/* ---------- 枠 ---------- */

function topbar(model, ctx) {
  return html`<header class="jl-top">
    <span class="jl-top__org">${model.system.org}</span><span class="jl-top__system">${model.system.name}</span>
    <nav class="jl-nav" aria-label="メインメニュー">
      <ul>
        ${model.nav.map((n) => html`<li><a href="${ctx.navHref(n)}" data-action="nav" data-target="${n.id}" ${attr('aria-current', n.current && 'page')}>${n.label}</a></li>`)}
      </ul>
    </nav>
    <span class="jl-top__user">審査担当 A</span>
  </header>`;
}

/* ---------- 申請一覧 ---------- */

function tools(model, ctx) {
  const kw = `${ctx.uid}-jl-kw`;
  const sel = model.statusOptions.find((o) => o.selected && o.value);
  return html`<div class="jl-tools">
    <form class="jl-search" role="search" aria-label="申請の検索">
      <label for="${kw}">キーワード</label>
      <input id="${kw}" type="search" data-bind="keyword" value="${model.keyword}" placeholder="受付番号・申請者名・申請種別など" autocomplete="off" />
      <button type="submit">検索</button>
    </form>
    <fieldset class="jl-status">
      <legend class="visually-hidden">処理状態</legend>
      ${model.statusOptions.map(
        (o) => html`<label class="jl-status__item">
          <input type="radio" name="${ctx.uid}-jl-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
          <span>${o.selected ? html`<span aria-hidden="true">✓ </span>` : ''}${o.label}<span class="jl-status__n">${o.count}<span class="visually-hidden">件</span></span></span>
        </label>`,
      )}
    </fieldset>
    <p class="jl-cond">
      ${model.filtered
        ? html`<span class="jl-cond__tag">絞り込み中</span>${sel ? html`処理状態「${sel.label}」` : ''}${model.keyword ? html`${sel ? '・' : ''}キーワード「${model.keyword}」` : ''}（${countText(model)}）　<button type="button" class="jl-link" data-action="clear">条件をクリア</button>`
        : html`すべての申請を表示しています（${countText(model)}）`}
    </p>
  </div>`;
}

const sortHead = (c) => html`<th scope="col" aria-sort="${c.ariaSort}">
  <button type="button" class="jl-sort" data-action="sort" data-key="${c.key}">${c.label}<span aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : '↕'}</span></button>
</th>`;

function detail(d, ctx, { detached = false } = {}) {
  const items = [
    ['申請者', d.applicant],
    ['ふりがな', d.kana],
    ['申請種別', d.type],
    ['担当課', d.department],
    ['受付方法', d.channel],
    ['受付日', date(d.receivedAt)],
    ['処理期限', date(d.dueAt)],
    ['処理状態', statusText(d.status)],
    ['備考', d.note || 'なし'],
  ];
  return html`<section class="jl-detail" aria-labelledby="${ctx.uid}-jl-detail">
    <div class="jl-detail__id">
      <h3 id="${ctx.uid}-jl-detail" tabindex="-1" data-focus="detail">申請詳細</h3><p>${d.id}</p>
      ${detached ? html`<p class="jl-detail__note">現在の検索条件では一覧に表示されていない申請です。</p>` : ''}
      <button type="button" class="jl-link" data-action="close-detail">詳細を閉じる<span class="visually-hidden">（${d.id}）</span></button>
    </div>
    <dl class="jl-dl">${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
  </section>`;
}

function row(r, open, ctx, model) {
  return html`<tr class="jl-row ${open ? 'is-open' : ''}">
      <td class="jl-id" data-label="受付番号">${r.id}${open ? html`<span class="jl-open-tag">表示中</span>` : ''}</td>
      <td class="jl-name" data-label="申請者">${r.applicant}</td>
      <td class="jl-type" data-label="申請種別">${r.type}</td>
      <td class="jl-date" data-label="受付日">${date(r.receivedAt)}</td>
      <td class="jl-status-cell" data-label="処理状態">${statusText(r.status)}</td>
      <td class="jl-act"><button type="button" data-action="${open ? 'close-detail' : 'open-detail'}" data-id="${r.id}" aria-expanded="${open ? 'true' : 'false'}">${open ? '閉じる' : '詳細'}<span class="visually-hidden">（${r.id}）</span></button></td>
    </tr>${open ? html`<tr class="jl-detail-row"><td colspan="6">${detail(model.detail, ctx)}</td></tr>` : ''}`;
}

/** 空の一覧の案内。その時点で画面にある解除の操作だけを挙げる。 */
function emptyHint(model) {
  const ops = [model.filtered && '「条件をクリア」', model.scope.active && '「引き継ぎを解除」'].filter(Boolean);
  if (!ops.length) return '';
  return model.filtered ? `キーワードを変えるか、${ops.join('か')}を選んでください。` : `${ops[0]}を選ぶと、すべての申請を表示します。`;
}

function listPage(model, ctx) {
  const detached = model.detail && !model.rows.some((r) => r.id === model.detail.id);
  return html`${tools(model, ctx)}
    ${model.scope.active
      ? html`<div class="jl-scope" data-scope>
          <p class="jl-scope__title">ダッシュボードから引き継いだ条件</p>
          <ul>${model.scope.items.map((i) => html`<li>${i.label}：<strong>${i.text}</strong></li>`)}</ul>
          <button type="button" class="jl-link" data-action="clear-scope">引き継ぎを解除</button>
        </div>`
      : ''}
    ${detached ? detail(model.detail, ctx, { detached: true }) : ''}
    ${model.rows.length
      ? html`<table class="jl-table"><caption class="visually-hidden">申請一覧（${countText(model)}）。列見出しのボタンで並べ替えできます。</caption>
          <thead><tr>${model.columns.map(sortHead)}<th scope="col" class="jl-col-act"><span class="visually-hidden">操作</span></th></tr></thead>
          <tbody>${model.rows.map((r) => row(r, model.detail?.id === r.id, ctx, model))}</tbody></table>`
      : html`<p class="jl-empty">条件に一致する申請はありません。${emptyHint(model)}</p>`}`;
}

/* ---------- 登録 ---------- */

export default {
  id: 'j-risograph',
  name: '二色刷り（独自デザイン・J案）',
  shortName: '二色刷り',
  url: 'https://github.com/YanTKYS/design-lab/blob/main/docs/design-exploration-3/README.md',
  urlLabel: '設計と着想',
  summary:
    'このサイト独自の案（名称は仮称、J案）。リソグラフの二色刷りに着想し、生成りの紙に青の版で文字・罫・操作を刷り、蛍光ピンクの版を版ずれ・網点の飾りに使う。状態やエラーはピンクではなく記号・文字・青の札で示す。公式のデザインシステムではない。',
  traits: {
    density: '本文15px、行は青の点線罫で区切る。版ずれの大きな見出しと件数を表の上に置き、表そのものは余白を詰めすぎない。',
    navigation: '青い罫の帯にグローバルメニュー。現在地は青の丸い札にピンクのずれた影。狭い枠ではメニューを帯の下に1行で並べる。',
    table: '受付番号→申請者→申請種別→受付日→処理状態の表。選んだ行は網点の地・左の青い帯・「表示中」の札で示し、詳細はその行の直下に開く。狭い枠では行ごとにカード状に縦へ積み、列見出しは並べ替えの札の列になる。',
    input: '丸い検索欄と青の検索ボタン。処理状態は件数付きの丸い札で、選んだものは青の地・✓・ピンクのずれた影。',
    actions: '主操作は青の塗りにピンクのずれた影、副操作は青の枠、条件のクリアはピンクの波線の下線の文字。',
    hierarchy: '版ずれの大見出し（青の上にピンクのずれ）→件数→検索と状態→表。ピンクは飾りと選択の地だけで、情報は青の版で読める。',
  },
  formTraits: {
    layout: '左に章名（青・網点の下線）、右に2列の入力欄。申請内容だけ全幅。章の境は青の点線。狭い枠では章名を上に、入力欄を1列に積む。',
    label: '太字の項目名の横に、ピンクの地の「必須」／枠だけの「任意」。補足は入力欄の下。',
    errors: '上部のエラー一覧（二重罫の枠）へフォーカス。各欄は青の反転札「エラー」と理由、二重罫の太枠。ピンクはエラーに使わない。',
    confirm: '同じ章立てで値を点線の上に並べ、各項目の「修正」から元の欄へ戻る。手順は丸い札で、現在の手順は青の地にピンクの影。',
  },
  dashboardTraits: {
    kpi: '上下の青い罫の間に4つの指標を点線で区切って並べ、数値は青の極太。最初の指標の右上に網点の円（数値・説明に掛からない位置）。各指標から一覧へ。',
    density: '指標・月別・内訳を罫で区切った帯に積む。内訳の種別は青の枠とピンクの影の札に入れる。',
    chart: '月別は青の縦棒にピンクの版ずれの縁、件数は棒の真上。状態・種別は件数・割合と、割合と同じ尺度（受付総数に対する構成比）の細い棒。',
    filter: '表題の右に丸い期間・担当課のセレクトとリセット。基準日・集計の範囲・定義は表題の下。',
    hierarchy: '版ずれの表題→指標の帯→月別の帯→処理状況と申請種別の2列。狭い枠では指標を2列2段、ほかは1列に積む。',
  },
  errorFocus: 'summary',
  render(model, ctx) {
    const title = model.screen === 'form' ? FORM_TITLES[model.form.step] : TITLES[model.screen] ?? TITLES.list;
    const isList = model.screen !== 'form' && model.screen !== 'dashboard';
    return html`<div class="ds-j-risograph">
      ${topbar(model, ctx)}
      <div class="jl-main">
        <div class="jl-hero jl-hero--${isList ? 'list' : model.screen}">
          <h2 class="jl-title" data-text="${title}" tabindex="-1" data-focus="heading">${title}</h2>
          ${isList ? html`<p class="jl-hero__count"><b>${model.shown}</b>件 <span>／ 全${model.total}件</span></p><button type="button" class="jl-btn jl-new" data-action="new">＋ 新規申請</button>` : ''}
          ${model.screen === 'form' ? formSteps(model.form) : ''}
          <span class="jl-hero__dots" aria-hidden="true"></span>
        </div>
        ${model.notice
          ? html`<div class="jl-notice" role="status">
              <p><span class="jl-cond__tag">お知らせ</span><strong>${model.notice.title}</strong>　${model.notice.text}</p>
              <button type="button" class="jl-link" data-action="dismiss-notice">閉じる<span class="visually-hidden">（通知）</span></button>
            </div>`
          : ''}
        ${model.screen === 'form' ? formPage(model, ctx) : model.screen === 'dashboard' ? dashboardPage(model, ctx) : listPage(model, ctx)}
      </div>
    </div>`;
  },
};

function formSteps(form) {
  return html`<ol class="jr-steps" aria-label="申請の手順（ステップ ${form.stepIndex + 1} / ${form.steps.length}）">
    ${form.steps.map(
      (s) => html`<li class="${s.current ? 'is-current' : ''}" ${attr('aria-current', s.current && 'step')}>${s.number}　${s.label}${s.current ? html`<small>現在</small>` : s.done ? html`<small>済</small>` : ''}</li>`,
    )}
  </ol>`;
}
