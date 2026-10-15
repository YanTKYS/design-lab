// Microsoft Fluent 2 の考え方を参考にしたダッシュボード。
// ページ見出しの下のコマンドバー（フィルター・リセット・主要操作）で操作をまとめ、
// 指標カード → 2 列のカード（月別の折れ線／処理状況）→ 種別カード → 折りたためる定義、の順に面で構成する。
// 面は白いカード（影と角丸）で区切り、状態にはアイコンを添えて色だけに頼らない。

import { html } from '../html.js';
import { TONE_ICONS, icon } from '../icons.js';
import { hbars, line, stacked } from './charts.js';
import { kpiMark, listLink, statusMark, statusShareMark } from './dash-common.js';

const KPI_ICONS = { total: 'inbox', pending: 'clock', done: 'checkCircle', rate: 'chart' };

function commandBar(d, ctx) {
  const sel = (name, label, options) => {
    const id = `${ctx.uid}-fui-${name}`;
    return html`
      <div class="fui-cmd-field">
        <label class="fui-cmd-field__label" for="${id}">${label}</label>
        <select class="fui-input fui-input--select" id="${id}" data-bind="${name}">
          ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
        </select>
      </div>`;
  };
  return html`
    <div class="fui-toolbar fui-toolbar--dash" role="toolbar" aria-label="集計条件">
      ${sel('period', '対象期間', d.periodOptions)} ${sel('dept', '担当課', d.deptOptions)}
      <button type="button" class="fui-button fui-button--subtle" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>${icon('close', { size: 16, stroke: 1.5 })}リセット</button>
      <span class="fui-toolbar__spacer"></span>
      ${listLink(ctx, {}, html`${icon('list', { size: 20, stroke: 1.5 })}申請一覧を開く`, { cls: 'fui-button fui-button--primary', hint: `${d.scopeText}の申請` })}
    </div>`;
}

function kpiCards(d, ctx) {
  return html`
    <ul class="fui-kpis" aria-label="主な指標">
      ${d.kpis.map(
        (k) => html`
          <li class="fui-card fui-kpi">
            <span class="fui-kpi__icon" aria-hidden="true">${icon(KPI_ICONS[k.key], { size: 20, stroke: 1.5 })}</span>
            <p class="fui-kpi__label">${k.label}</p>
            <p class="fui-kpi__value"><span ${kpiMark(k.key)}>${k.value}</span>${k.unit ? html`<span class="fui-kpi__unit">${k.unit}</span>` : ''}</p>
            <p class="fui-kpi__note">${k.note}</p>
            ${k.link ? listLink(ctx, k.link, html`一覧を表示${icon('chevronRight', { size: 16, stroke: 1.5 })}`, { cls: 'fui-kpi__link', hint: `${k.label} ${k.value}件` }) : ''}
          </li>`,
      )}
    </ul>`;
}

function monthCard(d, ctx) {
  const items = d.months.map((m) => ({ label: m.label, value: m.count, ratio: m.ratio, marker: ['data-month', m.key] }));
  return html`
    <section class="fui-card fui-dcard" aria-labelledby="${ctx.uid}-fui-month">
      <h3 class="fui-dcard__title" id="${ctx.uid}-fui-month">月別の受付件数</h3>
      <p class="fui-dcard__caption">${d.period.rangeText}・合計 ${d.total}件</p>
      ${line(items, { cls: 'fui-line', title: '月別の受付件数の推移' })}
    </section>`;
}

function statusCard(d, ctx) {
  const items = d.statuses.map((s) => ({ label: s.label, value: s.count, ratio: s.ratio, tone: s.tone }));
  return html`
    <section class="fui-card fui-dcard" aria-labelledby="${ctx.uid}-fui-status">
      <h3 class="fui-dcard__title" id="${ctx.uid}-fui-status">処理状況</h3>
      <p class="fui-dcard__caption">受付 ${d.total}件の内訳</p>
      ${d.total ? stacked(items, { cls: 'fui-stacked', title: '処理状態別の件数' }) : ''}
      <ul class="fui-statuses">
        ${d.statuses.map(
          (s) => html`
            <li class="fui-statuses__row tone-${s.tone}">
              <span class="fui-statuses__name"><span class="fui-statuses__icon" aria-hidden="true">${icon(TONE_ICONS[s.tone], { size: 16, stroke: 1.75 })}</span>${s.label}</span>
              <span class="fui-statuses__count"><span ${statusMark(s.value)}>${s.count}</span>件</span>
              <span class="fui-statuses__share" ${statusShareMark(s.value)}>${s.shareText}</span>
              <span class="fui-statuses__link">${s.count ? listLink(ctx, s.link, '表示', { cls: 'fui-link', hint: `${s.label} ${s.count}件の一覧` }) : ''}</span>
            </li>`,
        )}
      </ul>
    </section>`;
}

function typeCard(d, ctx) {
  const items = d.types.map((t) => ({
    labelHtml: listLink(ctx, t.link, t.type, { cls: 'fui-link', hint: `${t.count}件の一覧` }),
    value: t.count,
    ratio: t.ratio,
    marker: ['data-type-count', t.type],
    share: t.shareText,
    shareMarker: ['data-type-share', t.type],
  }));
  return html`
    <section class="fui-card fui-dcard" aria-labelledby="${ctx.uid}-fui-type">
      <h3 class="fui-dcard__title" id="${ctx.uid}-fui-type">申請種別別の件数</h3>
      <p class="fui-dcard__caption">件数の多い順</p>
      ${items.length ? hbars(items, { cls: 'fui-hbars', title: '申請種別別の件数' }) : html`<p class="fui-empty-text">該当する申請はありません</p>`}
    </section>`;
}

function definitions(d, ctx) {
  const open = Boolean(ctx.ui.defs);
  const id = `${ctx.uid}-fui-defs`;
  return html`
    <section class="fui-card fui-dcard fui-accordion">
      <h3 class="fui-accordion__heading">
        <button type="button" class="fui-accordion__button" data-action="toggle-ui" data-key="defs" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${id}">
          ${icon(open ? 'chevronUp' : 'chevronDown', { size: 16, stroke: 1.75 })}集計の定義と基準日
        </button>
      </h3>
      <div class="fui-accordion__panel" id="${id}" ${open ? '' : 'hidden'}>
        <dl class="fui-defs">${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}</dl>
        <p class="fui-dcard__caption">基準日：${d.refDate}（架空のデータです）</p>
      </div>
    </section>`;
}

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  return html`
    <div class="fui-page-head">
      <h2 class="fui-title" tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
      <p class="fui-caption">${d.scopeText}</p>
    </div>
    ${commandBar(d, ctx)} ${kpiCards(d, ctx)}
    <div class="fui-dgrid">${monthCard(d, ctx)} ${statusCard(d, ctx)}</div>
    <div class="fui-dgrid fui-dgrid--one">${typeCard(d, ctx)}</div>
    ${definitions(d, ctx)}`;
}
