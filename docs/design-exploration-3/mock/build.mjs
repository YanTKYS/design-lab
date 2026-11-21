// 視覚デザイン探索（第3回）の申請一覧モックを、共通モデルの値で静的 HTML に書き出す。
// 実行：node docs/design-exploration-3/mock/build.mjs → h-list.html / i-list.html / j-list.html
// 比較条件は前回までと同じ：処理状態「審査中」で絞り込み、2026-01041 の詳細を開いた状態。

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_SORT, NAV_ITEMS, SYSTEM } from '../../../site/assets/js/data.js';
import { buildModel, countText, formatDate } from '../../../site/assets/js/query.js';

const OUT = dirname(fileURLToPath(import.meta.url));
const m = buildModel({ keyword: '', status: 'reviewing', sort: DEFAULT_SORT, detail: '2026-01041', screen: 'list' });
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const each = (a, f) => a.map(f).join('');
const slash = (iso) => formatDate(iso, 'slash');
const sel = m.statusOptions.find((o) => o.selected);
const d = m.detail;
const DETAIL = [
  ['申請者', d.applicant], ['ふりがな', d.kana], ['申請種別', d.type], ['担当課', d.department],
  ['受付日', formatDate(d.receivedAt)], ['受付方法', d.channel], ['処理期限', formatDate(d.dueAt)], ['備考', d.note || 'なし'],
];
const MARK = { received: '○', reviewing: '◐', returned: '△', approved: '●', rejected: '×' };
const nav = (cls) => `<nav class="${cls}-nav" aria-label="メインメニュー"><ul>${each(NAV_ITEMS, (n) => `<li><a href="#"${n.id === 'applications' ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`)}</ul></nav>`;
const sortHead = (c) => `<th scope="col" aria-sort="${c.ariaSort}"><button type="button">${esc(c.label)}<span aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : ''}</span></button></th>`;
const dl = (cls) => `<dl class="${cls}">${each(DETAIL, ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)}</dl>`;
const page = (cls, title, body) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}（静的モック）</title><link rel="stylesheet" href="${cls}.css"></head>
<body class="${cls}">${body}</body></html>
`;
const rows = (cls, cells, detailHtml) =>
  each(m.rows, (r) => {
    const open = r.id === d.id;
    return `<tr${open ? ' class="is-open"' : ''}>${cells(r, open)}</tr>${open ? `<tr class="${cls}-detail-row"><td colspan="6">${detailHtml}</td></tr>` : ''}`;
  });

/* ---------- 案H　縦組みの台帳 ---------- */
function h() {
  return page('h', '申請一覧｜案H 縦組みの台帳', `
<header class="h-head">
  <p class="h-head__sys"><b>${esc(SYSTEM.org)}</b>${esc(SYSTEM.name)}</p>
  ${nav('h')}
  <p class="h-head__user">${esc(SYSTEM.user)}</p>
</header>
<div class="h-page">
  <aside class="h-spine" aria-hidden="true"><span class="h-spine__seal"></span><span class="h-spine__title">申請一覧</span><span class="h-spine__sub">受付日の新しい順</span></aside>
  <main class="h-main">
    <h1 class="h-vh">申請一覧</h1>
    <form class="h-search" role="search" onsubmit="return false">
      <label for="kw">キーワード</label>
      <input id="kw" type="search" placeholder="受付番号・申請者名・ふりがな・申請種別・担当課">
      <button type="submit">検索</button>
    </form>
    <div class="h-status" role="group" aria-label="処理状態">
      <span class="h-label">処理状態</span>
      ${each(m.statusOptions, (o) => `<button type="button" aria-pressed="${o.selected}">${esc(o.label)}<span class="h-n">${o.count}</span></button>`)}
    </div>
    <div class="h-count" role="status">
      <p class="h-count__n"><b>${m.shown}</b><span>件</span></p>
      <p class="h-count__of">全${m.total}件のうち<br>処理状態「${esc(sel.label)}」</p>
      <button type="button" class="h-link">条件をクリア</button>
    </div>
    <table class="h-table">
      <caption class="h-vh">申請一覧（${esc(countText(m))}）</caption>
      <thead><tr>${each(m.columns, sortHead)}<th scope="col"><span class="h-vh">操作</span></th></tr></thead>
      <tbody>${rows('h', (r, open) => `
        <td class="h-id">${esc(r.id)}</td><td class="h-name">${esc(r.applicant)}</td><td>${esc(r.type)}</td>
        <td class="h-date">${esc(slash(r.receivedAt))}</td><td class="h-st"><span aria-hidden="true">${MARK[r.status.value]}</span>${esc(r.status.label)}</td>
        <td class="h-act"><button type="button" class="h-link" aria-expanded="${open}">${open ? '閉じる' : '詳細'}</button></td>`,
        `<section class="h-note" aria-labelledby="h-dt"><h2 id="h-dt">申請詳細<span>${esc(d.id)}</span></h2>${dl('h-dl')}<button type="button" class="h-link">詳細を閉じる</button></section>`)}</tbody>
    </table>
  </main>
</div>`);
}

/* ---------- 案I　色面 ---------- */
function i() {
  return page('i', '申請一覧｜案I 色面', `
<div class="i-page">
  <aside class="i-field">
    <p class="i-brand"><b>${esc(SYSTEM.org)}</b><span>${esc(SYSTEM.name)}</span></p>
    <h1>申請一覧</h1>
    <p class="i-big" role="status"><b>${m.shown}</b><span>件<small>全${m.total}件中</small></span></p>
    <form class="i-search" role="search" onsubmit="return false">
      <label for="kw">キーワード</label>
      <div><input id="kw" type="search"><button type="submit">検索</button></div>
    </form>
    <div class="i-status" role="group" aria-labelledby="st">
      <p id="st" class="i-label">処理状態</p>
      ${each(m.statusOptions, (o) => `<button type="button" aria-pressed="${o.selected}"><span>${o.selected ? '<i aria-hidden="true"></i>' : ''}${esc(o.label)}</span><b>${o.count}</b></button>`)}
    </div>
  </aside>
  <div class="i-work">
    <header class="i-head">${nav('i')}<p>${esc(SYSTEM.user)}</p></header>
    <main>
      <div class="i-cond"><p>処理状態 <b>${esc(sel.label)}</b> で絞り込み中</p><button type="button" class="i-link">条件をクリア</button></div>
      <table class="i-table">
        <caption class="i-vh">申請一覧（${esc(countText(m))}）</caption>
        <thead><tr>${each(m.columns, sortHead)}<th scope="col"><span class="i-vh">操作</span></th></tr></thead>
        <tbody>${rows('i', (r, open) => `
          <td class="i-id">${esc(r.id)}</td><td class="i-name">${esc(r.applicant)}</td><td>${esc(r.type)}</td>
          <td class="i-date">${esc(slash(r.receivedAt))}</td><td><span class="i-st" data-s="${r.status.value}">${esc(r.status.label)}</span></td>
          <td class="i-act"><button type="button" aria-expanded="${open}">${open ? '閉じる' : '詳細'}</button></td>`,
          `<section class="i-detail" aria-labelledby="i-dt"><div class="i-detail__id"><h2 id="i-dt">申請詳細</h2><p>${esc(d.id)}</p><span class="i-st" data-s="${d.status.value}">${esc(d.status.label)}</span></div>${dl('i-dl')}</section>`)}</tbody>
      </table>
    </main>
  </div>
</div>`);
}

/* ---------- 案J　二色刷り ---------- */
function j() {
  return page('j', '申請一覧｜案J 二色刷り', `
<header class="j-head">
  <p class="j-brand"><b>${esc(SYSTEM.org)}</b>${esc(SYSTEM.name)}</p>
  ${nav('j')}
  <p class="j-user">${esc(SYSTEM.user)}</p>
</header>
<main class="j-main">
  <div class="j-hero">
    <h1 data-text="申請一覧">申請一覧</h1>
    <p class="j-hero__count" role="status"><b>${m.shown}</b>件 <span>／ 全${m.total}件</span></p>
    <span class="j-hero__dots" aria-hidden="true"></span><span class="j-hero__sun" aria-hidden="true"></span>
  </div>
  <div class="j-tools">
    <form class="j-search" role="search" onsubmit="return false"><label for="kw">キーワード</label><input id="kw" type="search"><button type="submit">検索</button></form>
    <div class="j-status" role="group" aria-label="処理状態">${each(m.statusOptions, (o) => `<button type="button" aria-pressed="${o.selected}">${esc(o.label)}<span>${o.count}</span></button>`)}</div>
    <p class="j-cond">処理状態「${esc(sel.label)}」で絞り込み中　<button type="button" class="j-link">条件をクリア</button></p>
  </div>
  <table class="j-table">
    <caption class="j-vh">申請一覧（${esc(countText(m))}）</caption>
    <thead><tr>${each(m.columns, sortHead)}<th scope="col"><span class="j-vh">操作</span></th></tr></thead>
    <tbody>${rows('j', (r, open) => `
      <td class="j-id">${esc(r.id)}</td><td class="j-name">${esc(r.applicant)}</td><td>${esc(r.type)}</td>
      <td class="j-date">${esc(slash(r.receivedAt))}</td><td><span class="j-st"><span aria-hidden="true">${MARK[r.status.value]}</span>${esc(r.status.label)}</span></td>
      <td class="j-act"><button type="button" aria-expanded="${open}">${open ? '閉じる' : '詳細'}</button></td>`,
      `<section class="j-detail" aria-labelledby="j-dt"><h2 id="j-dt">申請詳細 <span>${esc(d.id)}</span></h2>${dl('j-dl')}</section>`)}</tbody>
  </table>
</main>`);
}

for (const [name, html] of Object.entries({ 'h-list.html': h(), 'i-list.html': i(), 'j-list.html': j() })) writeFileSync(join(OUT, name), html);
console.log('wrote 3 files');
