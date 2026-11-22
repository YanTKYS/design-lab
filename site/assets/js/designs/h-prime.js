// 折本（仮称・H′案）。このサイト独自の比較デザイン。公式のデザインシステムではない。
// 独立した試作（site/experiments/h-prime-list/・-form/・-dashboard/）の見た目と読み順を、
// 比較サイトの描画契約（render(model, ctx)・data-action・data-bind）に合わせて組み直した。
//
// 一覧：縦組みの申請を「面」として右から左へ8面ずつ並べる。該当する申請はすべて DOM に置き、
// 現在の見開き（8面）以外は hidden にする。見開きの番号はペインごとの一時状態（ctx.ui.page）で持ち、
// 検索・状態・並べ替え・引き継ぎ条件が変わったら1見開き目へ戻す。詳細を開いた申請はその見開きへ移す。
import { attr, html, raw } from '../html.js';
import { countText, formatDate } from '../query.js';
import { dashboardPage } from './h-prime.dashboard.js';
import { formPage } from './h-prime.form.js';

export const PAGE_SIZE = 8;
const date = (iso) => formatDate(iso, 'slash');
const TITLES = { list: '申請一覧', dashboard: '申請処理ダッシュボード' };
const FORM_TITLES = { edit: '新規申請', confirm: '入力内容の確認', done: '申請の入力が完了しました' };
const CORP = /^(株式会社|有限会社|合同会社)/;

/** 処理状態の記号（色に頼らない手がかり）。 */
export const STATUS_MARK = { received: '○', reviewing: '◐', returned: '△', approved: '●', rejected: '×' };
export const statusText = (s) => html`<span class="hp-st"><span aria-hidden="true">${STATUS_MARK[s.value]}</span>${s.label}</span>`;

/* ---------- 枠 ---------- */

const MARK = raw('<svg class="hp-top__mark" width="26" height="22" viewBox="0 0 26 22" aria-hidden="true" focusable="false"><path d="M1 2l12 3v16L1 18zM25 2l-12 3v16l12-3z" fill="currentColor"/></svg>');

function topbar(model, ctx) {
  return html`<header class="hp-top">
    ${MARK}<span class="hp-top__org">${model.system.org}</span><span class="hp-top__system">${model.system.name}</span>
    <nav class="hp-nav" aria-label="メインメニュー">
      <ul>
        ${model.nav.map((n) => html`<li><a href="${ctx.navHref(n)}" data-action="nav" data-target="${n.id}" ${attr('aria-current', n.current && 'page')}>${n.label}</a></li>`)}
      </ul>
    </nav>
    <span class="hp-top__user">審査担当 A</span>
  </header>`;
}

/* ---------- 申請一覧 ---------- */

/** 見開きの番号を決める（ctx.ui を更新する）。条件が変わったら1見開き目へ、詳細を開いた申請はその見開きへ。 */
function currentPage(model, ctx) {
  const pages = Math.max(1, Math.ceil(model.rows.length / PAGE_SIZE));
  const sig = JSON.stringify([model.keyword, model.status, model.sort, model.scope.summary]);
  const detailIndex = model.detail ? model.rows.findIndex((r) => r.id === model.detail.id) : -1;
  let page = Number(ctx.ui.page) || 0;
  if (ctx.ui.pageSig !== undefined && ctx.ui.pageSig !== sig) page = 0;
  if (detailIndex >= 0 && (ctx.ui.pageSig !== sig || ctx.ui.detailId !== model.detail.id)) page = Math.floor(detailIndex / PAGE_SIZE);
  page = Math.min(Math.max(page, 0), pages - 1);
  Object.assign(ctx.ui, { page, pageSig: sig, detailId: model.detail?.id ?? null });
  return { page, pages };
}

function search(model, ctx) {
  const kw = `${ctx.uid}-hp-kw`;
  return html`<form class="hp-search" role="search" aria-label="申請の検索">
    <label for="${kw}">キーワード検索</label>
    <div><input id="${kw}" type="search" data-bind="keyword" value="${model.keyword}" placeholder="受付番号・申請者名・ふりがな・申請種別・担当課" autocomplete="off" /><button type="submit">検索</button></div>
  </form>`;
}

function statusFilter(model, ctx) {
  return html`<fieldset class="hp-status">
    <legend class="hp-status__label">処理状態</legend>
    <div class="hp-status__items">
      ${model.statusOptions.map(
        (o) => html`<label class="hp-status__item">
          <input type="radio" name="${ctx.uid}-hp-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
          <span>${o.selected ? html`<span aria-hidden="true">✓</span>` : ''}${o.label}<span class="hp-n">${o.count}<span class="visually-hidden">件</span></span></span>
        </label>`,
      )}
    </div>
    ${model.filtered ? html`<button type="button" class="hp-link hp-status__clear" data-action="clear">条件をクリア</button>` : ''}
  </fieldset>`;
}

/** 並べ替え：列見出しの代わりに、項目のボタンを並べる。選んでいる項目をもう一度押すと昇順／降順が入れ替わる。 */
function sortBar(model) {
  return html`<div class="hp-sort" role="group" aria-label="並べ替え">
    <span class="hp-sort__label" aria-hidden="true">並べ替え</span>
    ${model.columns.map((c) => {
      const dir = c.sorted === 'asc' ? '昇順' : c.sorted === 'desc' ? '降順' : '';
      return html`<button type="button" class="hp-sort__btn" data-action="sort" data-key="${c.key}" aria-pressed="${c.sorted ? 'true' : 'false'}" ${attr('data-sorted', c.sorted ? c.ariaSort : null)}>
        ${c.label}${c.sorted ? html`<span aria-hidden="true">${c.sorted === 'asc' ? ' ↑' : ' ↓'}</span><span class="visually-hidden">（${dir}。押すと${c.sorted === 'asc' ? '降順' : '昇順'}）</span>` : ''}
      </button>`;
    })}
  </div>`;
}

function name(applicant) {
  const m = applicant.match(CORP);
  const main = m ? applicant.slice(m[1].length) : applicant;
  const size = main.replace(/\s/g, '').length > 6 ? 'is-long' : '';
  return html`<span class="hp-name ${size}">${m ? html`<small>${m[1]}</small>` : ''}${main}</span>`;
}

function panel(r, open) {
  return html`<li class="hp-panel ${open ? 'is-open' : ''}">
    <p class="hp-panel__id"><small>受付番号</small>${r.id}</p>
    <div class="hp-panel__tate">${name(r.applicant)}<span class="hp-type">${r.type}</span></div>
    <p class="hp-panel__st">${statusText(r.status)}</p>
    <p class="hp-panel__date"><small>受付日</small>${date(r.receivedAt)}</p>
    <button type="button" class="hp-panel__btn" data-action="${open ? 'close-detail' : 'open-detail'}" data-id="${r.id}" aria-expanded="${open ? 'true' : 'false'}">
      ${open ? '詳細を閉じる' : '詳細を開く'}<span class="visually-hidden">（${r.id} ${r.applicant}）</span><span aria-hidden="true">${open ? '−' : '＋'}</span>
    </button>
  </li>`;
}

function detail(d, ctx, { detached = false } = {}) {
  return html`<section class="hp-detail" aria-labelledby="${ctx.uid}-hp-detail">
    <h3 class="hp-detail__title" id="${ctx.uid}-hp-detail" tabindex="-1" data-focus="detail">申請詳細<span class="visually-hidden">（${d.id}）</span></h3>
    <div class="hp-detail__who">
      <p><small>受付番号</small><b class="hp-mono">${d.id}</b></p>
      <p><small>申請者</small><b class="hp-detail__name">${d.applicant}</b><span>${d.kana}</span></p>
    </div>
    <div class="hp-detail__what">
      ${detached ? html`<p class="hp-detail__note">現在の検索条件では一覧に表示されていない申請です。</p>` : ''}
      <p><small>申請種別</small><b class="hp-detail__type">${d.type}</b></p>
      <dl>
        <div><dt>処理状態</dt><dd>${statusText(d.status)}</dd></div>
        <div><dt>担当課</dt><dd>${d.department}</dd></div>
        <div><dt>受付方法</dt><dd>${d.channel}</dd></div>
        <div><dt>受付日</dt><dd>${date(d.receivedAt)}</dd></div>
        <div><dt>処理期限</dt><dd>${date(d.dueAt)}</dd></div>
        <div class="is-wide"><dt>備考</dt><dd>${d.note || 'なし'}</dd></div>
      </dl>
      <button type="button" class="hp-link hp-detail__close" data-action="close-detail">詳細を閉じる<span class="visually-hidden">（${d.id}）</span></button>
    </div>
  </section>`;
}

function pager({ page, pages }, total) {
  if (pages <= 1) return '';
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, from + PAGE_SIZE - 1);
  const go = (to, label, disabled) =>
    html`<button type="button" class="hp-pager__btn" data-action="set-ui" data-key="page" data-value="${to}" data-then-focus="page-top" data-announce="${to + 1}見開き目を表示しています" ${disabled ? 'disabled' : ''}>${label}</button>`;
  // 右から左へ読む並びなので、「次の8件」を左、「前の8件」を右に置く
  return html`<nav class="hp-pager" aria-label="見開きの切り替え">
    ${go(page + 1, '← 次の8件', page + 1 >= pages)}
    <span class="hp-pager__now">${from}〜${to}件目 ／ ${page + 1}・${pages}見開き</span>
    ${go(page - 1, '前の8件 →', page === 0)}
  </nav>`;
}

function listPage(model, ctx) {
  const { page, pages } = currentPage(model, ctx);
  const detailIndex = model.detail ? model.rows.findIndex((r) => r.id === model.detail.id) : -1;
  const detached = model.detail && detailIndex < 0;
  const onPage = detailIndex >= 0 && Math.floor(detailIndex / PAGE_SIZE) === page;
  const sel = model.statusOptions.find((o) => o.selected && o.value);
  const groups = Array.from({ length: pages }, (_, i) => model.rows.slice(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE));
  return html`<div class="hp-tools-row">${search(model, ctx)}<button type="button" class="hp-btn hp-btn--ghost hp-new" data-action="new">＋ 新規申請</button></div>
    ${statusFilter(model, ctx)}
    ${model.scope.active
      ? html`<div class="hp-scope" data-scope>
          <p class="hp-scope__title">ダッシュボードから引き継いだ条件</p>
          <ul>${model.scope.items.map((i) => html`<li>${i.label}：<strong>${i.text}</strong></li>`)}</ul>
          <button type="button" class="hp-link" data-action="clear-scope">引き継ぎを解除</button>
        </div>`
      : ''}
    <div class="hp-count">
      <p><b>${sel ? sel.label : model.keyword ? '検索結果' : 'すべて'}</b><span class="hp-count__n">${countText(model)}</span>${model.keyword ? html`<span class="hp-count__kw">「${model.keyword}」</span>` : ''}</p>
      ${sortBar(model)}
    </div>
    ${detached ? detail(model.detail, ctx, { detached: true }) : ''}
    ${model.rows.length
      ? html`<p class="hp-dir" aria-hidden="true"><span class="hp-dir--one">右から左へ読みます ←</span><span class="hp-dir--two">右から左・上の段から ←</span><span class="hp-dir--narrow">上から下へ ↓</span></p>
          ${groups.map(
            (rows, i) => html`<ol class="hp-panels" ${i === page ? '' : 'hidden'} ${attr('data-focus', i === page && 'page-top')} ${attr('tabindex', i === page && '-1')} aria-label="申請（右から左へ、${i * PAGE_SIZE + 1}件目から）">
              ${rows.map((r) => panel(r, model.detail?.id === r.id))}
            </ol>`,
          )}
          ${onPage ? detail(model.detail, ctx) : ''}${pager({ page, pages }, model.rows.length)}`
      : html`<p class="hp-empty">条件に一致する申請はありません。キーワードを変えるか、「条件をクリア」を選んでください。</p>`}`;
}

/* ---------- 登録 ---------- */

export default {
  id: 'h-prime',
  name: '折本（独自デザイン・H′案）',
  shortName: '折本',
  url: 'https://github.com/YanTKYS/design-lab/blob/main/docs/h-prime/README.md',
  urlLabel: '設計と着想',
  summary:
    'このサイト独自の案（名称は仮称、H′案）。折本（蛇腹に折った本）に着想し、申請を縦組みの「面」として右から左へ並べ、フォームは見開きの右頁から左頁へ読む。生成りの地に葡萄色、明朝の表題。公式のデザインシステムではない。',
  traits: {
    density: '1件を縦組みの面にして8面ずつ見開きで見せる。表の行より1件あたりの面積は大きく、件数よりも1件ずつの見分けを優先する。',
    navigation: '生成りの帯にグローバルメニュー。現在地は葡萄色の下線。8面を超える分は「← 次の8件」「前の8件 →」の見開き送り（右から左へ読む向きに合わせ、次は左）。',
    table: '表は使わず、面の上から受付番号→縦組みの申請者名と種別→処理状態→受付日→詳細の順。面は右端が先頭で左へ続く（DOM・Tab の順と同じ）。狭い枠では横組みの帯を上から積む。',
    input: '検索欄と葡萄色の検索ボタン。処理状態は件数付きの選択肢で、選んだものを葡萄色の地と✓で示す。並べ替えは項目のボタンで、同じ項目をもう一度押すと昇順／降順が入れ替わる。',
    actions: '主操作は葡萄色の塗り、副操作は葡萄色の枠、条件のクリアは下線の文字。選んだ面は葡萄色になり、その色が下段の詳細へ続く。',
    hierarchy: '明朝の大きな表題→検索と処理状態→件数と並べ替え→面の順。面の上辺は交互に傾き、折り目のように連なる。',
  },
  formTraits: {
    layout: '見開きの右頁に「申請者情報」、左頁に「手続きの内容」。右頁から左頁へ読み、DOM・Tab の順も同じ。章名は頁の右端に縦組み。狭い枠では右頁を先に縦へ積む。',
    label: '明朝の項目名の横に、枠囲みの小さな「必須」（葡萄色）／「任意」（灰色）。補足は入力欄の下。',
    errors: '本の上にエラーの一覧（件数と項目名のボタン）を置き、そこへフォーカス。各欄は左の赤い縦線・太い枠・「エラー：理由」で示す。',
    confirm: '同じ見開きのまま値を並べ、各項目の「修正」から元の欄へ戻る。確認事項は葡萄色の帯。主操作は葡萄色の塗り。',
  },
  dashboardTraits: {
    kpi: '受付件数を右端の起点（葡萄色）に、処理待ち→処理完了→処理完了率と左へ読む。指標名は縦組み。各指標から同じ条件の一覧へ移れる。',
    density: '指標は大きな明朝の数字の4面。集計の区画は罫と縦組みの章題で区切り、表は行間を詰めない。',
    chart: '月別は左から右への時系列の縦棒で、件数を棒の真上に書く。状態・種別は件数・割合と、割合と同じ尺度（受付総数に対する構成比）の細い棒。',
    filter: '表題の右に対象期間・担当課のセレクトとリセット。基準日と集計の範囲は表題の下に文字で示す。',
    hierarchy: '表題→指標（右から左）→月別・処理状況→申請種別。指標は右から左、月は左から右と向きが変わることを小さな注記で示す。',
  },
  errorFocus: 'summary',
  render(model, ctx) {
    const title = model.screen === 'form' ? FORM_TITLES[model.form.step] : TITLES[model.screen] ?? TITLES.list;
    return html`<div class="ds-h-prime">
      ${topbar(model, ctx)}
      <div class="hp-main">
        <div class="hp-head">
          <h2 class="hp-title" tabindex="-1" data-focus="heading">${title}</h2>
          ${model.screen === 'form' ? formSteps(model.form) : ''}
        </div>
        ${model.notice
          ? html`<div class="hp-notice" role="status">
              <p><strong>${model.notice.title}</strong>　${model.notice.text}</p>
              <button type="button" class="hp-link" data-action="dismiss-notice">閉じる<span class="visually-hidden">（通知）</span></button>
            </div>`
          : ''}
        ${model.screen === 'form' ? formPage(model, ctx) : model.screen === 'dashboard' ? dashboardPage(model, ctx) : listPage(model, ctx)}
      </div>
    </div>`;
  },
};

function formSteps(form) {
  return html`<ol class="hp-steps" aria-label="申請の手順（ステップ ${form.stepIndex + 1} / ${form.steps.length}）">
    ${form.steps.map(
      (s) => html`<li class="${s.current ? 'is-current' : ''}" ${attr('aria-current', s.current && 'step')}><span class="hp-steps__n">${s.number}</span>${s.label}${s.current ? html`<small>現在</small>` : s.done ? html`<small>済</small>` : ''}</li>`,
    )}
  </ol>`;
}
