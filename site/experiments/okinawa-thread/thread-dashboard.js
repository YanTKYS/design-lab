// 糸の交点（仮称）：ダッシュボード。指標は4枚のカードではなく「指標名→値→定義→一覧へ」の行、月別は縦にたどる横棒
// （docs/okinawa-ui-study/thread-dashboard-*.png）。集計と一覧へ引き継ぐ条件は共通の dashboard.js をそのまま使う。

import { html } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { kpiMark, statusMark, statusShareMark, typeMark, typeShareMark } from '../../assets/js/designs/dash-common.js';
import { listLink, mark } from './thread-parts.js';

function conditions(d) {
  const select = (name, label, options) => html`<div class="th-field-inline">
    <label class="th-label" for="th-${name}">${label}</label>
    <select class="th-select" id="th-${name}" data-bind="${name}">
      ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
    </select>
  </div>`;
  return html`<section class="th-cond th-cond--dash" aria-label="集計条件">
    ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
    <button type="button" class="th-btn th-btn--ghost" data-action="reset-conditions">リセット<span class="th-vh">（令和8年度・すべての担当課に戻す）</span></button>
    <p class="th-cond__ref">基準日　${d.refDate}</p>
  </section>`;
}

function overview(d) {
  return html`<section class="th-chapter-block" aria-labelledby="th-dash-overview">
    <h2 class="th-chapter" id="th-dash-overview">受付と処理の概況</h2>
    <dl class="th-kpis">
      ${d.kpis.map(
        (k, i) => html`<div class="th-kpi ${i === 0 ? 'th-kpi--lead' : ''}">
          <dt class="th-kpi__name">${k.label}</dt>
          <dd class="th-kpi__value"><span class="th-num" ${kpiMark(k.key)}>${k.value}</span><small>${k.unit || ''}</small></dd>
          <dd class="th-kpi__def">${k.note}</dd>
          <dd class="th-kpi__link">${k.link ? listLink(k.link, html`一覧を見る${icon('chevronRight', { size: 14, stroke: 2.25 })}`, `${k.label} ${k.value}件`) : ''}</dd>
        </div>`,
      )}
    </dl>
  </section>`;
}

/** 月別：月を縦にたどる横棒。棒の長さに加え、件数を文字で添える。 */
function months(d) {
  return html`<section class="th-chapter-block th-chapter-block--stack" aria-labelledby="th-dash-months">
    <h2 class="th-chapter" id="th-dash-months">${mark}月別の受付件数</h2>
    <ol class="th-hbars" aria-label="月別の受付件数（${d.period.rangeText}）">
      ${d.months.map(
        (m) => html`<li>
          <span class="th-hbars__label">${m.label}</span>
          <span class="th-hbars__track" style="--r: ${m.ratio.toFixed(4)}">
            <span class="th-hbars__bar" aria-hidden="true"></span>
            <span class="th-hbars__value th-num"><span data-month="${m.key}">${m.count}</span>件</span>
          </span>
        </li>`,
      )}
    </ol>
  </section>`;
}

function statuses(d) {
  return html`<section class="th-chapter-block th-chapter-block--stack" aria-labelledby="th-dash-status">
    <h2 class="th-chapter" id="th-dash-status">${mark}処理状態の内訳</h2>
    <table class="th-table">
      <thead><tr><th scope="col">状態</th><th scope="col" class="th-right">件数</th><th scope="col" class="th-right">割合</th></tr></thead>
      <tbody>
        ${d.statuses.map(
          (s) => html`<tr>
            <th scope="row">${s.count ? listLink(s.link, s.label, `${s.label} ${s.count}件の一覧`) : s.label}</th>
            <td class="th-right th-num"><strong ${statusMark(s.value)}>${s.count}</strong>件</td>
            <td class="th-right th-num" ${statusShareMark(s.value)}>${s.shareText}</td>
          </tr>`,
        )}
      </tbody>
    </table>
  </section>`;
}

function types(d) {
  return html`<section class="th-chapter-block th-chapter-block--stack" aria-labelledby="th-dash-types">
    <h2 class="th-chapter" id="th-dash-types">${mark}申請種別の内訳</h2>
    ${d.types.length
      ? html`<table class="th-table">
          <thead><tr><th scope="col">申請種別</th><th scope="col" class="th-right">件数</th><th scope="col" class="th-right">割合</th></tr></thead>
          <tbody>
            ${d.types.map(
              (t) => html`<tr>
                <th scope="row">${listLink(t.link, t.type, `${t.type} ${t.count}件の一覧`)}</th>
                <td class="th-right th-num"><strong ${typeMark(t.type)}>${t.count}</strong>件</td>
                <td class="th-right th-num" ${typeShareMark(t.type)}>${t.shareText}</td>
              </tr>`,
            )}
          </tbody>
        </table>`
      : html`<p class="th-empty">該当する申請はありません</p>`}
  </section>`;
}

export function dashboardView(d) {
  return html`${conditions(d)} ${overview(d)}
    <div class="th-dash-grid">${months(d)} ${statuses(d)}</div>
    ${types(d)}`;
}
