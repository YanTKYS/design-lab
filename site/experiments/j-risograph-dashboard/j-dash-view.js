// J「二色刷り」（仮称）ダッシュボードの画面の組み立て（DOM に依存しない）。視覚の基準は docs/dashboard-comparison/images/j-dashboard-1280.png。
// 青の版に数値と棒、ピンクの版は版ずれ・網点の飾りに限る。値はすべて buildDashboardModel のまま表示する。

import { html } from '../../assets/js/html.js';
import { STATUS_MARK, conditionFields, shareRatio } from '../shared/dashboard-parts.js';

const bar = (ratio) => html`<span class="jd-mini" aria-hidden="true"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>`;

const table = (caption, head, rows, empty) => html`<table class="jd-table"><caption class="jd-vh">${caption}</caption>
  <thead><tr><th scope="col">${head}</th><th scope="col"><span class="jd-vh">割合の棒</span></th><th scope="col" class="jd-num">件数</th><th scope="col" class="jd-num">割合</th></tr></thead>
  <tbody>${rows.length ? rows : html`<tr><td colspan="4" class="jd-empty">${empty}</td></tr>`}</tbody></table>`;

export function view(d) {
  const statusRows = d.statuses.map((s) => html`<tr><th scope="row"><span aria-hidden="true">${STATUS_MARK[s.value]} </span>${s.label}</th><td>${bar(s.ratio)}</td><td class="jd-num" data-status="${s.value}">${s.count}</td><td class="jd-num jd-share" data-status-share="${s.value}">${s.shareText}</td></tr>`);
  const typeRows = d.types.map((t) => html`<tr><th scope="row">${t.type}</th><td>${bar(shareRatio(t))}</td><td class="jd-num" data-type-count="${t.type}">${t.count}</td><td class="jd-num jd-share" data-type-share="${t.type}">${t.shareText}</td></tr>`);
  return html`
    <div class="jd-head">
      <div><h1 class="jd-title" data-text="ダッシュボード">ダッシュボード</h1><p class="jd-ref">基準日　${d.refDate}<span>${d.period.rangeText}・${d.dept || 'すべての担当課'}</span></p></div>
      <form class="jd-cond" aria-label="集計の条件" onsubmit="return false">${conditionFields(d, 'jd')}</form>
    </div>
    <dl class="jd-kpis" aria-label="受付と処理の概況">
      <span class="jd-kpis__dots" aria-hidden="true"></span>
      ${d.kpis.map((k) => html`<div class="jd-kpi"><dt>${k.label}</dt><dd class="jd-kpi__value"><b data-kpi="${k.key}">${k.value}</b>${k.unit}</dd><dd class="jd-kpi__note">${k.note}</dd></div>`)}
    </dl>
    <section class="jd-months" aria-labelledby="jd-months-title">
      <div class="jd-months__head"><h2 class="jd-chapter" id="jd-months-title">月別の受付件数</h2><p>単位　件</p></div>
      <ol class="jd-cols">${d.months.map((m) => html`<li><span class="jd-cols__track" aria-hidden="true"><b data-month="${m.key}">${m.count}</b><span class="jd-cols__bar" style="--r:${m.ratio}"></span></span><span class="jd-cols__label">${m.label}</span><span class="jd-vh">${m.count}件</span></li>`)}</ol>
    </section>
    <div class="jd-grid">
      <section aria-labelledby="jd-status-title"><h2 class="jd-chapter" id="jd-status-title">処理状態別の内訳</h2>${table('処理状態別の内訳', '処理状態', statusRows, '')}</section>
      <section class="jd-card" aria-labelledby="jd-types-title"><h2 class="jd-chapter" id="jd-types-title">申請種別別の内訳</h2>${table('申請種別別の内訳', '申請種別', typeRows, 'この条件に該当する申請はありません。')}</section>
    </div>`;
}
