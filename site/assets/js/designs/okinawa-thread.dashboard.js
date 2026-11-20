// 糸の交点：ダッシュボード。指標は4枚のカードではなく「指標名→値→定義→一覧へ」の行、月別は縦にたどる横棒。
// 集計・割合・一覧へ引き継ぐ条件は共通の dashboard.js（buildDashboardModel）と ctx.listHref を使う。グラフの領域に模様は敷かない。
import { html } from '../html.js';
import { icon } from '../icons.js';
import { kpiMark, listLink, statusMark, statusShareMark, typeMark, typeShareMark } from './dash-common.js';
import { mark } from './okinawa-thread.js';

function conditions(d, ctx) {
  const select = (name, label, options) => html`<div class="ot-field">
    <label class="ot-label" for="${ctx.uid}-ot-${name}">${label}</label>
    <select class="ot-input ot-select" id="${ctx.uid}-ot-${name}" data-bind="${name}">
      ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
    </select>
  </div>`;
  return html`<section class="ot-cond ot-cond--dash" aria-label="集計条件">
    ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
    <button type="button" class="ot-btn ot-btn--ghost" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>リセット</button>
    <details class="ot-definitions">
      <summary>集計の定義と基準日（${d.refDate}）</summary>
      <dl class="ot-axis">${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}</dl>
      <p class="ot-muted">基準日：${d.refDate}（架空のデータ）</p>
    </details>
  </section>`;
}

function overview(d, ctx) {
  return html`<section class="ot-chapter-block" aria-labelledby="${ctx.uid}-ot-overview">
    <h3 class="ot-chapter" id="${ctx.uid}-ot-overview">受付と処理の概況</h3>
    <dl class="ot-kpis">
      ${d.kpis.map(
        (k, i) => html`<div class="ot-kpi ${i === 0 ? 'ot-kpi--lead' : ''}">
          <dt class="ot-kpi__name">${k.label}</dt>
          <dd class="ot-kpi__value"><span class="ot-num" ${kpiMark(k.key)}>${k.value}</span><small>${k.unit || ''}</small></dd>
          <dd class="ot-kpi__def">${k.note}</dd>
          <dd class="ot-kpi__link">${listLink(ctx, k.link, html`一覧を見る${icon('chevronRight', { size: 14, stroke: 2.25 })}`, { cls: 'ot-link', hint: `${k.label} ${k.value}件` })}</dd>
        </div>`,
      )}
    </dl>
  </section>`;
}

/** 月別：月を縦にたどる横棒。棒の長さに加え、件数を棒の端に文字で添える。 */
function months(d, ctx) {
  return html`<section class="ot-chapter-block ot-chapter-block--stack" aria-labelledby="${ctx.uid}-ot-months">
    <h3 class="ot-chapter" id="${ctx.uid}-ot-months">${mark}月別の受付件数</h3>
    <ol class="ot-hbars" aria-label="月別の受付件数（${d.period.rangeText}）">
      ${d.months.map(
        (m) => html`<li>
          <span class="ot-hbars__label">${m.label}</span>
          <span class="ot-hbars__track" style="--r: ${m.ratio.toFixed(4)}">
            <span class="ot-hbars__bar" aria-hidden="true"></span>
            <span class="ot-hbars__value ot-num"><span data-month="${m.key}">${m.count}</span>件</span>
          </span>
        </li>`,
      )}
    </ol>
  </section>`;
}

function statuses(d, ctx) {
  return html`<section class="ot-chapter-block ot-chapter-block--stack" aria-labelledby="${ctx.uid}-ot-status">
    <h3 class="ot-chapter" id="${ctx.uid}-ot-status">${mark}処理状況の内訳</h3>
    <table class="ot-table">
      <thead><tr><th scope="col">処理状態</th><th scope="col" class="ot-right">件数</th><th scope="col" class="ot-right">割合</th></tr></thead>
      <tbody>
        ${d.statuses.map(
          (s) => html`<tr>
            <th scope="row">${s.count ? listLink(ctx, s.link, s.label, { cls: 'ot-link', hint: `${s.label} ${s.count}件の一覧` }) : s.label}</th>
            <td class="ot-right ot-num"><strong ${statusMark(s.value)}>${s.count}</strong>件</td>
            <td class="ot-right ot-num" ${statusShareMark(s.value)}>${s.shareText}</td>
          </tr>`,
        )}
      </tbody>
    </table>
  </section>`;
}

function types(d, ctx) {
  return html`<section class="ot-chapter-block ot-chapter-block--stack" aria-labelledby="${ctx.uid}-ot-types">
    <h3 class="ot-chapter" id="${ctx.uid}-ot-types">${mark}申請種別の内訳</h3>
    ${d.types.length
      ? html`<table class="ot-table">
          <thead><tr><th scope="col">申請種別</th><th scope="col" class="ot-right">件数</th><th scope="col" class="ot-right">割合</th></tr></thead>
          <tbody>
            ${d.types.map(
              (t) => html`<tr>
                <th scope="row">${listLink(ctx, t.link, t.type, { cls: 'ot-link', hint: `${t.type} ${t.count}件の一覧` })}</th>
                <td class="ot-right ot-num"><strong ${typeMark(t.type)}>${t.count}</strong>件</td>
                <td class="ot-right ot-num" ${typeShareMark(t.type)}>${t.shareText}</td>
              </tr>`,
            )}
          </tbody>
        </table>`
      : html`<p class="ot-empty">該当する申請はありません</p>`}
  </section>`;
}

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  return html`<p class="ot-scope-text">${d.scopeText}</p>
    ${conditions(d, ctx)} ${overview(d, ctx)}
    <div class="ot-dash-grid">${months(d, ctx)} ${statuses(d, ctx)}</div>
    ${types(d, ctx)}`;
}
