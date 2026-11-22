// K「汀線」（仮称）申請一覧の独立試作。視覚の基準は docs/design-exploration-4/images/k-list-1280.png。
// 淡い緑の面と曲線。選んだ行の淡い緑が右の詳細の面へ続き、詳細の左端は汀線の曲線で受ける。375px では詳細を行の直後に置く。
// 検索・絞り込み・並べ替えは共通の query.js（shared/list-poc.js 経由）。全71件を表で表示する。

import { html } from '../../assets/js/html.js';
import { formatDate } from '../../assets/js/query.js';
import { STATUS_MARK, sortBar, startListPoc } from '../shared/list-poc.js';

const slash = (iso) => formatDate(iso, 'slash');

const sortHead = (c) => html`<th scope="col" aria-sort="${c.ariaSort}">
  <button type="button" class="kl-sort" data-action="sort" data-key="${c.key}">${c.label}<span aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : ''}</span></button>
</th>`;

const shore = html`<svg class="kl-shore" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path class="kl-shore__sea" d="M40 0H18C8 30 6 64 14 100H40Z" /><path d="M15 0C5 30 3 64 11 100" /><path d="M10 0C1 30 -1 64 6 100" />
</svg>`;

function detail(d) {
  return html`<section class="kl-detail" data-detail aria-labelledby="poc-detail-title">
    ${shore}
    <div class="kl-detail__in">
      <div class="kl-detail__head"><h2 id="poc-detail-title" tabindex="-1">申請詳細</h2><span class="kl-badge"><span aria-hidden="true">${STATUS_MARK[d.status.value]} </span>${d.status.label}</span></div>
      <p class="kl-detail__id">${d.id}</p>
      <p class="kl-detail__name">${d.applicant}</p>
      <p class="kl-detail__kana">${d.kana}</p>
      <dl>
        <div><dt>申請種別</dt><dd>${d.type}</dd></div>
        <div><dt>担当課</dt><dd>${d.department}</dd></div>
        <div><dt>受付方法</dt><dd>${d.channel}</dd></div>
        <div><dt>受付日</dt><dd>${slash(d.receivedAt)}</dd></div>
        <div><dt>処理期限</dt><dd>${slash(d.dueAt)}</dd></div>
        <div><dt>備考</dt><dd>${d.note || 'なし'}</dd></div>
      </dl>
      <button type="button" class="kl-link" data-action="close-detail">詳細を閉じる<span class="kl-vh">（${d.id}）</span> ×</button>
    </div>
  </section>`;
}

function row(r, open, narrow) {
  return html`<tr class="${open ? 'is-open' : ''}">
      <td class="kl-id" data-label="受付番号">${r.id}</td>
      <td class="kl-name" data-label="申請者">${r.applicant}</td>
      <td data-label="申請種別">${r.type}</td>
      <td class="kl-date" data-label="受付日">${slash(r.receivedAt)}</td>
      <td data-label="処理状態"><span class="kl-st"><span aria-hidden="true">${STATUS_MARK[r.status.value]}</span>${r.status.label}</span></td>
      <td class="kl-act"><button type="button" class="kl-link" data-action="toggle-detail" data-id="${r.id}" aria-expanded="${String(Boolean(open))}">${open ? (narrow ? '閉じる' : '表示中') : '詳細'}<span class="kl-vh">（${r.id}）</span><span aria-hidden="true">${open ? (narrow ? ' ×' : ' →') : ' ›'}</span></button></td>
    </tr>${open && narrow ? html`<tr class="kl-detail-row"><td colspan="6">${detail(r)}</td></tr>` : ''}`;
}

function view(m, ui) {
  const sel = m.statusOptions.find((o) => o.selected);
  const narrow = ui.layout === 'narrow';
  return html`
    <div class="kl-hero">
      <div class="kl-hero__text"><h1 class="kl-title">申請一覧</h1>
        <p class="kl-hero__count" role="status"><b>${m.status ? sel.label : m.keyword ? '検索結果' : 'すべて'}</b><span>${m.shown}</span>件 ／ 全${m.total}件</p></div>
      <img class="kl-hero__art" src="k-shore.svg" alt="" width="560" height="154" />
    </div>
    <div class="kl-body">
      <div class="kl-tools">
        <form class="kl-search" data-form="search" role="search"><label for="poc-kw">キーワード</label>
          <div><input id="poc-kw" type="search" value="${m.keyword}" placeholder="受付番号・申請者名・申請種別など" autocomplete="off" /><button type="submit">検索</button></div></form>
        <div class="kl-status" role="group" aria-labelledby="kl-st-label"><p id="kl-st-label">処理状態</p>
          <div>${m.statusOptions.map((o) => html`<button type="button" data-action="status" data-status="${o.value}" aria-pressed="${String(o.selected)}">${o.selected ? '✓ ' : ''}${o.label}<span>${o.count}</span></button>`)}</div></div>
      </div>
      <div class="kl-work ${m.detail && !narrow ? 'has-detail' : ''}">
        <div class="kl-results">
          <div class="kl-results__head"><h2>検索結果</h2><p>${m.shown}件${m.keyword ? html`（「${m.keyword}」）` : ''}</p>
            ${m.keyword || m.status ? html`<button type="button" class="kl-link" data-action="clear">条件をクリア</button>` : ''}</div>
          ${m.rows.length && narrow ? sortBar(m, 'kl') : ''}
          ${m.rows.length
            ? html`<table class="kl-table"><caption class="kl-vh">申請一覧（${m.shown}件）</caption>
                ${narrow ? '' : html`<thead><tr>${m.columns.map(sortHead)}<th scope="col">操作</th></tr></thead>`}
                <tbody>${m.rows.map((r) => row(r, m.detail && r.id === m.detail.id, narrow))}</tbody></table>`
            : html`<p class="kl-empty">条件に合う申請はありません。キーワードを変えるか、「条件をクリア」を選んでください。</p>`}
        </div>
        ${m.detail && !narrow ? detail(m.detail) : ''}
      </div>
    </div>`;
}

startListPoc({ app: document.getElementById('poc-app'), live: document.getElementById('poc-live'), view, title: '申請一覧（汀線 試作）— Design Lab' });
