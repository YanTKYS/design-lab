// K「汀線」（仮称）ダッシュボードの画面の組み立て（DOM に依存しない）。視覚の基準は docs/dashboard-comparison/images/k-dashboard-1280.png。
// 月別は、月ごとの点・縦の目盛り線・件数で離散値を示し、滑らかな線と面は推移の目安として淡く添える。値は buildDashboardModel のまま。

import { html, raw } from '../../assets/js/html.js';
import { STATUS_MARK, conditionFields, shareRatio } from '../shared/dashboard-parts.js';

const bar = (ratio) => html`<span class="kd-mini" aria-hidden="true"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>`;

/**
 * 月の点の位置（横は各月の列の中央、縦は件数に比例）。0件の月は基準線（y=0）に置き、点・縦の線・面がそこから立ち上がる。
 * 最多の月を 78%（上に件数を書く余白を残す）とする比例の目盛りで、底上げはしない。
 */
export const points = (months) => months.map((m, i) => ({ x: ((i + 0.5) / months.length) * 100, y: m.ratio * 78, m }));

/**
 * 点を通る滑らかな曲線（単調3次補間：Fritsch–Carlson）。SVG の座標は上が 0。
 * 隣り合う2か月の値の範囲から上にも下にもはみ出さないので、点のない所に山や谷（実在しない値）を描かない。
 */
export function curve(pts) {
  const p = pts.map((q) => [q.x, 100 - q.y]);
  if (p.length === 1) return `M0 ${p[0][1]}H100`;
  const n = p.length;
  const slope = p.slice(0, -1).map((a, i) => (p[i + 1][1] - a[1]) / (p[i + 1][0] - a[0]));
  const tangent = p.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    const [a, b] = [slope[i - 1], slope[i]];
    if (a * b <= 0) return 0; // 山・谷の点では水平にして、点より先へ行かない
    return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(a + b) / 4);
  });
  const f = (v) => v.toFixed(2);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = (p[i + 1][0] - p[i][0]) / 3;
    d += `C${f(p[i][0] + h)} ${f(p[i][1] + tangent[i] * h)} ${f(p[i + 1][0] - h)} ${f(p[i + 1][1] - tangent[i + 1] * h)} ${f(p[i + 1][0])} ${f(p[i + 1][1])}`;
  }
  return d;
}

function months(d) {
  const pts = points(d.months);
  const line = curve(pts);
  const first = pts[0].x.toFixed(2);
  const last = pts.at(-1).x.toFixed(2);
  const area = `${line}L${last} 100L${first} 100Z`;
  return html`<section class="kd-sec" aria-labelledby="kd-months">
    <div class="kd-sec__head"><h2 id="kd-months">月別の受付件数</h2><p>単位　件</p></div>
    <div class="kd-chart">
      <svg class="kd-chart__shore" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><clipPath id="kd-clip"><path d="${raw(area)}" /></clipPath></defs>
        <path class="kd-chart__area" d="${raw(area)}" />
        <g clip-path="url(#kd-clip)">${[10, 20, 30, 40].map((dy) => html`<path class="kd-chart__contour" d="${raw(line)}" transform="translate(0 ${dy})" />`)}</g>
        <path class="kd-chart__line" d="${raw(line)}" />
      </svg>
      <ol class="kd-chart__points" aria-label="月別の受付件数">
        ${pts.map((p) => html`<li style="left:${p.x.toFixed(2)}%;--y:${p.y.toFixed(2)}%"><span class="kd-chart__stem" aria-hidden="true"></span><span class="kd-chart__dot" aria-hidden="true"></span><b data-month="${p.m.key}">${p.m.count}</b><span class="kd-chart__month">${p.m.label}</span><span class="kd-vh">${p.m.count}件</span></li>`)}
      </ol>
    </div>
    <p class="kd-note">点が各月の件数です。線と面は推移の目安で、月の途中の値を示すものではありません。</p>
  </section>`;
}

const table = (caption, head, rows, empty) => html`<table class="kd-table"><caption class="kd-vh">${caption}</caption>
  <thead><tr><th scope="col">${head}</th><th scope="col"><span class="kd-vh">割合の棒</span></th><th scope="col" class="kd-num">件数</th><th scope="col" class="kd-num">割合</th></tr></thead>
  <tbody>${rows.length ? rows : html`<tr><td colspan="4" class="kd-empty">${empty}</td></tr>`}</tbody></table>`;

export function view(d) {
  const statusRows = d.statuses.map((s) => html`<tr><th scope="row"><span aria-hidden="true">${STATUS_MARK[s.value]} </span>${s.label}</th><td>${bar(s.ratio)}</td><td class="kd-num" data-status="${s.value}">${s.count}</td><td class="kd-num kd-share" data-status-share="${s.value}">${s.shareText}</td></tr>`);
  const typeRows = d.types.map((t) => html`<tr><th scope="row">${t.type}</th><td>${bar(shareRatio(t))}</td><td class="kd-num" data-type-count="${t.type}">${t.count}</td><td class="kd-num kd-share" data-type-share="${t.type}">${t.shareText}</td></tr>`);
  return html`
    <div class="kd-hero">
      <div class="kd-hero__text">
        <div class="kd-hero__title"><h1 class="kd-title">ダッシュボード</h1><p class="kd-ref">基準日　${d.refDate}<span>${d.period.rangeText}・${d.dept || 'すべての担当課'}</span></p></div>
        <form class="kd-cond" aria-label="集計の条件" onsubmit="return false">${conditionFields(d, 'kd')}</form>
      </div>
      <img class="kd-hero__art" src="k-shore.svg" alt="" width="560" height="154" />
    </div>
    <div class="kd-body">
      <dl class="kd-kpis" aria-label="受付と処理の概況">
        ${d.kpis.map((k) => html`<div class="kd-kpi"><dt>${k.label}</dt><dd class="kd-kpi__value"><b data-kpi="${k.key}">${k.value}</b>${k.unit}</dd><dd class="kd-kpi__note">${k.note}</dd></div>`)}
      </dl>
      <div class="kd-grid">
        <div class="kd-col">${months(d)}
          <section class="kd-sec" aria-labelledby="kd-status"><div class="kd-sec__head"><h2 id="kd-status">処理状態別の内訳</h2></div>${table('処理状態別の内訳', '処理状態', statusRows, '')}</section>
        </div>
        <section class="kd-sec kd-panel" aria-labelledby="kd-types"><div class="kd-sec__head"><h2 id="kd-types">申請種別別の内訳</h2></div>${table('申請種別別の内訳', '申請種別', typeRows, 'この条件に該当する申請はありません。')}</section>
      </div>
    </div>`;
}
