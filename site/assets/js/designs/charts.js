// ダッシュボードのグラフ部品。外部ライブラリは使わず、HTML/CSS と SVG だけで描く。
//
// - 棒グラフ（columns / hbars / stacked）は ol・ul の入れ子にし、ラベルと値を実際のテキストとして持つ。
//   見た目が崩れても、スクリーンリーダーでも「4月 6件」のように読める。
// - 円（donut）と折れ線（line）は SVG。値は必ず隣のテキスト（凡例・ラベル列）にも出す。
// - 構造のスタイルは assets/css/charts.css。色・太さ・丸みはデザインごとの CSS 変数とクラスで変える。
// - item.marker = [属性名, 値] は、値を出力するテキストに付ける印（テストで集計値を読み取るため）。

import { attr, html } from '../html.js';

const unit = (text) => (text ? html`<span class="visually-hidden">${text}</span>` : '');
const marked = (item) => html`<span ${item.marker ? attr(item.marker[0], item.marker[1]) : ''}>${item.value}</span>`;
const tone = (item) => (item.tone ? `tone-${item.tone}` : '');
const ratio = (item) => Math.max(0, Math.min(1, item.ratio)).toFixed(4);

/** 縦棒グラフ。items: { label, value, ratio(0〜1), marker, tone } */
export function columns(items, { cls = '', title = '', unitText = '件' } = {}) {
  return html`
    <ol class="chart-columns ${cls}" ${attr('aria-label', title || null)}>
      ${items.map(
        (i) => html`
          <li class="chart-columns__item ${tone(i)}" style="--r: ${ratio(i)}">
            <span class="chart-columns__label">${i.label}</span>
            <span class="chart-columns__track">
              <span class="chart-columns__value">${marked(i)}${unit(unitText)}</span>
              <span class="chart-columns__bar" aria-hidden="true"></span>
            </span>
          </li>`,
      )}
    </ol>`;
}

/**
 * 横棒グラフ。items: { label | labelHtml, value, ratio, marker, tone, share, shareMarker }
 * share があれば値の右に割合を出す。
 */
export function hbars(items, { cls = '', title = '', unitText = '件' } = {}) {
  return html`
    <ul class="chart-hbars ${cls}" ${attr('aria-label', title || null)}>
      ${items.map(
        (i) => html`
          <li class="chart-hbars__item ${tone(i)}" style="--r: ${ratio(i)}">
            <span class="chart-hbars__label">${i.labelHtml ?? i.label}</span>
            <span class="chart-hbars__track" aria-hidden="true"><span class="chart-hbars__bar"></span></span>
            <span class="chart-hbars__value">${marked(i)}${unit(unitText)}</span>
            ${i.share != null
              ? html`<span class="chart-hbars__share"><span ${i.shareMarker ? attr(i.shareMarker[0], i.shareMarker[1]) : ''}>${i.share}</span></span>`
              : ''}
          </li>`,
      )}
    </ul>`;
}

/** 100% 積み上げの横棒。件数 0 の項目は描かない（凡例・表には残す）。 */
export function stacked(items, { cls = '', title = '' } = {}) {
  const summary = items.map((i) => `${i.label}${i.value}件`).join('、');
  return html`
    <div class="chart-stacked ${cls}" role="img" aria-label="${title ? `${title}：` : ''}${summary}">
      ${items
        .filter((i) => i.ratio > 0)
        .map(
          (i) => html`<span class="chart-stacked__seg ${tone(i)}" style="--r: ${ratio(i)}" title="${i.label} ${i.value}件" aria-hidden="true"><span class="chart-stacked__text">${i.value}</span></span>`,
        )}
    </div>`;
}

/** 円グラフ（ドーナツ）。items: { label, value, count, tone }。中央に合計などを出せる。 */
export function donut(items, { cls = '', size = 160, thickness = 28, center = null, title = '' } = {}) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = items
    .filter((i) => i.count > 0)
    .map((i) => {
      const len = (i.count / total) * c;
      const arc = html`<circle class="chart-donut__arc ${tone(i)}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${thickness}" stroke-dasharray="${len.toFixed(3)} ${(c - len).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" />`;
      offset += len;
      return arc;
    });
  const summary = items.map((i) => `${i.label}${i.value}`).join('、');
  return html`
    <svg class="chart-donut ${cls}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${title ? `${title}：` : ''}${summary}">
      <title>${title}</title>
      <desc>${summary}</desc>
      <circle class="chart-donut__track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${thickness}" />
      <g transform="rotate(-90 ${size / 2} ${size / 2})">${arcs}</g>
      ${center
        ? html`<text class="chart-donut__center" x="50%" y="48%" text-anchor="middle" dominant-baseline="middle">${center.value}</text>
            <text class="chart-donut__caption" x="50%" y="66%" text-anchor="middle" dominant-baseline="middle">${center.caption}</text>`
        : ''}
    </svg>`;
}

/**
 * 折れ線グラフ。線と点だけを SVG で描き、月と値は下の ol にテキストとして並べる。
 * items: { label, value, ratio, marker }
 */
export function line(items, { cls = '', title = '', unitText = '件' } = {}) {
  const n = items.length;
  const pts = items.map((i, k) => ({ x: k * 100 + 50, y: 96 - ratio(i) * 88 }));
  return html`
    <div class="chart-line ${cls}" ${title ? html`role="group"` : ''} ${attr('aria-label', title || null)}>
      <svg class="chart-line__svg" viewBox="0 0 ${n * 100} 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <line class="chart-line__base" x1="0" y1="96" x2="${n * 100}" y2="96" vector-effect="non-scaling-stroke" />
        <polyline class="chart-line__path" fill="none" points="${pts.map((p) => `${p.x},${p.y.toFixed(2)}`).join(' ')}" vector-effect="non-scaling-stroke" />
        ${pts.map((p) => html`<line class="chart-line__dot" x1="${p.x}" y1="${p.y.toFixed(2)}" x2="${p.x}" y2="${p.y.toFixed(2)}" vector-effect="non-scaling-stroke" />`)}
      </svg>
      <ol class="chart-line__labels" ${attr('aria-label', title ? `${title}（月ごとの値）` : null)}>
        ${items.map((i) => html`<li><span class="chart-line__label">${i.label}</span><span class="chart-line__value">${marked(i)}${unit(unitText)}</span></li>`)}
      </ol>
    </div>`;
}
