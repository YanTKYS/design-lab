// L「標示盤」（仮称）申請一覧の独立試作。視覚の基準は docs/design-exploration-4/images/l-list-1280.png。
// 処理状態の件数を盤面のドット文字で並べ、選んだ状態・選んだ行・詳細を同じ琥珀で結ぶ。
// 検索・絞り込み・並べ替えは共通の query.js（shared/list-poc.js 経由）。全71件を表で表示する。

import { html, raw } from '../../assets/js/html.js';
import { formatDate } from '../../assets/js/query.js';
import { STATUS_MARK, sortBar, startListPoc } from '../shared/list-poc.js';

const slash = (iso) => formatDate(iso, 'slash');

/* ドット文字（5×7）：件数だけに使う */
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
};
function dots(n) {
  const digits = String(n).padStart(2, '0').split('');
  const circles = digits.flatMap((d, i) => GLYPHS[d].flatMap((row, y) => [...row].map((on, x) => `<circle cx="${i * 6 + x + 0.5}" cy="${y + 0.5}" r="0.38" class="${on === '1' ? 'on' : 'off'}"/>`)));
  return html`<svg class="ll-dots" viewBox="0 0 11 7" aria-hidden="true" focusable="false">${raw(circles.join(''))}</svg>`;
}

const sortHead = (c) => html`<th scope="col" aria-sort="${c.ariaSort}">
  <button type="button" class="ll-sort" data-action="sort" data-key="${c.key}">${c.label}<span aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : ''}</span></button>
</th>`;

function detail(d) {
  const items = [
    ['申請者', d.applicant], ['ふりがな', d.kana], ['申請種別', d.type], ['担当課', d.department],
    ['受付日', slash(d.receivedAt)], ['受付方法', d.channel], ['処理期限', slash(d.dueAt)], ['備考', d.note || 'なし'],
  ];
  return html`<section class="ll-detail" data-detail aria-labelledby="poc-detail-title">
    <div class="ll-detail__id"><h2 id="poc-detail-title" tabindex="-1">申請詳細</h2><p>${d.id}</p>
      <button type="button" class="ll-link" data-action="close-detail">詳細を閉じる<span class="ll-vh">（${d.id}）</span> ×</button></div>
    <dl>${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
  </section>`;
}

function row(r, open) {
  return html`<tr class="${open ? 'is-open' : ''}">
      <td class="ll-id" data-label="受付番号">${r.id}</td>
      <td class="ll-name" data-label="申請者">${r.applicant}</td>
      <td data-label="申請種別">${r.type}</td>
      <td class="ll-date" data-label="受付日">${slash(r.receivedAt)}</td>
      <td data-label="処理状態"><span class="ll-st"><span aria-hidden="true">${STATUS_MARK[r.status.value]}</span>${r.status.label}</span></td>
      <td class="ll-act"><button type="button" data-action="toggle-detail" data-id="${r.id}" aria-expanded="${String(Boolean(open))}">${open ? '閉じる' : '詳細'}<span class="ll-vh">（${r.id}）</span><span aria-hidden="true">${open ? ' −' : ' ＋'}</span></button></td>
    </tr>${open ? html`<tr class="ll-detail-row"><td colspan="6">${detail(r)}</td></tr>` : ''}`;
}

function view(m, ui) {
  const narrow = ui.layout === 'narrow';
  const sel = m.statusOptions.find((o) => o.selected);
  return html`
    <div class="ll-head">
      <h1 class="ll-title">申請一覧</h1>
      <form class="ll-search" data-form="search" role="search"><label for="poc-kw">キーワード</label><input id="poc-kw" type="search" value="${m.keyword}" placeholder="受付番号・申請者名・申請種別など" autocomplete="off" /><button type="submit">検索</button></form>
    </div>
    <div class="ll-board" role="group" aria-labelledby="ll-board-label">
      <p class="ll-board__label" id="ll-board-label">処理状態</p>
      ${m.statusOptions.map(
        (o) => html`<button type="button" class="ll-cell" data-action="status" data-status="${o.value}" aria-pressed="${String(o.selected)}">
          <span class="ll-cell__label">${o.selected ? html`<span class="ll-cell__check" aria-hidden="true">✓</span>` : ''}${o.label}</span>${dots(o.count)}<span class="ll-vh">${o.count}件</span>
        </button>`,
      )}
    </div>
    <div class="ll-count">
      <p role="status"><b>${m.status ? sel.label : m.keyword ? '検索結果' : 'すべて'}</b>全${m.total}件中 <span class="ll-count__n">${m.shown}件</span>${m.keyword ? html`<span class="ll-count__kw">「${m.keyword}」</span>` : ''}</p>
      ${m.keyword || m.status ? html`<button type="button" class="ll-link" data-action="clear">条件をクリア</button>` : ''}
    </div>
    ${m.rows.length && narrow ? sortBar(m, 'll') : ''}
    ${m.rows.length
      ? html`<table class="ll-table"><caption class="ll-vh">申請一覧（${m.shown}件）</caption>
          ${narrow ? '' : html`<thead><tr>${m.columns.map(sortHead)}<th scope="col">操作</th></tr></thead>`}
          <tbody>${m.rows.map((r) => row(r, m.detail && r.id === m.detail.id))}</tbody></table>`
      : html`<p class="ll-empty">条件に合う申請はありません。キーワードを変えるか、「条件をクリア」を選んでください。</p>`}`;
}

startListPoc({ app: document.getElementById('ls-app'), live: document.getElementById('ls-live'), view, title: '申請一覧（標示盤 試作）— Design Lab' });
