// デジタル庁デザインシステムの考え方を参考にしたダッシュボード。
// 数値と見出しを大きく読みやすくし、情報を「集計条件 → 要点（4 つの指標）→ 月別 → 処理状況 → 種別別 → 集計の見方」の
// 見出し付きセクションに分けて縦に積む。グラフは値を棒の上に直接書き、状態は色だけでなく模様・ラベル・数値・割合で区別する。
// 装飾は使わず、グラフにはすべて数値の表（またはラベル付きの一覧）を添える。

import { html } from '../html.js';
import { icon } from '../icons.js';
import { columns, stacked } from './charts.js';
import { kpiMark, listLink, statusMark, statusShareMark, typeMark, typeShareMark } from './dash-common.js';

const select = (id, name, label, options, support) => html`
  <div class="dads-form-control">
    <label class="dads-form-control__label" for="${id}">${label}</label>
    <p class="dads-form-control__support">${support}</p>
    <div class="dads-select">
      <select class="dads-select__select" id="${id}" data-bind="${name}">
        ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
      </select>
      ${icon('chevronDown', { size: 16, stroke: 2, className: 'dads-select__icon' })}
    </div>
  </div>`;

function conditions(d, ctx) {
  return html`
    <section class="dads-search" aria-labelledby="${ctx.uid}-dads-cond">
      <h3 class="dads-section-title" id="${ctx.uid}-dads-cond">集計条件</h3>
      <form class="dads-search__form" aria-labelledby="${ctx.uid}-dads-cond">
        ${select(`${ctx.uid}-dads-period`, 'period', '対象期間', d.periodOptions, '受付日がこの期間内の申請を集計します')}
        ${select(`${ctx.uid}-dads-dept`, 'dept', '担当課', d.deptOptions, '「すべての担当課」を選ぶと全体を集計します')}
        <div class="dads-search__actions">
          <button type="button" class="dads-button" data-type="text" data-size="md" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>条件をリセット</button>
        </div>
      </form>
    </section>`;
}

function kpis(d, ctx) {
  return html`
    <section class="dads-dash-section" aria-labelledby="${ctx.uid}-dads-kpi">
      <h3 class="dads-section-title" id="${ctx.uid}-dads-kpi">申請の受付と処理</h3>
      <p class="dads-dash-lead">${d.scopeText}の集計結果です。</p>
      <dl class="dads-kpis">
        ${d.kpis.map(
          (k) => html`
            <div class="dads-kpi">
              <dt class="dads-kpi__label">${k.label}</dt>
              <dd class="dads-kpi__value"><span ${kpiMark(k.key)}>${k.value}</span>${k.unit ? html`<span class="dads-kpi__unit">${k.unit}</span>` : ''}</dd>
              <dd class="dads-kpi__note">${k.note}</dd>
              ${k.link ? html`<dd class="dads-kpi__link">${listLink(ctx, k.link, '該当する申請を見る', { cls: 'dads-link', hint: `${k.label} ${k.value}件の一覧` })}</dd>` : ''}
            </div>`,
        )}
      </dl>
    </section>`;
}

function months(d, ctx) {
  const items = d.months.map((m) => ({ label: m.label, value: m.count, ratio: m.ratio, marker: ['data-month', m.key] }));
  return html`
    <section class="dads-dash-section" aria-labelledby="${ctx.uid}-dads-month">
      <h3 class="dads-section-title" id="${ctx.uid}-dads-month">月別の受付件数</h3>
      <p class="dads-dash-lead">${d.period.rangeText}の受付件数です。合計は${d.total}件です。</p>
      <div class="dads-chart-frame">${columns(items, { cls: 'dads-columns', title: '月別の受付件数' })}</div>
    </section>`;
}

function statuses(d, ctx) {
  const items = d.statuses.map((s) => ({ label: s.label, value: s.count, ratio: s.ratio, tone: s.tone }));
  return html`
    <section class="dads-dash-section" aria-labelledby="${ctx.uid}-dads-status">
      <h3 class="dads-section-title" id="${ctx.uid}-dads-status">処理状況</h3>
      <p class="dads-dash-lead">受付件数に占める処理状態ごとの件数と割合です。色に加えて、模様・ラベル・数値でも区別できます。</p>
      ${d.total ? stacked(items, { cls: 'dads-stacked', title: '処理状態別の件数' }) : ''}
      <div class="dads-table-wrap" role="region" aria-label="処理状態別の件数と割合" tabindex="0">
        <table class="dads-table dads-table--compact">
          <thead><tr><th scope="col">処理状態</th><th scope="col" class="dads-num">件数</th><th scope="col" class="dads-num">割合</th><th scope="col"><span class="visually-hidden">操作</span></th></tr></thead>
          <tbody>
            ${d.statuses.map(
              (s) => html`
                <tr>
                  <th scope="row"><span class="dads-swatch tone-${s.tone}" aria-hidden="true"></span>${s.label}</th>
                  <td class="dads-num"><span ${statusMark(s.value)}>${s.count}</span>件</td>
                  <td class="dads-num"><span ${statusShareMark(s.value)}>${s.shareText}</span></td>
                  <td>${s.count ? listLink(ctx, s.link, '一覧を見る', { cls: 'dads-link', hint: `${s.label} ${s.count}件` }) : ''}</td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
    </section>`;
}

function types(d, ctx) {
  return html`
    <section class="dads-dash-section" aria-labelledby="${ctx.uid}-dads-type">
      <h3 class="dads-section-title" id="${ctx.uid}-dads-type">申請種別別の件数</h3>
      <p class="dads-dash-lead">件数の多い順です。</p>
      ${d.types.length === 0
        ? html`<p class="dads-empty">条件に一致する申請はありません。</p>`
        : html`
            <div class="dads-table-wrap" role="region" aria-label="申請種別別の件数" tabindex="0">
              <table class="dads-table dads-table--compact">
                <thead><tr><th scope="col" class="dads-num">順位</th><th scope="col">申請種別</th><th scope="col" class="dads-num">件数</th><th scope="col" class="dads-num">割合</th><th scope="col"><span class="visually-hidden">操作</span></th></tr></thead>
                <tbody>
                  ${d.types.map(
                    (t) => html`
                      <tr>
                        <td class="dads-num">${t.rank}</td>
                        <th scope="row">${t.type}</th>
                        <td class="dads-num"><span ${typeMark(t.type)}>${t.count}</span>件</td>
                        <td class="dads-num"><span ${typeShareMark(t.type)}>${t.shareText}</span></td>
                        <td>${listLink(ctx, t.link, '一覧を見る', { cls: 'dads-link', hint: `${t.type} ${t.count}件` })}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            </div>`}
    </section>`;
}

function definitions(d) {
  return html`
    <section class="dads-dash-section" aria-label="集計の見方">
      <h3 class="dads-section-title">集計の見方</h3>
      <dl class="dads-defs">
        ${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}
      </dl>
      <p class="dads-dash-lead">基準日：${d.refDate}（架空のデータです）</p>
    </section>`;
}

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  return html`
    <h2 class="dads-heading" tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
    <p class="dads-lead">申請の受付件数と処理状況を、期間と担当課ごとに確認できます。</p>
    ${conditions(d, ctx)} ${kpis(d, ctx)} ${months(d, ctx)} ${statuses(d, ctx)} ${types(d, ctx)} ${definitions(d)}`;
}
