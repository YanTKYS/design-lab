// 折本：ダッシュボード。指標は右端の受付件数から左へ（DOM の順＝右から）、月別は左から右への時系列。
// 集計・割合・一覧へ引き継ぐ条件は共通の dashboard.js（buildDashboardModel）と ctx.listHref を使う。
// 状態別・種別別の細い棒は、隣に書く割合と同じ尺度（受付総数に対する構成比）で描く。
import { html } from '../html.js';
import { kpiMark, listLink, statusMark, statusShareMark, typeMark, typeShareMark } from './dash-common.js';
import { STATUS_MARK } from './h-prime.js';

/** 割合（受付総数に対する構成比）を棒の長さ 0〜1 にする。共通モデルの tenths（0.1% 単位、0件なら null）をそのまま使う。 */
const share = (item) => (item.tenths == null ? 0 : item.tenths / 1000);
const bar = (ratio) => html`<span class="hd-mini" aria-hidden="true"><i style="width:${(ratio * 100).toFixed(1)}%"></i></span>`;

function conditions(d, ctx) {
  const select = (name, label, options) => html`<div class="hd-cond__field">
    <label for="${ctx.uid}-hd-${name}">${label}</label>
    <select id="${ctx.uid}-hd-${name}" data-bind="${name}">${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}</select>
  </div>`;
  return html`<div class="hd-head">
    <div class="hd-ref">
      <p>基準日　${d.refDate}</p>
      <p class="hd-ref__scope">${d.scopeText}</p>
      <details class="hd-defs">
        <summary>集計の定義</summary>
        <dl>${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}</dl>
        <p>基準日：${d.refDate}（架空のデータ）</p>
      </details>
    </div>
    <div class="hd-cond" role="group" aria-label="集計条件">
      ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
      <button type="button" class="hd-reset" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>既定に戻す</button>
    </div>
  </div>`;
}

function kpis(d, ctx) {
  return html`<p class="hd-dir" aria-hidden="true">指標は右から左へ ←</p>
    <dl class="hd-kpis" aria-label="受付と処理の概況">
      ${d.kpis.map(
        (k) => html`<div class="hd-kpi hd-kpi--${k.key}">
          <dt class="hd-kpi__title">${k.label}</dt>
          <dd class="hd-kpi__value"><b ${kpiMark(k.key)}>${k.value}</b>${k.unit}</dd>
          <dd class="hd-kpi__note">${k.note}${k.link ? html`<span class="hd-kpi__link">${listLink(ctx, k.link, '一覧を見る →', { cls: 'hd-link', hint: `${k.label} ${k.value}件` })}</span>` : ''}</dd>
        </div>`,
      )}
    </dl>`;
}

const section = (ctx, key, title, body) => html`<section class="hd-sec" aria-labelledby="${ctx.uid}-hd-${key}">
  <div class="hd-sec__body">${body}</div>
  <h3 class="hd-sec__title" id="${ctx.uid}-hd-${key}">${title}</h3>
</section>`;

function months(d, ctx) {
  return section(
    ctx,
    'months',
    '月別の受付件数',
    html`<ol class="hd-cols" aria-label="月別の受付件数（左から月の順、${d.period.rangeText}）">
        ${d.months.map(
          (m) => html`<li><span class="hd-cols__track" aria-hidden="true"><b data-month="${m.key}">${m.count}</b><span class="hd-cols__bar" style="--r:${m.ratio.toFixed(4)}"></span></span><span class="hd-cols__label">${m.label}</span><span class="visually-hidden">${m.count}件</span></li>`,
        )}
      </ol>
      <p class="hd-axis"><span>月の順 →</span><span>単位　件</span></p>`,
  );
}

const tableHead = (head) => html`<thead><tr><th scope="col">${head}</th><th scope="col"><span class="visually-hidden">割合の棒</span></th><th scope="col" class="hd-num">件数</th><th scope="col" class="hd-num">割合</th></tr></thead>`;

function statuses(d, ctx) {
  return section(
    ctx,
    'status',
    '処理状況の内訳',
    html`<table class="hd-table"><caption class="visually-hidden">処理状況の内訳</caption>${tableHead('処理状態')}
      <tbody>${d.statuses.map(
        (s) => html`<tr>
          <th scope="row"><span aria-hidden="true">${STATUS_MARK[s.value]} </span>${s.count ? listLink(ctx, s.link, s.label, { cls: 'hd-link', hint: `${s.label} ${s.count}件の一覧` }) : s.label}</th>
          <td>${bar(s.ratio)}</td><td class="hd-num" ${statusMark(s.value)}>${s.count}</td><td class="hd-num hd-share" ${statusShareMark(s.value)}>${s.shareText}</td>
        </tr>`,
      )}</tbody></table>`,
  );
}

function types(d, ctx) {
  return section(
    ctx,
    'types',
    '申請種別の内訳',
    html`<table class="hd-table"><caption class="visually-hidden">申請種別の内訳</caption>${tableHead('申請種別')}
      <tbody>${d.types.length
        ? d.types.map(
            (t) => html`<tr>
              <th scope="row">${listLink(ctx, t.link, t.type, { cls: 'hd-link', hint: `${t.type} ${t.count}件の一覧` })}</th>
              <td>${bar(share(t))}</td><td class="hd-num" ${typeMark(t.type)}>${t.count}</td><td class="hd-num hd-share" ${typeShareMark(t.type)}>${t.shareText}</td>
            </tr>`,
          )
        : html`<tr><td colspan="4" class="hd-empty">この条件に該当する申請はありません。</td></tr>`}</tbody></table>`,
  );
}

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  return html`${conditions(d, ctx)}${kpis(d, ctx)}
    <div class="hd-grid">
      <div class="hd-col">${months(d, ctx)}${statuses(d, ctx)}</div>
      <div class="hd-col">${types(d, ctx)}</div>
    </div>`;
}
