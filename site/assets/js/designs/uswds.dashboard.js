// U.S. Web Design System の考え方を参考にしたダッシュボード。
// 公的情報サイトとして、セリフ体の見出しと説明文を付けた明確なセクション階層で構成する。
// 横一列のフィルター → 4 つのサマリーボックス → 月別（横棒）→ 処理状況（積み上げ＋表）→ 種別（順位つき横棒）→
// 定義と出典、の順。グラフには「データを表で表示」のアコーディオンを添え、値は常に文字でも示す。

import { html } from '../html.js';
import { icon } from '../icons.js';
import { hbars, stacked } from './charts.js';
import { kpiMark, listLink, statusMark, statusShareMark } from './dash-common.js';

function filters(d, ctx) {
  const sel = (name, label, options) => {
    const id = `${ctx.uid}-usa-${name}`;
    return html`
      <div class="usa-filter-field">
        <label class="usa-label" for="${id}">${label}</label>
        <div class="usa-select-wrap">
          <select class="usa-select" id="${id}" data-bind="${name}">
            ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
          </select>
          ${icon('chevronDown', { size: 20, stroke: 2, className: 'usa-select-wrap__icon' })}
        </div>
      </div>`;
  };
  return html`
    <form class="usa-filters" role="group" aria-label="集計条件">
      ${sel('period', '対象期間', d.periodOptions)} ${sel('dept', '担当課', d.deptOptions)}
      <div class="usa-filters__actions"><button type="button" class="usa-button usa-button--outline" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>条件をリセット</button></div>
    </form>`;
}

function section(ctx, key, title, description, body) {
  return html`
    <section class="usa-dash-section" aria-labelledby="${ctx.uid}-usa-${key}">
      <h3 class="usa-dash-heading" id="${ctx.uid}-usa-${key}">${title}</h3>
      <p class="usa-dash-desc">${description}</p>
      ${body}
    </section>`;
}

function accordion(ctx, key, title, body) {
  const open = Boolean(ctx.ui[`acc_${key}`]);
  const id = `${ctx.uid}-usa-acc-${key}`;
  return html`
    <div class="usa-accordion">
      <h4 class="usa-accordion__heading">
        <button type="button" class="usa-accordion__button" data-action="toggle-ui" data-key="acc_${key}" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${id}">${title}</button>
      </h4>
      <div class="usa-accordion__content" id="${id}" ${open ? '' : 'hidden'}>${body}</div>
    </div>`;
}

function summaryBoxes(d, ctx) {
  return html`
    <ul class="usa-summary-grid" aria-label="主な指標">
      ${d.kpis.map(
        (k) => html`
          <li class="usa-summary-box-kpi">
            <p class="usa-kpi__label">${k.label}</p>
            <p class="usa-kpi__value"><span ${kpiMark(k.key)}>${k.value}</span>${k.unit ? html`<span class="usa-kpi__unit">${k.unit}</span>` : ''}</p>
            <p class="usa-kpi__note">${k.note}</p>
            ${k.link ? listLink(ctx, k.link, '該当する申請の一覧', { cls: 'usa-link', hint: `${k.label} ${k.value}件` }) : ''}
          </li>`,
      )}
    </ul>`;
}

function months(d, ctx) {
  const items = d.months.map((m) => ({ label: m.label, value: m.count, ratio: m.ratio, marker: ['data-month', m.key] }));
  const table = html`
    <table class="usa-table usa-table--borderless">
      <caption>月別の受付件数</caption>
      <thead><tr><th scope="col">月</th><th scope="col">受付件数</th></tr></thead>
      <tbody>${d.months.map((m) => html`<tr><th scope="row">${m.label}</th><td>${m.count}件</td></tr>`)}</tbody>
      <tfoot><tr><th scope="row">合計</th><td>${d.total}件</td></tr></tfoot>
    </table>`;
  return section(
    ctx,
    'month',
    '月別の受付件数',
    `${d.period.rangeText}に受け付けた申請の件数です。`,
    html`${hbars(items, { cls: 'usa-hbars', title: '月別の受付件数' })} ${accordion(ctx, 'month', 'データを表で表示', table)}`,
  );
}

function statuses(d, ctx) {
  const items = d.statuses.map((s) => ({ label: s.label, value: s.count, ratio: s.ratio, tone: s.tone }));
  return section(
    ctx,
    'status',
    '処理状況',
    '受付件数に対する処理状態ごとの件数と割合です。',
    html`
      ${d.total ? stacked(items, { cls: 'usa-stacked', title: '処理状態別の件数' }) : ''}
      <table class="usa-table usa-table--borderless usa-table--status">
        <caption class="visually-hidden">処理状態別の件数と割合</caption>
        <thead><tr><th scope="col">処理状態</th><th scope="col" class="usa-num">件数</th><th scope="col" class="usa-num">割合</th><th scope="col"><span class="visually-hidden">一覧</span></th></tr></thead>
        <tbody>
          ${d.statuses.map(
            (s) => html`
              <tr>
                <th scope="row"><span class="usa-swatch tone-${s.tone}" aria-hidden="true"></span>${s.label}</th>
                <td class="usa-num"><span ${statusMark(s.value)}>${s.count}</span>件</td>
                <td class="usa-num"><span ${statusShareMark(s.value)}>${s.shareText}</span></td>
                <td>${s.count ? listLink(ctx, s.link, '一覧', { cls: 'usa-link', hint: `${s.label} ${s.count}件` }) : ''}</td>
              </tr>`,
          )}
        </tbody>
      </table>`,
  );
}

function types(d, ctx) {
  const items = d.types.map((t) => ({
    labelHtml: html`<span class="usa-rank">${t.rank}</span>${listLink(ctx, t.link, t.type, { cls: 'usa-link', hint: `${t.count}件の一覧` })}`,
    value: t.count,
    ratio: t.ratio,
    marker: ['data-type-count', t.type],
    share: t.shareText,
    shareMarker: ['data-type-share', t.type],
  }));
  return section(
    ctx,
    'type',
    '申請種別別の件数',
    '件数の多い順に並べています。番号は順位です。',
    items.length ? hbars(items, { cls: 'usa-hbars usa-hbars--rank', title: '申請種別別の件数（順位順）' }) : html`<p class="usa-dash-desc">一致する申請はありません。</p>`,
  );
}

function details(d, ctx) {
  const body = html`
    <dl class="usa-defs">${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}</dl>`;
  return section(
    ctx,
    'defs',
    '集計の定義と出典',
    '数値の計算方法と、データの出典です。',
    html`${accordion(ctx, 'defs', '集計の定義', body)}
      <p class="usa-source"><strong>出典：</strong>さくら野市 申請管理システム（架空のデータ）　<strong>基準日：</strong>${d.refDate}</p>`,
  );
}

/** extra: 通知アラートなど、デザイン共通の枠が差し込む HTML */
export function dashboardPage(model, ctx, extra = '') {
  const d = model.dashboard;
  return html`
    ${extra}
    <div class="usa-page-head">
      <h2 class="usa-page-title" tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
    </div>
    <p class="usa-dash-lead">${d.scopeText}の集計結果です。条件を変えると、すべての数値とグラフが同時に更新されます。</p>
    ${filters(d, ctx)}
    ${section(ctx, 'kpi', '概要', '受付件数・処理待ち・処理完了・処理完了率です。', summaryBoxes(d, ctx))}
    ${months(d, ctx)} ${statuses(d, ctx)} ${types(d, ctx)} ${details(d, ctx)}`;
}
