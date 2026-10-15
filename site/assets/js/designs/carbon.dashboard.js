// IBM Carbon Design System の考え方を参考にしたダッシュボード。
// 情報密度を高くし、フィルターをページ上部のツールバーにまとめ、指標は 1px の隙間だけで並べたコンパクトなタイル、
// その下にグラフとデータ表を同じグリッドへ敷き詰める。業務管理向けに、文字は 12〜14px、余白は 8px の倍数で詰める。
// 処理状況はドーナツ＋凡例テーブル（件数・割合・一覧へのリンク）、種別は小さな横棒を使う。

import { html } from '../html.js';
import { icon } from '../icons.js';
import { columns, donut, hbars } from './charts.js';
import { kpiMark, listLink, statusMark, statusShareMark } from './dash-common.js';

function toolbar(d, ctx) {
  const sel = (name, label, options) => {
    const id = `${ctx.uid}-cds-${name}`;
    return html`
      <div class="cds-select-inline">
        <label class="cds-select-inline__label" for="${id}">${label}</label>
        <div class="cds-select-inline__field">
          <select class="cds-select-inline__select" id="${id}" data-bind="${name}">
            ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
          </select>
          ${icon('chevronDown', { size: 16, stroke: 1.5, className: 'cds-select-inline__icon' })}
        </div>
      </div>`;
  };
  return html`
    <form class="cds-dash-toolbar" role="group" aria-label="集計条件">
      ${sel('period', '対象期間', d.periodOptions)} ${sel('dept', '担当課', d.deptOptions)}
      <button type="button" class="cds-btn cds-btn--ghost" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>リセット</button>
      <p class="cds-dash-toolbar__meta">基準日 ${d.refDate}</p>
    </form>`;
}

function tiles(d, ctx) {
  return html`
    <ul class="cds-kpi-row" aria-label="主な指標">
      ${d.kpis.map(
        (k) => html`
          <li class="cds-kpi">
            <p class="cds-kpi__label">${k.label}</p>
            <p class="cds-kpi__value"><span ${kpiMark(k.key)}>${k.value}</span>${k.unit ? html`<span class="cds-kpi__unit">${k.unit}</span>` : ''}</p>
            <p class="cds-kpi__note">${k.note}</p>
            ${k.link ? listLink(ctx, k.link, html`申請一覧${icon('arrowRight', { size: 16, stroke: 1.5 })}`, { cls: 'cds-kpi__link', hint: `${k.label} ${k.value}件` }) : ''}
          </li>`,
      )}
    </ul>`;
}

function monthTile(d, ctx) {
  const items = d.months.map((m) => ({ label: m.label, value: m.count, ratio: m.ratio, marker: ['data-month', m.key] }));
  return html`
    <section class="cds-tile cds-tile--wide" aria-labelledby="${ctx.uid}-cds-month">
      <h3 class="cds-tile__title" id="${ctx.uid}-cds-month">月別受付件数</h3>
      <p class="cds-tile__sub">${d.period.rangeText}（合計 ${d.total}件）</p>
      ${columns(items, { cls: 'cds-columns', title: '月別受付件数' })}
    </section>`;
}

function statusTile(d, ctx) {
  const items = d.statuses.map((s) => ({ label: s.label, value: `${s.count}件`, count: s.count, tone: s.tone }));
  return html`
    <section class="cds-tile cds-tile--wide" aria-labelledby="${ctx.uid}-cds-status">
      <h3 class="cds-tile__title" id="${ctx.uid}-cds-status">処理状況</h3>
      <p class="cds-tile__sub">処理状態別の件数と割合</p>
      <div class="cds-status">
        ${d.total ? donut(items, { cls: 'cds-donut', size: 140, thickness: 22, center: { value: d.total, caption: '受付件数' }, title: '処理状態別の件数' }) : html`<p class="cds-empty">該当する申請はありません</p>`}
        <table class="cds-mini-table">
          <caption class="visually-hidden">処理状態別の件数と割合</caption>
          <thead><tr><th scope="col">状態</th><th scope="col" class="cds-num">件数</th><th scope="col" class="cds-num">割合</th><th scope="col"><span class="visually-hidden">一覧</span></th></tr></thead>
          <tbody>
            ${d.statuses.map(
              (s) => html`
                <tr>
                  <th scope="row"><span class="cds-swatch tone-${s.tone}" aria-hidden="true"></span>${s.label}</th>
                  <td class="cds-num"><span ${statusMark(s.value)}>${s.count}</span></td>
                  <td class="cds-num"><span ${statusShareMark(s.value)}>${s.shareText}</span></td>
                  <td class="cds-num">${s.count ? listLink(ctx, s.link, icon('arrowRight', { size: 16, stroke: 1.5 }), { cls: 'cds-icon-link', hint: `${s.label} ${s.count}件の一覧` }) : ''}</td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
    </section>`;
}

function typeTile(d, ctx) {
  const items = d.types.map((t) => ({
    labelHtml: listLink(ctx, t.link, t.type, { cls: 'cds-link', hint: `${t.count}件の一覧` }),
    value: t.count,
    ratio: t.ratio,
    marker: ['data-type-count', t.type],
    share: t.shareText,
    shareMarker: ['data-type-share', t.type],
  }));
  return html`
    <section class="cds-tile cds-tile--wide" aria-labelledby="${ctx.uid}-cds-type">
      <h3 class="cds-tile__title" id="${ctx.uid}-cds-type">申請種別別の件数</h3>
      <p class="cds-tile__sub">件数の多い順</p>
      ${items.length ? hbars(items, { cls: 'cds-hbars', title: '申請種別別の件数' }) : html`<p class="cds-empty">該当する申請はありません</p>`}
    </section>`;
}

function definitionTile(d, ctx) {
  return html`
    <section class="cds-tile cds-tile--wide" aria-labelledby="${ctx.uid}-cds-defs">
      <h3 class="cds-tile__title" id="${ctx.uid}-cds-defs">集計の定義</h3>
      <dl class="cds-defs">${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}</dl>
    </section>`;
}

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  return html`
    <h2 class="cds-page-title" tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
    ${toolbar(d, ctx)} ${tiles(d, ctx)}
    <div class="cds-dash-grid">${monthTile(d, ctx)} ${statusTile(d, ctx)} ${typeTile(d, ctx)} ${definitionTile(d, ctx)}</div>`;
}
