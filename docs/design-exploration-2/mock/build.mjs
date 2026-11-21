// 追加探索（案E・F・G）の代表画面を、共通モデルの値で静的 HTML に書き出す。
// 実行：node docs/design-exploration-2/mock/build.mjs（同じフォルダーに e-list.html / f-list.html / g-dashboard.html）
// 動かない静止画用。比較サイト本体には組み込まない。

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_SORT, NAV_ITEMS, REFERENCE_DATE, SYSTEM } from '../../../site/assets/js/data.js';
import { buildModel, countText, formatDate } from '../../../site/assets/js/query.js';
import { buildDashboardModel } from '../../../site/assets/js/dashboard.js';

const OUT = dirname(fileURLToPath(import.meta.url));
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const each = (items, fn) => items.map(fn).join('');
const slash = (iso) => formatDate(iso, 'slash');
const md = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${m}月${d}日`; };
const days = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

// 比較条件：案C・Dの申請一覧と同じ（処理状態「審査中」、2026-01041 の詳細を開く）
const LIST_STATE = { keyword: '', status: 'reviewing', sort: DEFAULT_SORT, detail: '2026-01041', screen: 'list' };
const list = buildModel(LIST_STATE);
const all = buildModel({ ...LIST_STATE, status: '', detail: null }); // 案F：同じ並びの全件
const dash = buildDashboardModel({ period: 'fy', dept: '' });

const nav = (current, cls) => `<nav class="${cls}-nav" aria-label="メインメニュー"><ul>${each(NAV_ITEMS, (n) => `<li><a href="#"${n.id === current ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`)}</ul></nav>`;
const header = (cls, current) => `<header class="${cls}-top"><p class="${cls}-brand"><b>${esc(SYSTEM.org)}</b><span>${esc(SYSTEM.name)}</span></p>${nav(current, cls)}<p class="${cls}-user">${esc(SYSTEM.user)}</p></header>`;
const page = (cls, title, body) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}（静的モック）</title><link rel="stylesheet" href="${cls}.css"></head>
<body class="${cls}">${body}</body></html>
`;
const DETAIL = (d) => [
  ['申請者', d.applicant], ['ふりがな', d.kana], ['申請種別', d.type], ['担当課', d.department],
  ['受付日', formatDate(d.receivedAt)], ['受付方法', d.channel], ['処理期限', formatDate(d.dueAt)], ['備考', d.note || 'なし'],
];
const search = (cls) => `<form class="${cls}-search" role="search" onsubmit="return false"><label for="kw">キーワード</label><div><input id="kw" type="search" aria-describedby="kw-hint"><button type="submit" class="${cls}-primary">検索</button></div><p id="kw-hint">受付番号・申請者名・ふりがな・申請種別・担当課で探せます。</p></form>`;
const chips = (cls) => `<fieldset class="${cls}-chips"><legend>処理状態</legend>${each(list.statusOptions, (o) => `<button type="button" aria-pressed="${o.selected}">${o.selected ? '<span aria-hidden="true">✓ </span>' : ''}${esc(o.label)}<small>${o.count}件</small></button>`)}</fieldset>`;

/* ====================================================================
   案E　仕次ぎ（しつぎ）：経過した時間で段を分け、古い段から手を入れる
   ==================================================================== */

const BANDS = [
  { key: 'b5', label: '61日以上', min: 61 },
  { key: 'b4', label: '31〜60日', min: 31 },
  { key: 'b3', label: '15〜30日', min: 15 },
  { key: 'b2', label: '8〜14日', min: 8 },
  { key: 'b1', label: '7日以内', min: 0 },
];
const bandOf = (age) => BANDS.find((b) => age >= b.min);

function eList() {
  const rows = list.rows.map((r) => ({ ...r, age: days(r.receivedAt, REFERENCE_DATE), left: days(REFERENCE_DATE, r.dueAt) }));
  const groups = BANDS.map((b) => ({ ...b, rows: rows.filter((r) => bandOf(r.age) === b).sort((a, z) => z.age - a.age || a.id.localeCompare(z.id)) }));
  const overdue = rows.filter((r) => r.left < 0).length;
  const due = (r) => (r.left < 0 ? `<span class="e-over">期限を${-r.left}日超過</span>` : r.left === 0 ? '<span class="e-over">本日が期限</span>' : `期限まで${r.left}日`);
  const row = (r) => {
    const open = list.detail && list.detail.id === r.id;
    return `<tr class="${open ? 'is-open' : ''}">
      <td class="e-age" data-label="経過"><b>${r.age}</b>日</td>
      <td data-label="受付番号"><button type="button" class="e-idbtn" aria-expanded="${open}">${esc(r.id)}</button></td>
      <td data-label="申請者">${esc(r.applicant)}</td>
      <td data-label="申請種別">${esc(r.type)}</td>
      <td data-label="処理期限">${md(r.dueAt)}<span class="e-due">${due(r)}</span></td>
      <td data-label="処理状態">${esc(r.status.label)}</td>
    </tr>${open ? `<tr class="e-detail"><td colspan="6"><section aria-labelledby="e-dt"><div class="e-detail__head"><h3 id="e-dt">申請詳細　${esc(r.id)}</h3><button type="button" class="e-secondary">詳細を閉じる</button></div><dl>${each(DETAIL(list.detail), ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)}</dl></section></td></tr>` : ''}`;
  };
  const maxN = Math.max(...groups.map((g) => g.rows.length), 1);
  return page('e', '申請一覧｜案E 仕次ぎ', `${header('e', 'applications')}
<main class="e-main">
  <h1>申請一覧</h1>
  ${search('e')}
  ${chips('e')}
  <section class="e-ruler" aria-labelledby="ruler-t">
    <h2 id="ruler-t">受付からの経過日数（基準日 ${esc(formatDate(REFERENCE_DATE))}）</h2>
    <ol>${each(groups, (g) => `<li class="e-band-${g.key}"><a href="#${g.key}"><span class="e-ruler__label">${esc(g.label)}</span><span class="e-ruler__bar" style="--r:${(g.rows.length / maxN).toFixed(3)}" aria-hidden="true"></span><span class="e-ruler__n">${g.rows.length}件</span></a></li>`)}</ol>
    <p class="e-ruler__note">古い段から上に並べています。処理期限を過ぎた申請：<b>${overdue}件</b></p>
  </section>
  <p class="e-count" role="status"><b>${esc(countText(list))}</b>（処理状態：審査中）<button type="button" class="e-text">条件をクリア</button></p>
  <table class="e-table">
    <caption class="e-vh">申請一覧（経過日数の段ごと、古い順）</caption>
    <thead><tr><th scope="col">経過</th><th scope="col">受付番号</th><th scope="col">申請者</th><th scope="col">申請種別</th><th scope="col">処理期限</th><th scope="col">処理状態</th></tr></thead>
    ${each(groups.filter((g) => g.rows.length), (g) => `<tbody class="e-band e-band-${g.key}" id="${g.key}"><tr class="e-band__head"><th colspan="6" scope="rowgroup">${esc(g.label)}<span>${g.rows.length}件</span></th></tr>${each(g.rows, row)}</tbody>`)}
  </table>
</main>`);
}

/* ====================================================================
   案F　透かし（花ブロック）：絞り込んでも、隠した記録を「透かしの壁」として元の位置に残す
   ==================================================================== */

function fList() {
  const match = (r) => r.status.value === list.status;
  const parts = [];
  for (const r of all.rows) {
    if (match(r)) parts.push({ kind: 'open', r });
    else if (parts.at(-1)?.kind === 'wall') parts.at(-1).rows.push(r);
    else parts.push({ kind: 'wall', rows: [r] });
  }
  const block = (r) => `<i data-s="${r.status.value}"></i>`;
  const wall = (p) => {
    const first = p.rows[0].receivedAt;
    const last = p.rows.at(-1).receivedAt;
    const range = first === last ? md(first) : `${md(first)}〜${md(last)}`;
    const counts = {};
    for (const r of p.rows) counts[r.status.label] = (counts[r.status.label] ?? 0) + 1;
    const breakdown = Object.entries(counts).map(([k, n]) => `${k}${n}`).join('・');
    return `<tr class="f-wall"><td colspan="6"><div class="f-wall__in"><span class="f-blocks" aria-hidden="true">${each(p.rows, block)}</span><span class="f-wall__text">該当しない<b>${p.rows.length}件</b><span class="f-wall__range">${range}　${breakdown}</span></span><button type="button" class="f-text">この${p.rows.length}件も表示</button></div></td></tr>`;
  };
  const open = ({ r }) => {
    const isOpen = list.detail && list.detail.id === r.id;
    return `<tr class="f-open${isOpen ? ' is-open' : ''}">
      <td data-label="受付番号"><button type="button" class="f-idbtn" aria-expanded="${isOpen}">${esc(r.id)}</button></td>
      <td data-label="申請者">${esc(r.applicant)}</td>
      <td data-label="申請種別">${esc(r.type)}</td>
      <td data-label="受付日">${esc(slash(r.receivedAt))}</td>
      <td data-label="処理状態"><span class="f-status" data-s="${r.status.value}">${esc(r.status.label)}</span></td>
      <td></td>
    </tr>${isOpen ? `<tr class="f-detail"><td colspan="6"><section aria-labelledby="f-dt"><div class="f-detail__head"><h3 id="f-dt">申請詳細　${esc(r.id)}</h3><button type="button" class="f-secondary">詳細を閉じる</button></div><dl>${each(DETAIL(list.detail), ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)}</dl></section></td></tr>` : ''}`;
  };
  return page('f', '申請一覧｜案F 透かし', `${header('f', 'applications')}
<main class="f-main">
  <h1>申請一覧</h1>
  ${search('f')}
  ${chips('f')}
  <div class="f-count" role="status">
    <p><b>${esc(countText(list))}</b>を表示　<span>該当しない${list.total - list.shown}件は、元の位置に「壁」として残しています</span></p>
    <button type="button" class="f-text">条件をクリア</button>
    <button type="button" class="f-secondary">壁をすべて開く</button>
  </div>
  <p class="f-legend" aria-hidden="true">壁の1マス＝1件：${each(all.statusOptions.slice(1), (o) => `<span><i data-s="${o.value}"></i>${esc(o.label)}</span>`)}</p>
  <table class="f-table">
    <caption class="f-vh">申請一覧（受付日の新しい順。該当しない記録はまとめて件数で表示）</caption>
    <thead><tr><th scope="col">受付番号</th><th scope="col">申請者</th><th scope="col">申請種別</th><th scope="col">受付日 ↓</th><th scope="col">処理状態</th><th scope="col"><span class="f-vh">操作</span></th></tr></thead>
    <tbody>${each(parts, (p) => (p.kind === 'wall' ? wall(p) : open(p)))}</tbody>
  </table>
</main>`);
}

/* ====================================================================
   案G　表座と裏座：数値（表）の真裏に、その内訳（裏座）を置く
   ==================================================================== */

function gDashboard() {
  const d = dash;
  const k = Object.fromEntries(d.kpis.map((x) => [x.key, x]));
  const st = Object.fromEntries(d.statuses.map((s) => [s.value, s]));
  const peak = d.monthMax;
  const typeMax = d.types[0].count;
  const statusRows = (vals, sum) => `<ul class="g-parts">${each(vals.map((v) => st[v]), (s) => `<li><a href="#">${esc(s.label)}</a><span class="g-parts__bar" style="--r:${(s.count / sum).toFixed(3)}" aria-hidden="true"></span><b>${s.count}件</b><small>${esc(s.shareText)}</small></li>`)}</ul>
    <p class="g-sum">${vals.map((v) => st[v].count).join(' ＋ ')} ＝ <b>${sum}件</b></p>`;
  return page('g', 'ダッシュボード｜案G 表座と裏座', `${header('g', 'dashboard')}
<main class="g-main">
  <h1>ダッシュボード</h1>
  <form class="g-engawa" aria-label="集計の条件" onsubmit="return false">
    <div><label for="period">対象期間</label><select id="period">${each(d.periodOptions, (o) => `<option${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></div>
    <div><label for="dept">担当課</label><select id="dept">${each(d.deptOptions, (o) => `<option${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></div>
    <button type="button" class="g-secondary">リセット</button>
    <p>基準日 ${esc(d.refDate)}<br><span>${esc(d.period.rangeText)}</span></p>
  </form>
  <div class="g-house">
    <section class="g-room g-room--total" aria-labelledby="r1">
      <div class="g-front"><h2 id="r1">${esc(k.total.label)}</h2><p class="g-num"><b>${k.total.value}</b>件</p><p class="g-note">${esc(k.total.note)}</p><a href="#" class="g-go">受付した申請の一覧へ</a></div>
      <div class="g-back">
        <h3>月別の受付件数</h3>
        <ul class="g-months">${each(d.months, (m) => `<li><span>${esc(m.label)}</span><span class="g-parts__bar" style="--r:${(m.count / peak).toFixed(3)}" aria-hidden="true"></span><b>${m.count}件</b></li>`)}</ul>
        <p class="g-sum">7か月の合計 ＝ <b>${d.months.reduce((a, m) => a + m.count, 0)}件</b>（10月は基準日まで）</p>
        <h3>申請種別の内訳</h3>
        <ul class="g-parts g-parts--types">${each(d.types, (t) => `<li><a href="#">${esc(t.type)}</a><span class="g-parts__bar" style="--r:${(t.count / typeMax).toFixed(3)}" aria-hidden="true"></span><b>${t.count}件</b><small>${esc(t.shareText)}</small></li>`)}</ul>
      </div>
    </section>
    <section class="g-room" aria-labelledby="r2">
      <div class="g-front"><h2 id="r2">${esc(k.pending.label)}</h2><p class="g-num"><b>${k.pending.value}</b>件</p><p class="g-note">${esc(k.pending.note)}</p><a href="#" class="g-go">処理待ちの一覧へ</a></div>
      <div class="g-back"><h3>処理待ちの内訳</h3>${statusRows(['received', 'reviewing', 'returned'], k.pending.value)}</div>
    </section>
    <section class="g-room" aria-labelledby="r3">
      <div class="g-front"><h2 id="r3">${esc(k.done.label)}</h2><p class="g-num"><b>${k.done.value}</b>件</p><p class="g-note">${esc(k.done.note)}</p><a href="#" class="g-go">処理完了の一覧へ</a></div>
      <div class="g-back"><h3>処理完了の内訳</h3>${statusRows(['approved', 'rejected'], k.done.value)}
        <div class="g-rate"><h3>${esc(k.rate.label)}</h3><p class="g-num g-num--sub"><b>${esc(k.rate.value)}</b></p><p class="g-note">${esc(k.rate.note)}（処理完了 ÷ 受付件数）</p><span class="g-rate__bar" style="--r:${(d.rateTenths / 1000).toFixed(3)}" aria-hidden="true"></span></div>
      </div>
    </section>
  </div>
  <p class="g-foot-note">割合は受付件数に占める割合です。小数第2位を四捨五入しています。</p>
</main>`);
}

const FILES = { 'e-list.html': eList(), 'f-list.html': fList(), 'g-dashboard.html': gDashboard() };
for (const [name, html] of Object.entries(FILES)) writeFileSync(join(OUT, name), html);
console.log(`wrote ${Object.keys(FILES).length} files`);
