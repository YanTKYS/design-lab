// 条件パネル＋概要・可視化のサーフェス。数値・遷移は共通ビューモデルを使用する。
import { html } from '../html.js';
import { icon, TONE_ICONS } from '../icons.js';
import { columns, donut, hbars } from './charts.js';
import { kpiMark, listLink, statusMark, statusShareMark } from './dash-common.js';

function filters(d, ctx) {
  const select = (name, label, options) =>
    html`<label class="m3-outlined-field" for="${ctx.uid}-m3-${name}"
      ><span>${label}</span
      ><select id="${ctx.uid}-m3-${name}" data-bind="${name}">
        ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
      </select></label
    >`;
  return html`<aside class="m3-dash-filters" aria-label="集計条件">
    <h3>${icon('settings')}集計条件</h3>
    ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
    <button type="button" class="m3-button m3-button--outlined" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>
      条件をリセット
    </button>
    <details class="m3-definitions">
      <summary>集計の定義と基準日</summary>
      <dl>
        ${d.definitions.map(
          (x) =>
            html`<div>
              <dt>${x.term}</dt>
              <dd>${x.text}</dd>
            </div>`,
        )}
      </dl>
      <p>基準日：${d.refDate}（架空のデータ）</p>
    </details>
  </aside>`;
}

function kpis(d, ctx) {
  const metric = (k) =>
    html`<p class="m3-kpi__label">${k.label}</p>
      <p class="m3-kpi__value"><span ${kpiMark(k.key)}>${k.value}</span><small>${k.unit}</small></p>
      <p class="m3-support">${k.note}</p>
      ${k.link
        ? listLink(ctx, k.link, '一覧を表示', {
            cls: 'm3-button',
            hint: `${k.label} ${k.value}件`,
          })
        : ''}`;
  return html`<section class="m3-overview" aria-label="主な指標">
    <div class="m3-kpi m3-kpi--hero">${icon('inbox', { size: 32 })}${metric(d.kpis[0])}</div>
    <div class="m3-metrics">${d.kpis.slice(1).map((k) => html`<div class="m3-kpi">${metric(k)}</div>`)}</div>
  </section>`;
}

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  const months = d.months.map((m) => ({
    label: m.label,
    value: m.count,
    ratio: m.ratio,
    marker: ['data-month', m.key],
  }));
  const types = d.types.map((t) => ({
    labelHtml: listLink(ctx, t.link, t.type),
    value: t.count,
    ratio: t.ratio,
    marker: ['data-type-count', t.type],
    share: t.shareText,
    shareMarker: ['data-type-share', t.type],
  }));
  return html`<div class="m3-page-head">
      <div>
        <h2 tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
        <p class="m3-support">${d.scopeText}</p>
      </div>
      ${listLink(ctx, {}, html`${icon('list')}申請一覧を開く`, {
        cls: 'm3-button m3-button--filled',
      })}
    </div>
    <div class="m3-dash-layout">
      ${filters(d, ctx)}
      <div class="m3-dash-main">
        ${kpis(d, ctx)}
        <section class="m3-surface m3-chart-panel" aria-labelledby="${ctx.uid}-m3-month">
          <h3 id="${ctx.uid}-m3-month">月別の受付件数</h3>
          <p class="m3-support">${d.period.rangeText}・合計 ${d.total}件</p>
          ${columns(months, { title: '月別の受付件数' })}
        </section>
        <div class="m3-chart-grid">
          <section class="m3-surface m3-chart-panel" aria-labelledby="${ctx.uid}-m3-status">
            <h3 id="${ctx.uid}-m3-status">処理状況</h3>
            ${d.total
              ? donut(
                  d.statuses.map((s) => ({
                    ...s,
                    label: s.label,
                    value: `${s.count}件（${s.shareText}）`,
                  })),
                  {
                    title: '処理状態別の件数',
                    center: { value: d.total, caption: '受付件数' },
                  },
                )
              : html`<p>該当する申請はありません</p>`}
            <ul class="m3-status-list">
              ${d.statuses.map(
                (s) =>
                  html`<li>
                    <span class="m3-status tone-${s.tone}">${icon(TONE_ICONS[s.tone], { size: 16 })}${s.label}</span
                    ><span><span ${statusMark(s.value)}>${s.count}</span>件</span
                    ><span ${statusShareMark(s.value)}>${s.shareText}</span>${s.count
                      ? listLink(ctx, s.link, '表示', {
                          hint: `${s.label} ${s.count}件の一覧`,
                        })
                      : html`<span></span>`}
                  </li>`,
              )}
            </ul>
          </section>
          <section class="m3-surface m3-chart-panel" aria-labelledby="${ctx.uid}-m3-types">
            <h3 id="${ctx.uid}-m3-types">申請種別別の件数</h3>
            <p class="m3-support">件数の多い順</p>
            ${types.length ? hbars(types, { title: '申請種別別の件数' }) : html`<p>該当する申請はありません</p>`}
          </section>
        </div>
      </div>
    </div>`;
}
