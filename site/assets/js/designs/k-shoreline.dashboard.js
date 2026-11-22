// 汀線：ダッシュボード。月別は、各月の点・縦の線・点の真上の件数が実測の値で、滑らかな線と面は推移の目安。
// 集計・割合・一覧へ引き継ぐ条件は共通の dashboard.js（buildDashboardModel）と ctx.listHref を使う。
// 状態別・種別別の細い棒は、隣に書く割合と同じ尺度（受付総数に対する構成比）で描く。
import { html, raw } from '../html.js';
import { kpiMark, listLink, statusMark, statusShareMark, typeMark, typeShareMark } from './dash-common.js';
import { STATUS_MARK } from './k-shoreline.js';

/** 割合（受付総数に対する構成比）を棒の長さ 0〜1 にする。共通モデルの tenths（0.1% 単位、0件なら null）をそのまま使う。 */
const share = (item) => (item.tenths == null ? 0 : item.tenths / 1000);
const bar = (ratio) => html`<span class="kd-mini" aria-hidden="true"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>`;

/**
 * 月の点の位置（横は各月の列の中央、縦は件数に比例）。0件の月は基準線（y=0）に置き、底上げしない。
 * 最多の月を 78%（上に件数を書く余白を残す）とする比例の目盛り。
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

function kpis(d, ctx) {
  return html`<details class="kd-defs">
      <summary>集計の定義</summary>
      <dl>${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}</dl>
      <p>基準日：${d.refDate}（架空のデータ）</p>
    </details>
    <dl class="kd-kpis" aria-label="受付と処理の概況">
      ${d.kpis.map(
        // 0件の指標は内訳の0件の行と同じく件数だけを示し、空の一覧へのリンクは置かない
        (k) => html`<div class="kd-kpi">
          <dt>${k.label}</dt>
          <dd class="kd-kpi__value"><b ${kpiMark(k.key)}>${k.value}</b>${k.unit}</dd>
          <dd class="kd-kpi__note">${k.note}</dd>
          ${k.link && Number(k.value) > 0 ? html`<dd class="kd-kpi__link">${listLink(ctx, k.link, '一覧を見る ›', { cls: 'kl-link', hint: `${k.label} ${k.value}件` })}</dd>` : ''}
        </div>`,
      )}
    </dl>`;
}

const sectionHead = (ctx, key, title, extra = '') => html`<div class="kd-sec__head"><h3 id="${ctx.uid}-kd-${key}">${title}</h3>${extra}</div>`;

function months(d, ctx) {
  const pts = points(d.months);
  const line = curve(pts);
  const area = `${line}L${pts.at(-1).x.toFixed(2)} 100L${pts[0].x.toFixed(2)} 100Z`;
  const clip = `${ctx.uid}-kd-clip`; // 左右比較で衝突しない ID
  return html`<section class="kd-sec" aria-labelledby="${ctx.uid}-kd-months">
    ${sectionHead(ctx, 'months', '月別の受付件数', html`<p>単位　件</p>`)}
    <div class="kd-chart">
      <svg class="kd-chart__shore" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><clipPath id="${clip}"><path d="${raw(area)}" /></clipPath></defs>
        <path class="kd-chart__area" d="${raw(area)}" />
        <g clip-path="url(#${clip})">${[10, 20, 30, 40].map((dy) => html`<path class="kd-chart__contour" d="${raw(line)}" transform="translate(0 ${dy})" />`)}</g>
        <path class="kd-chart__line" d="${raw(line)}" />
      </svg>
      <ol class="kd-chart__points" aria-label="月別の受付件数（${d.period.rangeText}）">
        ${pts.map((p) => html`<li style="left:${p.x.toFixed(2)}%;--y:${p.y.toFixed(2)}%"><span class="kd-chart__stem" aria-hidden="true"></span><span class="kd-chart__dot" aria-hidden="true"></span><b data-month="${p.m.key}">${p.m.count}</b><span class="kd-chart__month">${p.m.label}</span><span class="visually-hidden">${p.m.count}件</span></li>`)}
      </ol>
    </div>
    <p class="kd-note">点が各月の件数です。線と面は推移の目安で、月の途中の値を示すものではありません。</p>
  </section>`;
}

const tableHead = (head) => html`<thead><tr><th scope="col">${head}</th><th scope="col"><span class="visually-hidden">割合の棒</span></th><th scope="col" class="kd-num">件数</th><th scope="col" class="kd-num">割合</th></tr></thead>`;

function statuses(d, ctx) {
  return html`<section class="kd-sec" aria-labelledby="${ctx.uid}-kd-status">${sectionHead(ctx, 'status', '処理状況の内訳')}
    <table class="kd-table"><caption class="visually-hidden">処理状況の内訳</caption>${tableHead('処理状態')}
      <tbody>${d.statuses.map(
        (s) => html`<tr>
          <th scope="row"><span aria-hidden="true">${STATUS_MARK[s.value]} </span>${s.count ? listLink(ctx, s.link, s.label, { cls: 'kl-link', hint: `${s.label} ${s.count}件の一覧` }) : s.label}</th>
          <td>${bar(s.ratio)}</td><td class="kd-num" ${statusMark(s.value)}>${s.count}</td><td class="kd-num kd-share" ${statusShareMark(s.value)}>${s.shareText}</td>
        </tr>`,
      )}</tbody></table></section>`;
}

function types(d, ctx) {
  return html`<section class="kd-sec kd-panel" aria-labelledby="${ctx.uid}-kd-types">${sectionHead(ctx, 'types', '申請種別の内訳')}
    <table class="kd-table"><caption class="visually-hidden">申請種別の内訳</caption>${tableHead('申請種別')}
      <tbody>${d.types.length
        ? d.types.map(
            (t) => html`<tr>
              <th scope="row">${listLink(ctx, t.link, t.type, { cls: 'kl-link', hint: `${t.type} ${t.count}件の一覧` })}</th>
              <td>${bar(share(t))}</td><td class="kd-num" ${typeMark(t.type)}>${t.count}</td><td class="kd-num kd-share" ${typeShareMark(t.type)}>${t.shareText}</td>
            </tr>`,
          )
        : html`<tr><td colspan="4" class="kd-empty">この条件に該当する申請はありません。</td></tr>`}</tbody></table></section>`;
}

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  return html`${kpis(d, ctx)}
    <div class="kd-grid">
      <div class="kd-col">${months(d, ctx)}${statuses(d, ctx)}</div>
      ${types(d, ctx)}
    </div>`;
}
