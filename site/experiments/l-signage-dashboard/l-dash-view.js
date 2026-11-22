// L「標示盤」（仮称）ダッシュボードの画面の組み立て（DOM に依存しない）。視覚の基準は docs/dashboard-comparison/images/l-dashboard-1280.png。
// 指標はドット文字の盤面、月別・種別は1目盛り＝1件の点灯（右端に実数）、状態は処理待ち／処理完了の区分で上段の指標と結ぶ。値は buildDashboardModel のまま。

import { html, raw } from '../../assets/js/html.js';
import { conditionFields, statusGroups } from '../shared/dashboard-parts.js';

/* ドット文字（7段）：数字・小数点・ダッシュ。幅は字ごとに持つ */
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
  '.': ['00', '00', '00', '00', '00', '11', '11'],
  '—': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'], // 消灯の桁（1桁の値も盤面の幅をそろえる。0 で埋めると「08件」と読めてしまう）
};
function dots(value) {
  const chars = String(value).padStart(2, ' ').split('');
  let x = 0;
  const circles = [];
  for (const c of chars) {
    GLYPHS[c].forEach((row, y) => [...row].forEach((on, i) => circles.push(`<circle cx="${x + i + 0.5}" cy="${y + 0.5}" r="0.38" class="${on === '1' ? 'on' : 'off'}"/>`)));
    x += GLYPHS[c][0].length + 1;
  }
  const w = Math.max(1, x - 1);
  return html`<svg class="ld-dots" viewBox="0 0 ${w} 7" style="--w:${w}" aria-hidden="true" focusable="false">${raw(circles.join(''))}</svg>`;
}

/** 1目盛り＝1件の点灯。目盛りの数は最大値を5の倍数に切り上げたもの（件数が変わっても1目盛りは1件のまま）。 */
function ticks(n, max) {
  const total = Math.max(5, Math.ceil(max / 5) * 5);
  return html`<span class="ld-ticks" style="--n:${total}" aria-hidden="true">${raw(Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join(''))}</span>`;
}

function kpis(d) {
  return html`<dl class="ld-board" aria-label="受付と処理の概況">
    ${d.kpis.map((k) => {
      // 処理完了率は「73.2%」のような文字列で来るので、ドット文字は数値の部分だけにして「%」は単位として添える
      const pct = String(k.value).endsWith('%');
      const num = pct ? String(k.value).slice(0, -1) : k.value;
      return html`<div class="ld-kpi ld-kpi--${k.key}">
        <dt>${k.label}</dt>
        <dd class="ld-kpi__value">${dots(num)}<span class="ld-kpi__unit">${pct ? '%' : k.unit}</span><span class="ld-vh"><span data-kpi="${k.key}">${k.value}</span>${k.unit}</span></dd>
        <dd class="ld-kpi__note">${k.note}</dd>
      </div>`;
    })}
  </dl>`;
}

function months(d) {
  return html`<section class="ld-sec" aria-labelledby="ld-months"><div class="ld-sec__head"><h2 id="ld-months">月別の受付件数</h2><p>1目盛り＝1件　単位　件</p></div>
    <table class="ld-table ld-table--months"><caption class="ld-vh">月別の受付件数</caption>
      <thead class="ld-vh"><tr><th scope="col">月</th><th scope="col">目盛り</th><th scope="col" class="ld-num">件数</th></tr></thead>
      <tbody>${d.months.map((m) => html`<tr><th scope="row">${m.label}</th><td>${ticks(m.count, d.monthMax)}</td><td class="ld-num" data-month="${m.key}">${m.count}</td></tr>`)}</tbody>
    </table></section>`;
}

function statuses(d) {
  return html`<section class="ld-sec" aria-labelledby="ld-status"><div class="ld-sec__head"><h2 id="ld-status">処理状態別の内訳</h2></div>
    <table class="ld-table ld-table--status"><caption class="ld-vh">処理状態別の内訳（処理待ち・処理完了の区分つき）</caption>
      <thead><tr><th scope="col">区分</th><th scope="col">処理状態</th><th scope="col" class="ld-num">件数</th><th scope="col" class="ld-num">割合</th></tr></thead>
      ${statusGroups(d).map(
        (g) => html`<tbody class="ld-group ld-group--${g.key}">${g.items.map(
          (s, i) => html`<tr>${i === 0 ? html`<th scope="rowgroup" rowspan="${g.items.length}" class="ld-group__label">${g.label}</th>` : ''}<th scope="row">${s.label}</th><td class="ld-num" data-status="${s.value}">${s.count}</td><td class="ld-num ld-share" data-status-share="${s.value}">${s.shareText}</td></tr>`,
        )}</tbody>`,
      )}
    </table></section>`;
}

function types(d) {
  const max = d.types[0]?.count ?? 0;
  return html`<section class="ld-sec" aria-labelledby="ld-types"><div class="ld-sec__head"><h2 id="ld-types">申請種別別の内訳</h2></div>
    <table class="ld-table ld-table--types"><caption class="ld-vh">申請種別別の内訳</caption>
      <thead><tr><th scope="col">申請種別</th><th scope="col"><span class="ld-vh">目盛り</span></th><th scope="col" class="ld-num">件数</th><th scope="col" class="ld-num">割合</th></tr></thead>
      <tbody>${d.types.length
        ? d.types.map((t) => html`<tr><th scope="row">${t.type}</th><td>${ticks(t.count, max)}</td><td class="ld-num" data-type-count="${t.type}">${t.count}</td><td class="ld-num ld-share" data-type-share="${t.type}">${t.shareText}</td></tr>`)
        : html`<tr><td colspan="4" class="ld-empty">この条件に該当する申請はありません。</td></tr>`}</tbody>
    </table></section>`;
}

export function view(d) {
  return html`
    <div class="ld-head">
      <div><h1 class="ld-title">ダッシュボード</h1><p class="ld-ref">基準日　${d.refDate}<span>${d.period.rangeText}・${d.dept || 'すべての担当課'}</span></p></div>
      <form class="ld-cond" aria-label="集計の条件" onsubmit="return false">${conditionFields(d, 'ld')}</form>
    </div>
    ${kpis(d)}
    <div class="ld-grid">
      <div class="ld-col">${months(d)}${statuses(d)}</div>
      ${types(d)}
    </div>`;
}
