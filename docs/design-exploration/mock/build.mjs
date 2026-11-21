// 設計比較用の静的モックを生成する（案C「素地と釉」・案D「経路と停留所」× 3画面）。
// 値はすべて共通モデル（site/assets/js）から作り、モック側で件数・文言を手書きしない。
// 実行：node docs/design-exploration/mock/build.mjs → 同じフォルダーに c-*.html / d-*.html を書き出す。
// 生成物は動かない静止画用の HTML で、比較サイト本体には組み込まない。

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_SORT, FORM_SAMPLES, NAV_ITEMS, SYSTEM } from '../../../site/assets/js/data.js';
import { buildModel, countText, formatDate } from '../../../site/assets/js/query.js';
import { buildFormModel, validate } from '../../../site/assets/js/form.js';
import { buildDashboardModel } from '../../../site/assets/js/dashboard.js';

const OUT = dirname(fileURLToPath(import.meta.url));

/* ---------- 比較条件（両案で同じ） ---------- */

// 申請一覧：処理状態「審査中」で絞り込み、2026-01041 の詳細を開いた状態
const LIST_STATE = { keyword: '', status: 'reviewing', sort: DEFAULT_SORT, detail: '2026-01041' };
// 新規申請：共通の正常な入力例から、ふりがなをカタカナ・電話を空欄（任意）・同意なしにして「確認へ」を押した直後
const FORM_VALUES = { ...FORM_SAMPLES.valid, kana: 'サクライ ハルカ', phone: '', agree: false };
// ダッシュボード：既定の集計条件（令和8年度・すべての担当課）
const DASH_STATE = { period: 'fy', dept: '' };

const list = buildModel({ ...LIST_STATE, screen: 'list' });
const form = buildFormModel({ values: FORM_VALUES, errors: validate(FORM_VALUES), submitted: true, step: 'edit' });
const dash = buildDashboardModel(DASH_STATE);

/* ---------- 小さな道具 ---------- */

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const join_ = (items, fn) => items.map(fn).join('');
const slash = (iso) => formatDate(iso, 'slash');
const NAV_CURRENT = { list: 'applications', form: 'new', dashboard: 'dashboard' };
const SECTIONS = [
  { id: 'applicant', title: '申請者情報', fields: ['name', 'kana', 'email', 'phone'] },
  { id: 'procedure', title: '手続きの内容', fields: ['type', 'date', 'body'] },
  { id: 'consent', title: '確認事項', fields: ['agree'] },
];
const fieldOf = (name) => form.fields.find((f) => f.name === name);
const sectionErrors = (s) => s.fields.map(fieldOf).filter((f) => f.error).length;
const DETAIL_ITEMS = (d) => [
  ['受付番号', d.id],
  ['申請者', d.applicant],
  ['ふりがな', d.kana],
  ['申請種別', d.type],
  ['担当課', d.department],
  ['受付日', formatDate(d.receivedAt)],
  ['受付方法', d.channel],
  ['処理期限', formatDate(d.dueAt)],
  ['処理状態', d.status.label],
  ['備考', d.note || 'なし'],
];

function page({ concept, screen, title, body }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}｜${concept === 'c' ? '案C 素地と釉' : '案D 経路と停留所'}（静的モック）</title>
<link rel="stylesheet" href="${concept}.css">
</head>
<body class="${concept}" data-screen="${screen}">
${body}
</body>
</html>
`;
}

/* ====================================================================
   案C　素地と釉（きじとくすり）
   触れて操作できるものだけに「釉」（白化粧の面＋呉須の色）を掛ける。
   読むだけの記録・数値・見出しは素地（土色と鉄色）のままにする。
   ==================================================================== */

const cHeader = (screen) => `
<header class="c-top">
  <div class="c-top__in">
    <p class="c-brand"><span class="c-brand__mark" aria-hidden="true"></span><span class="c-brand__org">${esc(SYSTEM.org)}</span><span class="c-brand__sys">${esc(SYSTEM.name)}</span></p>
    <nav class="c-nav" aria-label="メインメニュー"><ul>${join_(NAV_ITEMS, (n) => `<li><a href="#"${n.id === NAV_CURRENT[screen] ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`)}</ul></nav>
    <p class="c-user">${esc(SYSTEM.user)}</p>
  </div>
</header>`;

// 状態の印（窯印のような小さな図形）。字形の差が出ないよう SVG で描き、状態名の文字を必ず併記する
const C_MARK_PATH = {
  received: '<circle cx="8" cy="8" r="5.5" fill="none" stroke-width="2"/>',
  reviewing: '<circle cx="8" cy="8" r="5.5" fill="none" stroke-width="2"/><path d="M8 2.5a5.5 5.5 0 0 0 0 11z" stroke="none"/>',
  returned: '<path d="M8 2.2 14 13H2z" fill="none" stroke-width="2" stroke-linejoin="round"/>',
  approved: '<circle cx="8" cy="8" r="6.5" stroke="none"/>',
  rejected: '<path d="M3 3l10 10M13 3 3 13" fill="none" stroke-width="2.4"/>',
};
const C_MARK = Object.fromEntries(Object.entries(C_MARK_PATH).map(([k, v]) => [k, `<svg class="c-mark" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${v}</svg>`]));
const cStatus = (s) => `<span class="c-stamp" data-status-mark="${s.value}">${C_MARK[s.value]}${esc(s.label)}</span>`;

const cDetail = (d, where) => `
<section class="c-tray c-tray--${where}" aria-labelledby="tray-${where}">
  <div class="c-tray__head">
    <h2 id="tray-${where}">申請詳細<span class="c-tray__id">${esc(d.id)}</span></h2>
    <button type="button" class="c-btn c-btn--secondary c-btn--small">詳細を閉じる</button>
  </div>
  <dl class="c-dl">${join_(DETAIL_ITEMS(d), ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${k === '処理状態' ? cStatus(d.status) : esc(v)}</dd></div>`)}</dl>
</section>`;

function cList() {
  const m = list;
  const sortCol = (c) =>
    `<th scope="col" aria-sort="${c.ariaSort}"><button type="button" class="c-sort">${esc(c.label)}<span class="c-sort__dir" aria-hidden="true">${c.sorted === 'desc' ? '↓' : c.sorted === 'asc' ? '↑' : '↕'}</span></button></th>`;
  const rows = join_(m.rows, (r) => {
    const open = m.detail && r.id === m.detail.id;
    return `<tr class="${open ? 'is-open' : ''}">
      <td data-label="受付番号"><button type="button" class="c-idlink" aria-expanded="${open}">${esc(r.id)}</button>${open ? '<span class="c-open-note">詳細を表示中</span>' : ''}</td>
      <td data-label="申請者">${esc(r.applicant)}</td>
      <td data-label="申請種別">${esc(r.type)}</td>
      <td data-label="受付日">${esc(slash(r.receivedAt))}</td>
      <td data-label="処理状態">${cStatus(r.status)}</td>
    </tr>${open ? `<tr class="c-inline-detail"><td colspan="5">${cDetail(m.detail, 'inline')}</td></tr>` : ''}`;
  });
  return page({
    concept: 'c',
    screen: 'list',
    title: '申請一覧',
    body: `${cHeader('list')}
<main class="c-main">
  <div class="c-title"><h1>申請一覧</h1></div>
  <form class="c-search" role="search" onsubmit="return false">
    <label for="kw" class="c-label">キーワード</label>
    <p class="c-hint" id="kw-hint">受付番号・申請者名・ふりがな・申請種別・担当課で探せます。</p>
    <div class="c-search__row"><input id="kw" class="c-input" type="search" aria-describedby="kw-hint" value="${esc(m.keyword)}"><button type="submit" class="c-btn c-btn--primary">検索</button></div>
  </form>
  <fieldset class="c-chips">
    <legend class="c-label">処理状態</legend>
    <div class="c-chips__row">${join_(m.statusOptions, (o) => `<button type="button" class="c-chip" aria-pressed="${o.selected}">${o.selected ? '<span aria-hidden="true">✓ </span>' : ''}${esc(o.label)}<span class="c-chip__n">${o.count}件</span></button>`)}</div>
  </fieldset>
  <div class="c-count" role="status">
    <p><strong>${esc(countText(m))}</strong>を表示</p>
    <p class="c-count__cond">絞り込み中：処理状態「${esc(m.statusOptions.find((o) => o.selected).label)}」</p>
    <button type="button" class="c-btn c-btn--text">条件をクリア</button>
  </div>
  <div class="c-shelf">
    <table class="c-table">
      <caption class="c-vh">申請一覧（${esc(countText(m))}、受付日の新しい順）</caption>
      <thead><tr>${join_(m.columns, sortCol)}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${m.detail ? cDetail(m.detail, 'side') : ''}
  </div>
</main>
${cFooter()}`,
  });
}

const cFooter = () => `<footer class="c-foot"><p>さくら野市（架空の自治体）　静的モック：案C「素地と釉」（仮称）</p></footer>`;

function cControl(f) {
  const id = `f-${f.name}`;
  const described = [f.hint && `${id}-hint`, f.error && `${id}-error`].filter(Boolean).join(' ');
  const aria = `${described ? ` aria-describedby="${described}"` : ''}${f.error ? ' aria-invalid="true"' : ''}`;
  if (f.control === 'select') {
    return `<select id="${id}" class="c-input c-select"${aria}><option value="">${esc(f.placeholder)}</option>${join_(f.options, (o) => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`)}</select>`;
  }
  if (f.control === 'textarea') return `<textarea id="${id}" class="c-input c-textarea" rows="${f.rows}"${aria}>${esc(f.value)}</textarea>`;
  if (f.control === 'checkbox') {
    return `<label class="c-check"><input type="checkbox" id="${id}"${f.value ? ' checked' : ''}${aria}><span class="c-check__box" aria-hidden="true"></span><span>${esc(f.checkLabel)}</span></label>`;
  }
  const type = { text: 'text', email: 'email', tel: 'tel', date: 'date' }[f.control];
  return `<input id="${id}" class="c-input c-input--${f.control}" type="${type}" value="${esc(f.value)}"${f.example && !f.value ? ` placeholder="${esc(f.example)}"` : ''}${aria}>`;
}

function cField(f) {
  const id = `f-${f.name}`;
  const isCheck = f.control === 'checkbox';
  const label = `${esc(f.label)}<span class="c-req">${f.required ? '必須' : '任意'}</span>`;
  return `<div class="c-field${f.error ? ' is-error' : ''}" id="field-${f.name}">
    ${isCheck ? `<p class="c-field__label" id="${id}-label">${label}</p>` : `<label class="c-field__label" for="${id}">${label}</label>`}
    ${f.hint ? `<p class="c-field__hint" id="${id}-hint">${esc(f.hint)}</p>` : ''}
    ${f.error ? `<p class="c-field__error" id="${id}-error"><span class="c-vh">エラー：</span>${esc(f.error.text)}</p>` : ''}
    ${cControl(f)}
  </div>`;
}

function cForm() {
  const m = form;
  return page({
    concept: 'c',
    screen: 'form',
    title: '新規申請',
    body: `${cHeader('form')}
<main class="c-main c-main--form">
  <div class="c-title"><h1>新規申請</h1></div>
  <ol class="c-steps" aria-label="申請の手順">${join_(m.steps, (s) => `<li${s.current ? ' aria-current="step"' : ''}><span class="c-steps__n">${s.number}</span>${esc(s.label)}</li>`)}</ol>
  <div class="c-errors" tabindex="-1" role="alert" aria-labelledby="err-title">
    <h2 id="err-title">エラー：${m.errorCount}件の入力を直してください</h2>
    <ul>${join_(m.errorList, (e) => `<li><a href="#f-${e.name}">${esc(e.label)}：${esc(e.text)}</a></li>`)}</ul>
  </div>
  <form class="c-form" novalidate onsubmit="return false">
    ${join_(SECTIONS, (s) => `<section class="c-sec" aria-labelledby="sec-${s.id}"><h2 class="c-sec__title" id="sec-${s.id}">${esc(s.title)}</h2>${join_(s.fields.map(fieldOf), cField)}</section>`)}
    <div class="c-actions">
      <button type="submit" class="c-btn c-btn--primary c-btn--large">確認へ進む</button>
      <p class="c-hint">次の画面で入力内容を確認できます。この試作では送信・保存しません。</p>
    </div>
  </form>
</main>
${cFooter()}`,
  });
}

function cDashboard() {
  const d = dash;
  const peakTick = Math.ceil(d.monthMax / 5) * 5;
  return page({
    concept: 'c',
    screen: 'dashboard',
    title: 'ダッシュボード',
    body: `${cHeader('dashboard')}
<main class="c-main">
  <div class="c-title"><h1>ダッシュボード</h1></div>
  <form class="c-cond" onsubmit="return false" aria-label="集計の条件">
    <div class="c-cond__item"><label class="c-label" for="period">対象期間</label><select id="period" class="c-input c-select">${join_(d.periodOptions, (o) => `<option${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></div>
    <div class="c-cond__item"><label class="c-label" for="dept">担当課</label><select id="dept" class="c-input c-select">${join_(d.deptOptions, (o) => `<option${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></div>
    <button type="button" class="c-btn c-btn--secondary">リセット</button>
    <p class="c-cond__ref">基準日　${esc(d.refDate)}<br><span>${esc(d.period.rangeText)}</span></p>
  </form>
  <section class="c-block" aria-labelledby="sum">
    <h2 class="c-block__title" id="sum">受付と処理の概況</h2>
    <dl class="c-figures">${join_(
      d.kpis,
      (k) => `<div class="c-figure c-figure--${k.key}"><dt>${esc(k.label)}</dt><dd class="c-figure__num">${esc(k.value)}${k.unit ? `<small>${esc(k.unit)}</small>` : ''}</dd><dd class="c-figure__note">${esc(k.note)}</dd>${k.link ? `<dd><a href="#" class="c-link">${esc(k.label.replace('件数', ''))}の一覧を見る</a></dd>` : '<dd class="c-figure__nolink">（一覧はありません）</dd>'}</div>`,
    )}</dl>
  </section>
  <div class="c-two">
    <section class="c-block" aria-labelledby="months">
      <h2 class="c-block__title" id="months">月別の受付件数<span class="c-block__unit">単位：件</span></h2>
      <div class="c-cols" style="--peak:${peakTick}">${join_(d.months, (mo) => `<div class="c-col"><span class="c-col__n">${mo.count}</span><span class="c-col__bar" style="--v:${mo.count}" aria-hidden="true"></span><span class="c-col__label">${esc(mo.label)}</span></div>`)}</div>
      <p class="c-hint">10月は基準日までの受付分です。棒は読むためのもので、押せません。</p>
    </section>
    <section class="c-block" aria-labelledby="statuses">
      <h2 class="c-block__title" id="statuses">処理状態の内訳<span class="c-block__unit">受付全体に占める割合</span></h2>
      <ul class="c-rows">${join_(d.statuses, (s) => `<li class="c-row"><span class="c-row__mark" aria-hidden="true">${C_MARK[s.value]}</span><a href="#" class="c-link c-row__name">${esc(s.label)}</a><span class="c-row__n">${s.count}件</span><span class="c-row__share">${esc(s.shareText)}</span><span class="c-row__bar" style="--r:${s.ratio.toFixed(3)}" aria-hidden="true"></span></li>`)}</ul>
    </section>
  </div>
  <section class="c-block" aria-labelledby="types">
    <h2 class="c-block__title" id="types">申請種別の内訳<span class="c-block__unit">受付件数の多い順</span></h2>
    <ul class="c-rows c-rows--types">${join_(d.types, (t) => `<li class="c-row"><a href="#" class="c-link c-row__name">${esc(t.type)}</a><span class="c-row__n">${t.count}件</span><span class="c-row__share">${esc(t.shareText)}</span><span class="c-row__bar" style="--r:${t.ratio.toFixed(3)}" aria-hidden="true"></span></li>`)}</ul>
  </section>
</main>
${cFooter()}`,
  });
}

/* ====================================================================
   案D　経路と停留所（けいろとていりゅうじょ）
   申請の処理状態を「路線」として描き、停留所（状態）を選んで一覧へ、
   区間（入力のまとまり）をたどってフォームを進める。現在地は反転表示。
   ==================================================================== */

const dHeader = (screen) => `
<header class="d-top">
  <div class="d-top__in">
    <p class="d-brand"><span class="d-brand__org">${esc(SYSTEM.org)}</span><span class="d-brand__sys">${esc(SYSTEM.name)}</span></p>
    <nav class="d-nav" aria-label="メインメニュー"><ul>${join_(NAV_ITEMS, (n) => `<li><a href="#"${n.id === NAV_CURRENT[screen] ? ' aria-current="page"' : ''}>${n.id === NAV_CURRENT[screen] ? '<span class="d-vh">現在地：</span>' : ''}${esc(n.label)}</a></li>`)}</ul></nav>
    <p class="d-user">${esc(SYSTEM.user)}</p>
  </div>
</header>`;

const dFooter = () => `<footer class="d-foot"><p>さくら野市（架空の自治体）　静的モック：案D「経路と停留所」（仮称）</p></footer>`;

// 路線図の停留所の位置（横 x％・縦 row）。行 0＝支線（上）、1＝本線、2＝分岐（下）
const STOPS = {
  received: { x: 10, row: 1 },
  reviewing: { x: 40, row: 1 },
  returned: { x: 40, row: 0 },
  approved: { x: 74, row: 1 },
  rejected: { x: 74, row: 2 },
};
const FORK_X = 57;

/** 路線図。stations: [{ value, label, count, share?, selected? }]。big はダッシュボード用。 */
function dRoute({ stations, big = false, interactive = 'button', label }) {
  const rowY = big ? [30, 62, 86] : [28, 60, 86]; // d.css の --y0〜--y2 と同じ値（％）
  const st = (s) => {
    const p = STOPS[s.value];
    const tag = interactive === 'link' ? 'a href="#"' : `button type="button" aria-pressed="${Boolean(s.selected)}"`;
    const close = interactive === 'link' ? 'a' : 'button';
    return `<li class="d-stop d-stop--${s.value}${s.selected ? ' is-here' : ''}" style="--x:${p.x}%;--y:${rowY[p.row]}%" data-row="${p.row}">
      <${tag} class="d-stop__hit">
        <span class="d-stop__mark" aria-hidden="true"></span>
        <span class="d-stop__text">${s.selected ? '<span class="d-here">現在地</span>' : ''}<span class="d-stop__name">${esc(s.label)}</span><span class="d-stop__n">${s.count}<small>件</small></span>${s.share ? `<span class="d-stop__share">${esc(s.share)}</span>` : ''}</span>
      </${close}>
    </li>`;
  };
  const y = (v) => rowY[STOPS[v].row];
  const x = (v) => STOPS[v].x;
  return `<div class="d-route${big ? ' d-route--big' : ''}" style="--y0:${rowY[0]}%;--y1:${rowY[1]}%;--y2:${rowY[2]}%">
    <svg class="d-route__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M${big ? 0 : x('received')} ${y('received')} H${x('approved')}" />
      <path d="M${FORK_X} ${y('reviewing')} V${y('rejected')} H${x('rejected')}" />
      <path class="d-route__spur" d="M${x('returned')} ${y('reviewing')} V${y('returned')}" />
    </svg>
    <span class="d-route__loop" style="--x:${x('returned')}%;--y1:${y('returned')}%;--y2:${y('reviewing')}%" aria-hidden="true">⇅</span>
    <ol class="d-route__stops" aria-label="${esc(label)}">${join_(['received', 'reviewing', 'returned', 'approved', 'rejected'].map((v) => stations.find((s) => s.value === v)), st)}</ol>
  </div>`;
}

const D_POS = { received: 0, reviewing: 1, returned: 1, approved: 2, rejected: 2 };
/** 行の処理状態：経路上の位置を示す小さな線（装飾）と、状態名の文字。 */
const dMini = (s) => `<span class="d-mini" data-pos="${D_POS[s.value]}" data-status-mark="${s.value}"><span class="d-mini__line" aria-hidden="true"><i></i><i></i><i></i></span><span class="d-mini__label">${esc(s.label)}</span></span>`;

const dDetail = (d) => `
<section class="d-detail" aria-labelledby="d-detail-title">
  <div class="d-detail__head"><h2 id="d-detail-title">申請詳細<span class="d-detail__id">${esc(d.id)}</span></h2><button type="button" class="d-btn d-btn--secondary d-btn--small">詳細を閉じる</button></div>
  <div class="d-detail__body">
    <ol class="d-trip" aria-label="この申請の経路">
      <li class="d-trip__stop is-past"><span class="d-trip__k">受付</span><span class="d-trip__v">${esc(formatDate(d.receivedAt))}（${esc(d.channel)}）</span></li>
      <li class="d-trip__stop is-here"><span class="d-trip__k"><span class="d-here">現在地</span></span><span class="d-trip__v">${esc(d.status.label)}　${esc(d.department)}</span></li>
      <li class="d-trip__stop is-next"><span class="d-trip__k">処理期限</span><span class="d-trip__v">${esc(formatDate(d.dueAt))}</span></li>
    </ol>
    <dl class="d-dl">${join_(DETAIL_ITEMS(d).filter(([k]) => !['受付日', '処理期限', '処理状態', '受付番号'].includes(k)), ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)}</dl>
  </div>
</section>`;

function dList() {
  const m = list;
  const sel = m.statusOptions.find((o) => o.selected);
  const stations = m.statusOptions.filter((o) => o.value).map((o) => ({ value: o.value, label: o.label, count: o.count, selected: o.selected }));
  const all = m.statusOptions[0];
  const rows = join_(m.rows, (r) => {
    const open = m.detail && r.id === m.detail.id;
    return `<tr class="${open ? 'is-open' : ''}">
      <td data-label="受付番号" class="d-num">${esc(r.id)}</td>
      <td data-label="申請者">${esc(r.applicant)}</td>
      <td data-label="申請種別">${esc(r.type)}</td>
      <td data-label="受付日" class="d-num">${esc(slash(r.receivedAt))}</td>
      <td data-label="処理状態">${dMini(r.status)}</td>
      <td class="d-cell-act"><button type="button" class="d-btn d-btn--secondary d-btn--small" aria-expanded="${open}">${open ? '詳細を閉じる' : '詳細'}<span class="d-vh">（${esc(r.id)}）</span></button></td>
    </tr>${open ? `<tr class="d-detail-row"><td colspan="6">${dDetail(m.detail)}</td></tr>` : ''}`;
  });
  return page({
    concept: 'd',
    screen: 'list',
    title: '申請一覧',
    body: `${dHeader('list')}
<main class="d-main">
  <h1 class="d-h1">申請一覧</h1>
  <form class="d-search" role="search" onsubmit="return false">
    <label for="kw" class="d-label">キーワード</label>
    <div class="d-search__row"><input id="kw" class="d-input" type="search" aria-describedby="kw-hint" value="${esc(m.keyword)}"><button type="submit" class="d-btn d-btn--primary">検索</button></div>
    <p class="d-hint" id="kw-hint">受付番号・申請者名・ふりがな・申請種別・担当課で探せます。</p>
  </form>
  <section class="d-panel" aria-labelledby="route-title">
    <div class="d-panel__head">
      <h2 class="d-h2" id="route-title">処理状態の路線図</h2>
      <p class="d-hint">停留所を選ぶと、その状態の申請だけを表示します。件数はキーワードに一致した数です。</p>
      <button type="button" class="d-btn d-btn--secondary d-btn--small" aria-pressed="${all.selected}">すべての状態<span class="d-btn__n">${all.count}件</span></button>
    </div>
    ${dRoute({ stations, label: '処理状態（停留所）' })}
  </section>
  <div class="d-count" role="status">
    <p class="d-count__main"><strong>${m.shown}</strong>件<span class="d-count__of">（${m.total}件中）</span></p>
    <p class="d-count__cond"><span class="d-tag">処理状態：${esc(sel.label)}</span></p>
    <button type="button" class="d-btn d-btn--text">すべての状態に戻す</button>
  </div>
  <table class="d-table">
    <caption class="d-vh">申請一覧（${esc(countText(m))}、受付日の新しい順）</caption>
    <thead><tr>${join_(m.columns, (c) => `<th scope="col" aria-sort="${c.ariaSort}"><button type="button" class="d-sort">${esc(c.label)}<span aria-hidden="true">${c.sorted === 'desc' ? '▼' : c.sorted === 'asc' ? '▲' : ''}</span></button></th>`)}<th scope="col"><span class="d-vh">操作</span></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</main>
${dFooter()}`,
  });
}

function dControl(f) {
  const id = `f-${f.name}`;
  const described = [f.hint && `${id}-hint`, f.error && `${id}-error`].filter(Boolean).join(' ');
  const aria = `${described ? ` aria-describedby="${described}"` : ''}${f.error ? ' aria-invalid="true"' : ''}`;
  if (f.control === 'select') {
    return `<select id="${id}" class="d-input"${aria}><option value="">${esc(f.placeholder)}</option>${join_(f.options, (o) => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`)}</select>`;
  }
  if (f.control === 'textarea') return `<textarea id="${id}" class="d-input d-textarea" rows="${f.rows}"${aria}>${esc(f.value)}</textarea>`;
  if (f.control === 'checkbox') {
    return `<label class="d-check"><input type="checkbox" id="${id}"${f.value ? ' checked' : ''}${aria}><span class="d-check__box" aria-hidden="true"></span><span>${esc(f.checkLabel)}</span></label>`;
  }
  const type = { text: 'text', email: 'email', tel: 'tel', date: 'date' }[f.control];
  return `<input id="${id}" class="d-input d-input--${f.control}" type="${type}" value="${esc(f.value)}"${f.example && !f.value ? ` placeholder="${esc(f.example)}"` : ''}${aria}>`;
}

function dField(f) {
  const id = `f-${f.name}`;
  const isCheck = f.control === 'checkbox';
  const badge = `<span class="d-badge${f.required ? '' : ' d-badge--opt'}">${f.required ? '必須' : '任意'}</span>`;
  return `<div class="d-field${f.error ? ' is-error' : ''}">
    ${isCheck ? `<p class="d-field__label">${esc(f.label)}${badge}</p>` : `<label class="d-field__label" for="${id}">${esc(f.label)}${badge}</label>`}
    ${f.hint ? `<p class="d-hint" id="${id}-hint">${esc(f.hint)}</p>` : ''}
    ${f.error ? `<p class="d-field__error" id="${id}-error"><span class="d-err-mark" aria-hidden="true">！</span><span class="d-vh">エラー：</span>${esc(f.error.text)}</p>` : ''}
    ${dControl(f)}
  </div>`;
}

function dForm() {
  const m = form;
  const secState = (s) => {
    const n = sectionErrors(s);
    if (n) return { cls: 'is-error', text: `エラー ${n}件` };
    return { cls: 'is-done', text: '入力済' };
  };
  const nav = `<nav class="d-legs" aria-label="入力の経路">
    <ol>
      <li class="d-legs__step is-here"><span class="d-legs__mark" aria-hidden="true"></span><span class="d-here">現在地</span><span class="d-legs__name">1　入力</span>
        <ol class="d-legs__sub">${join_(SECTIONS, (s, i) => {
          const st = secState(s);
          return `<li class="d-legs__sec ${st.cls}"><a href="#sec-${s.id}"><span class="d-legs__dot" aria-hidden="true"></span><span class="d-legs__secname">${esc(s.title)}</span><span class="d-legs__state">${st.cls === 'is-error' ? '<span aria-hidden="true">！</span>' : '<span aria-hidden="true">✓</span>'}${st.text}</span></a></li>`;
        })}</ol>
      </li>
      ${join_(m.steps.slice(1), (s) => `<li class="d-legs__step is-ahead"><span class="d-legs__mark" aria-hidden="true"></span><span class="d-legs__name">${s.number}　${esc(s.label)}</span></li>`)}
    </ol>
  </nav>`;
  return page({
    concept: 'd',
    screen: 'form',
    title: '新規申請',
    body: `${dHeader('form')}
<main class="d-main">
  <h1 class="d-h1">新規申請</h1>
  <div class="d-formwrap">
    ${nav}
    <div class="d-formcol">
      <div class="d-errors" tabindex="-1" role="alert" aria-labelledby="err-title">
        <h2 id="err-title"><span aria-hidden="true">！</span>エラー　${m.errorCount}件の入力を直してください</h2>
        <ul>${join_(m.errorList, (e) => `<li><a href="#f-${e.name}">${esc(e.label)}：${esc(e.text)}</a></li>`)}</ul>
      </div>
      <form class="d-form" novalidate onsubmit="return false">
        ${join_(SECTIONS, (s, i) => {
          const st = secState(s);
          return `<section class="d-sec ${st.cls}" id="sec-${s.id}" aria-labelledby="sec-${s.id}-t"><h2 class="d-sec__title" id="sec-${s.id}-t"><span class="d-sec__stop" aria-hidden="true"></span>${esc(s.title)}<span class="d-sec__state">${st.text}</span></h2>${join_(s.fields.map(fieldOf), dField)}</section>`;
        })}
        <div class="d-actions">
          <p class="d-actions__next">次は「2　確認」です。入力内容を一覧で確かめてから申請します。</p>
          <button type="submit" class="d-btn d-btn--primary d-btn--large">確認へ<span aria-hidden="true">→</span></button>
        </div>
      </form>
    </div>
  </div>
</main>
${dFooter()}`,
  });
}

function dDashboard() {
  const d = dash;
  const stations = d.statuses.map((s) => ({ value: s.value, label: s.label, count: s.count, share: s.shareText }));
  const kpi = Object.fromEntries(d.kpis.map((k) => [k.key, k]));
  const units = (n, max) => `<span class="d-units" style="--n:${n};--max:${max}" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;
  const typeMax = Math.max(...d.types.map((t) => t.count));
  return page({
    concept: 'd',
    screen: 'dashboard',
    title: 'ダッシュボード',
    body: `${dHeader('dashboard')}
<main class="d-main">
  <h1 class="d-h1">ダッシュボード</h1>
  <form class="d-cond" onsubmit="return false" aria-label="集計の条件">
    <div class="d-cond__item"><label class="d-label" for="period">対象期間</label><select id="period" class="d-input">${join_(d.periodOptions, (o) => `<option${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></div>
    <div class="d-cond__item"><label class="d-label" for="dept">担当課</label><select id="dept" class="d-input">${join_(d.deptOptions, (o) => `<option${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`)}</select></div>
    <button type="button" class="d-btn d-btn--secondary">リセット</button>
    <p class="d-cond__ref">基準日 ${esc(d.refDate)}<span>${esc(d.period.rangeText)}</span></p>
  </form>
  <section class="d-panel d-panel--flow" aria-labelledby="flow">
    <div class="d-panel__head">
      <h2 class="d-h2" id="flow">受付から処理までの路線図</h2>
      <p class="d-hint">${esc(d.scopeText)}。停留所を選ぶと、その状態の一覧へ移ります。</p>
    </div>
    <div class="d-origin">
      <p class="d-origin__k">${esc(kpi.total.label)}</p>
      <p class="d-origin__v"><strong>${kpi.total.value}</strong>件</p>
      <p class="d-hint">${esc(kpi.total.note)}</p>
      <a href="#" class="d-go">受付した申請の一覧<span aria-hidden="true">→</span></a>
    </div>
    ${dRoute({ stations, big: true, interactive: 'link', label: '処理状態（停留所）' })}
    <div class="d-spans">
      <div class="d-span d-span--pending"><p class="d-span__k">${esc(kpi.pending.label)}</p><p class="d-span__v"><strong>${kpi.pending.value}</strong>件</p><p class="d-hint">${esc(kpi.pending.note)}</p><a href="#" class="d-go">処理待ちの一覧<span aria-hidden="true">→</span></a></div>
      <div class="d-span d-span--done">
        <div><p class="d-span__k">${esc(kpi.done.label)}</p><p class="d-span__v"><strong>${kpi.done.value}</strong>件</p><p class="d-hint">${esc(kpi.done.note)}</p><a href="#" class="d-go">処理完了の一覧<span aria-hidden="true">→</span></a></div>
        <div class="d-span__rate"><p class="d-span__k">${esc(kpi.rate.label)}</p><p class="d-span__v"><strong>${esc(kpi.rate.value)}</strong></p><p class="d-hint">${esc(kpi.rate.note)}</p></div>
      </div>
    </div>
  </section>
  <div class="d-two">
    <section class="d-panel" aria-labelledby="months">
      <div class="d-panel__head"><h2 class="d-h2" id="months">月別の受付件数</h2><p class="d-hint">1マス＝1件。10月は基準日までの受付分です。</p></div>
      <table class="d-unit-table"><caption class="d-vh">月別の受付件数</caption><tbody>${join_(d.months, (mo) => `<tr><th scope="row">${esc(mo.label)}</th><td>${units(mo.count, d.monthMax)}<span class="d-unit-n">${mo.count}件</span></td></tr>`)}</tbody></table>
    </section>
    <section class="d-panel" aria-labelledby="types">
      <div class="d-panel__head"><h2 class="d-h2" id="types">申請種別ごとの受付件数</h2><p class="d-hint">1マス＝1件。種別名から一覧へ移ります。</p></div>
      <table class="d-unit-table d-unit-table--types"><caption class="d-vh">申請種別ごとの受付件数</caption><tbody>${join_(d.types, (t) => `<tr><th scope="row"><a href="#" class="d-link">${esc(t.type)}</a></th><td>${units(t.count, typeMax)}<span class="d-unit-n">${t.count}件<small>${esc(t.shareText)}</small></span></td></tr>`)}</tbody></table>
    </section>
  </div>
</main>
${dFooter()}`,
  });
}

const FILES = {
  'c-list.html': cList(),
  'c-form.html': cForm(),
  'c-dashboard.html': cDashboard(),
  'd-list.html': dList(),
  'd-form.html': dForm(),
  'd-dashboard.html': dDashboard(),
};
for (const [name, html] of Object.entries(FILES)) writeFileSync(join(OUT, name), html);
console.log(`wrote ${Object.keys(FILES).length} files to ${OUT}`);
