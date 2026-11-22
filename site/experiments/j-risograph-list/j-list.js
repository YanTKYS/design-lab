// J「二色刷り」（仮称）申請一覧の独立試作。視覚の基準は docs/design-exploration-3/images/j-list-1280.png。
// 青と蛍光ピンクの2色。ピンク（版ずれ・網点）は飾りと選択の地に使い、状態は記号と文字、選択は青の帯と文言でも示す。
// 検索・絞り込み・並べ替えは共通の query.js（shared/list-poc.js 経由）。全71件を表で表示する。

import { html } from '../../assets/js/html.js';
import { formatDate } from '../../assets/js/query.js';
import { STATUS_MARK, detailItems, sortBar, startListPoc } from '../shared/list-poc.js';

const slash = (iso) => formatDate(iso, 'slash');

const sortHead = (c) => html`<th scope="col" aria-sort="${c.ariaSort}">
  <button type="button" class="jl-sort" data-action="sort" data-key="${c.key}">${c.label}<span aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : '↕'}</span></button>
</th>`;

function detail(d) {
  const items = detailItems(d, slash).filter(([k]) => k !== '受付番号');
  return html`<section class="jl-detail" data-detail aria-labelledby="poc-detail-title">
    <div class="jl-detail__id"><h2 id="poc-detail-title" tabindex="-1">申請詳細</h2><p>${d.id}</p>
      <button type="button" class="jl-link" data-action="close-detail">詳細を閉じる<span class="jl-vh">（${d.id}）</span></button></div>
    <dl class="jl-dl">${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${k === '処理状態' ? html`<span aria-hidden="true">${STATUS_MARK[d.status.value]} </span>${v}` : v}</dd></div>`)}</dl>
  </section>`;
}

function row(r, open) {
  return html`<tr class="${open ? 'is-open' : ''}">
      <td class="jl-id" data-label="受付番号">${r.id}${open ? html`<span class="jl-open-tag">表示中</span>` : ''}</td>
      <td class="jl-name" data-label="申請者">${r.applicant}</td>
      <td data-label="申請種別">${r.type}</td>
      <td class="jl-date" data-label="受付日">${slash(r.receivedAt)}</td>
      <td data-label="処理状態"><span class="jl-st"><span aria-hidden="true">${STATUS_MARK[r.status.value]}</span>${r.status.label}</span></td>
      <td class="jl-act"><button type="button" data-action="toggle-detail" data-id="${r.id}" aria-expanded="${String(Boolean(open))}">${open ? '閉じる' : '詳細'}<span class="jl-vh">（${r.id}）</span></button></td>
    </tr>${open ? html`<tr class="jl-detail-row"><td colspan="6">${detail(r)}</td></tr>` : ''}`;
}

function view(m, ui) {
  const narrow = ui.layout === 'narrow';
  const sel = m.statusOptions.find((o) => o.selected);
  const filtered = m.keyword || m.status;
  return html`
    <div class="jl-hero">
      <h1 data-text="申請一覧">申請一覧</h1>
      <p class="jl-hero__count" role="status"><b>${m.shown}</b>件 <span>／ 全${m.total}件</span></p>
      <span class="jl-hero__dots" aria-hidden="true"></span><span class="jl-hero__sun" aria-hidden="true"></span>
    </div>
    <div class="jl-tools">
      <form class="jl-search" data-form="search" role="search"><label for="poc-kw">キーワード</label><input id="poc-kw" type="search" value="${m.keyword}" placeholder="受付番号・申請者名・申請種別など" autocomplete="off" /><button type="submit">検索</button></form>
      <div class="jl-status" role="group" aria-label="処理状態">${m.statusOptions.map((o) => html`<button type="button" data-action="status" data-status="${o.value}" aria-pressed="${String(o.selected)}">${o.selected ? '✓ ' : ''}${o.label}<span>${o.count}</span></button>`)}</div>
      <p class="jl-cond">${filtered
        ? html`<span class="jl-cond__tag">絞り込み中</span>${m.status ? html`処理状態「${sel.label}」` : ''}${m.keyword ? html`${m.status ? '・' : ''}キーワード「${m.keyword}」` : ''}　<button type="button" class="jl-link" data-action="clear">条件をクリア</button>`
        : 'すべての申請を表示しています'}</p>
    </div>
    ${m.rows.length && narrow ? sortBar(m, 'jl') : ''}
    ${m.rows.length
      ? html`<table class="jl-table"><caption class="jl-vh">申請一覧（${m.shown}件）</caption>
          ${narrow ? '' : html`<thead><tr>${m.columns.map(sortHead)}<th scope="col"><span class="jl-vh">操作</span></th></tr></thead>`}
          <tbody>${m.rows.map((r) => row(r, m.detail && r.id === m.detail.id))}</tbody></table>`
      : html`<p class="jl-empty">条件に合う申請はありません。キーワードを変えるか、「条件をクリア」を選んでください。</p>`}`;
}

startListPoc({ app: document.getElementById('poc-app'), live: document.getElementById('poc-live'), view, title: '申請一覧（二色刷り 試作）— Design Lab' });
