// H′「折本」（仮称）ダッシュボードの画面の組み立て（DOM に依存しない）。視覚の基準は docs/dashboard-comparison/images/h-prime-dashboard-1280.png。
// 指標は右端の受付件数から左へ（DOM の順＝右から）、月別は左から右へ時系列。値はすべて buildDashboardModel のまま表示する。

import { html } from '../../assets/js/html.js';
import { STATUS_MARK, conditionFields } from '../shared/dashboard-parts.js';

const bar = (ratio) => html`<span class="hd-mini" aria-hidden="true"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>`;

function kpis(d) {
  return html`<p class="hd-dir" aria-hidden="true">指標は右端から ←</p>
    <dl class="hd-kpis" aria-label="受付と処理の概況（右端の受付件数から）">
      ${d.kpis.map(
        (k) => html`<div class="hd-kpi hd-kpi--${k.key}">
          <dt class="hd-kpi__title">${k.label}</dt>
          <dd class="hd-kpi__value"><b data-kpi="${k.key}">${k.value}</b>${k.unit}</dd>
          <dd class="hd-kpi__note">${k.note}</dd>
        </div>`,
      )}
    </dl>`;
}

function months(d) {
  return html`<section class="hd-sec hd-sec--months" aria-labelledby="hd-months">
    <div class="hd-sec__body">
      <ol class="hd-cols" aria-label="月別の受付件数（左から月の順）">
        ${d.months.map((m) => html`<li><span class="hd-cols__track" aria-hidden="true"><b data-month="${m.key}">${m.count}</b><span class="hd-cols__bar" style="--r:${m.ratio}"></span></span><span class="hd-cols__label">${m.label}</span><span class="hd-vh">${m.count}件</span></li>`)}
      </ol>
      <p class="hd-axis"><span>月の順 →</span><span>単位　件</span></p>
    </div>
    <h2 class="hd-sec__title" id="hd-months">月別の受付件数</h2>
  </section>`;
}

const table = (caption, head, rows, empty) => html`<table class="hd-table"><caption class="hd-vh">${caption}</caption>
  <thead><tr><th scope="col">${head}</th><th scope="col"><span class="hd-vh">割合の棒</span></th><th scope="col" class="hd-num">件数</th><th scope="col" class="hd-num">割合</th></tr></thead>
  <tbody>${rows.length ? rows : html`<tr><td colspan="4" class="hd-empty">${empty}</td></tr>`}</tbody></table>`;

function statuses(d) {
  const rows = d.statuses.map((s) => html`<tr><th scope="row"><span aria-hidden="true">${STATUS_MARK[s.value]} </span>${s.label}</th><td>${bar(s.ratio)}</td><td class="hd-num" data-status="${s.value}">${s.count}</td><td class="hd-num hd-share" data-status-share="${s.value}">${s.shareText}</td></tr>`);
  return html`<section class="hd-sec" aria-labelledby="hd-status"><div class="hd-sec__body">${table('処理状態別の内訳', '処理状態', rows, '')}</div><h2 class="hd-sec__title" id="hd-status">処理状態別の内訳</h2></section>`;
}

function types(d) {
  const rows = d.types.map((t) => html`<tr><th scope="row">${t.type}</th><td>${bar(t.ratio)}</td><td class="hd-num" data-type-count="${t.type}">${t.count}</td><td class="hd-num hd-share" data-type-share="${t.type}">${t.shareText}</td></tr>`);
  return html`<section class="hd-sec" aria-labelledby="hd-types"><div class="hd-sec__body">${table('申請種別別の内訳', '申請種別', rows, 'この条件に該当する申請はありません。')}</div><h2 class="hd-sec__title" id="hd-types">申請種別別の内訳</h2></section>`;
}

export function view(d) {
  return html`
    <div class="hd-head">
      <div><h1 class="hd-title">ダッシュボード</h1><p class="hd-ref">基準日　${d.refDate}<span>${d.period.rangeText}・${d.dept || 'すべての担当課'}</span></p></div>
      <form class="hd-cond" aria-label="集計の条件" onsubmit="return false">${conditionFields(d, 'hd')}</form>
    </div>
    ${kpis(d)}
    <div class="hd-grid">
      <div class="hd-col">${months(d)}${statuses(d)}</div>
      <div class="hd-col">${types(d)}</div>
    </div>`;
}
