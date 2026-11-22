// H′「折本」（仮称）申請一覧の独立試作。視覚の基準は docs/h-prime/images/h-prime-list-1280.png。
// 申請を縦組みの面にして、右から左へ8面ずつ並べる（DOM＝Tab 順は並び順どおりで、見た目では右端が先頭）。
// 8面を超える分はページ送りで全件へ到達できる。検索・絞り込み・並べ替えは共通の query.js（shared/list-poc.js 経由）。

import { html } from '../../assets/js/html.js';
import { formatDate } from '../../assets/js/query.js';
import { STATUS_MARK, startListPoc } from '../shared/list-poc.js';

const PAGE = 8;
const slash = (iso) => formatDate(iso, 'slash');
const CORP = /^(株式会社|有限会社|合同会社)/;

/** 申請者名を縦組みにする。法人格は小さく添え、長い名前は字を小さくする。 */
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
    <p class="hp-panel__st"><span aria-hidden="true">${STATUS_MARK[r.status.value]}</span>${r.status.label}</p>
    <p class="hp-panel__date"><small>受付日</small>${slash(r.receivedAt)}</p>
    <button type="button" class="hp-panel__btn" data-action="toggle-detail" data-id="${r.id}" aria-expanded="${String(Boolean(open))}" aria-controls="hp-detail">
      ${open ? '詳細を閉じる' : '詳細を開く'}<span class="hp-vh">（${r.id} ${r.applicant}）</span><span aria-hidden="true">${open ? '−' : '＋'}</span>
    </button>
  </li>`;
}

function detail(d) {
  return html`<section class="hp-detail" id="hp-detail" data-detail aria-labelledby="poc-detail-title">
    <h2 class="hp-detail__title" id="poc-detail-title" tabindex="-1">申請詳細<span class="hp-vh">（${d.id}）</span></h2>
    <div class="hp-detail__who">
      <p><small>受付番号</small><b class="hp-mono">${d.id}</b></p>
      <p><small>申請者</small><b class="hp-detail__name">${d.applicant}</b><span>${d.kana}</span></p>
    </div>
    <div class="hp-detail__what">
      <p><small>申請種別</small><b class="hp-detail__type">${d.type}</b></p>
      <dl>
        <div><dt>処理状態</dt><dd><span aria-hidden="true">${STATUS_MARK[d.status.value]}</span> ${d.status.label}</dd></div>
        <div><dt>担当課</dt><dd>${d.department}</dd></div>
        <div><dt>受付方法</dt><dd>${d.channel}</dd></div>
        <div><dt>受付日</dt><dd>${slash(d.receivedAt)}</dd></div>
        <div><dt>処理期限</dt><dd>${slash(d.dueAt)}</dd></div>
        <div class="is-wide"><dt>備考</dt><dd>${d.note || 'なし'}</dd></div>
      </dl>
      <button type="button" class="hp-link hp-detail__close" data-action="close-detail">詳細を閉じる<span class="hp-vh">（${d.id}）</span></button>
    </div>
  </section>`;
}

function pager(ui, total) {
  if (ui.pages <= 1) return '';
  const from = ui.page * PAGE + 1;
  const to = Math.min(total, from + PAGE - 1);
  // 右から左へ読む並びなので、「次（後ろ）の8件」を左、「前の8件」を右に置く
  return html`<nav class="hp-pager" aria-label="ページ送り">
    <button type="button" class="hp-pager__btn" data-action="page" data-page="${ui.page + 1}" ${ui.page + 1 >= ui.pages ? 'disabled' : ''}>← 次の8件</button>
    <span class="hp-pager__now" aria-live="off">${from}〜${to}件目 ／ ${ui.page + 1}・${ui.pages}面</span>
    <button type="button" class="hp-pager__btn" data-action="page" data-page="${ui.page - 1}" ${ui.page === 0 ? 'disabled' : ''}>前の8件 →</button>
  </nav>`;
}

function view(m, ui) {
  const sel = m.statusOptions.find((o) => o.selected);
  const shown = m.rows.slice(ui.page * PAGE, ui.page * PAGE + PAGE);
  const open = m.detail && shown.some((r) => r.id === m.detail.id);
  const sortCol = m.columns.find((c) => c.sorted);
  const narrow = ui.layout === 'narrow';
  return html`
    <div class="hp-head">
      <h1 class="hp-title">申請一覧</h1>
      <form class="hp-search" data-form="search" role="search">
        <label for="poc-kw">キーワード検索</label>
        <div><input id="poc-kw" type="search" value="${m.keyword}" placeholder="受付番号・申請者名・ふりがな・申請種別・担当課" autocomplete="off" /><button type="submit">検索</button></div>
      </form>
    </div>
    <div class="hp-status" role="group" aria-labelledby="hp-st-label">
      <span class="hp-status__label" id="hp-st-label">処理状態</span>
      ${m.statusOptions.map((o) => html`<button type="button" data-action="status" data-status="${o.value}" aria-pressed="${String(o.selected)}">${o.selected ? '✓' : ''}${o.label}<span class="hp-n">${o.count}</span></button>`)}
      <button type="button" class="hp-link hp-status__clear" data-action="clear">条件をクリア</button>
    </div>
    <div class="hp-count">
      <p role="status"><b>${m.status ? sel.label : m.keyword ? '検索結果' : 'すべて'}</b><span class="hp-count__n">${m.shown}</span>件 ／ 全${m.total}件${m.keyword ? html`<span class="hp-count__kw">「${m.keyword}」</span>` : ''}</p>
      <div class="hp-sort">
        <label for="hp-sort-key">並べ替え</label>
        <select id="hp-sort-key" data-bind="sort-key">${m.columns.map((c) => html`<option value="${c.key}" ${c.sorted ? 'selected' : ''}>${c.label}</option>`)}</select>
        <button type="button" class="hp-sort__dir" data-action="sort-dir" aria-label="並べ替えの向きを切り替える（現在：${sortCol.sorted === 'desc' ? '降順' : '昇順'}）">${sortCol.sorted === 'desc' ? '降順 ↓' : '昇順 ↑'}</button>
        <span class="hp-sort__note">${narrow ? '上から下へ' : html`<span class="hp-note--one">右から左へ</span><span class="hp-note--two">右から左・上の段から</span>`}</span>
      </div>
    </div>
    ${m.rows.length
      ? html`<ol class="hp-panels" id="hp-panels" data-page-top tabindex="-1" aria-label="申請（${narrow ? '上から下へ' : '右から左へ'}、${ui.page * PAGE + 1}件目から）">${shown.map((r) => {
          const isOpen = m.detail && r.id === m.detail.id;
          // 狭い幅では、詳細を選んだ帯の直後に置く
          return html`${panel(r, isOpen)}${isOpen && narrow ? html`<li class="hp-detail-li">${detail(m.detail)}</li>` : ''}`;
        })}</ol>
        ${open && !narrow ? detail(m.detail) : ''}${pager(ui, m.rows.length)}`
      : html`<p class="hp-empty">条件に合う申請はありません。キーワードを変えるか、「条件をクリア」を選んでください。</p>`}`;
}

startListPoc({ app: document.getElementById('poc-app'), live: document.getElementById('poc-live'), view, title: '申請一覧（折本 試作）— Design Lab', pageSize: PAGE });
