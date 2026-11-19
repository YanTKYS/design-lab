// 琉球モダン・彩：ダッシュボードの表示。
// 集計・割合・一覧へ引き継ぐ条件は共通の dashboard.js（buildDashboardModel）を使い、ここでは配置と見せ方だけを決める。
// 視覚の基準は docs/ryukyu-modern-visuals/sai-dashboard-*.png。グラフの領域には装飾の模様を敷かない。

import { attr, html } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { kpiMark, statusMark, statusShareMark, typeMark, typeShareMark } from '../../assets/js/designs/dash-common.js';

/** 一覧へ移る文字リンク。data-link-* に引き継ぐ条件を持たせ、ボタンではなく下線付きの文字で示す。 */
function listLink(link, text, hint = '') {
  return html`<a class="rm-link" href="#" data-action="open-list" ${attr('data-link-status', link.status || null)} ${attr('data-link-group', link.group || null)} ${attr('data-link-type', link.type || null)}>${text}${hint ? html`<span class="rm-vh">（${hint}）</span>` : ''}</a>`;
}

function conditions(d) {
  const select = (name, label, options) => html`<div class="rm-cond">
    <label class="rm-label" for="rm-${name}">${label}</label>
    <select class="rm-select" id="rm-${name}" data-bind="${name}">
      ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
    </select>
  </div>`;
  return html`<section class="rm-band rm-cond-band" aria-label="集計条件">
    ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
    <button type="button" class="rm-btn rm-btn--secondary" data-action="reset-conditions">リセット<span class="rm-vh">（令和8年度・すべての担当課に戻す）</span></button>
    <p class="rm-cond-band__ref">基準日　${d.refDate}</p>
  </section>`;
}

function kpis(d) {
  const [total, pending, done, rate] = d.kpis;
  const card = (k, cls, linkText) => html`<div class="rm-kpi ${cls}">
    <h3 class="rm-kpi__label">${k.label}</h3>
    <p class="rm-kpi__value"><span ${kpiMark(k.key)}>${k.value}</span><small>${k.unit || ''}</small></p>
    <p class="rm-kpi__note">${k.note}</p>
    ${k.link ? html`<p class="rm-kpi__link">${listLink(k.link, html`${linkText}${icon('chevronRight', { size: 14, stroke: 2.25 })}`, `${k.label} ${k.value}件`)}</p>` : ''}
  </div>`;
  return html`<section class="rm-dash-section" aria-labelledby="rm-dash-overview">
    <h2 class="rm-section-title" id="rm-dash-overview">受付と処理の概況</h2>
    <div class="rm-kpis">
      ${card(total, 'rm-kpi--total', '一覧を見る')}${card(pending, 'rm-kpi--pending', '一覧を見る')}${card(done, 'rm-kpi--done', '一覧を見る')}${card(rate, 'rm-kpi--rate', '')}
    </div>
  </section>`;
}

/** 月別の縦棒。目盛は5件刻みで、各棒の上に実数を載せる（値は文字でも読める）。 */
function months(d) {
  const top = Math.max(5, Math.ceil(d.monthMax / 5) * 5);
  const ticks = Array.from({ length: top / 5 + 1 }, (_, i) => i * 5);
  const partial = d.months.some((m) => m.key === '2026-10');
  return html`<section class="rm-dash-section rm-chart" aria-labelledby="rm-dash-months">
    <div class="rm-section-head"><h2 class="rm-section-title" id="rm-dash-months">月別の受付件数</h2><p class="rm-section-note">単位：件</p></div>
    <div class="rm-columns" style="--rm-top: ${top}">
      <ol class="rm-columns__ticks" aria-hidden="true">${ticks.reverse().map((t) => html`<li style="--v: ${t}">${t}</li>`)}</ol>
      <ol class="rm-columns__bars" aria-label="月別の受付件数（${d.period.rangeText}）">
        ${d.months.map(
          (m) => html`<li style="--v: ${m.count}">
            <span class="rm-columns__value"><span ${attr('data-month', m.key)}>${m.count}</span><span class="rm-vh">件</span></span>
            <span class="rm-columns__bar" aria-hidden="true"></span>
            <span class="rm-columns__label">${m.label}</span>
          </li>`,
        )}
      </ol>
    </div>
    ${partial ? html`<p class="rm-section-note">10月は基準日までの受付分です。</p>` : ''}
  </section>`;
}

function statuses(d) {
  return html`<section class="rm-dash-section rm-chart" aria-labelledby="rm-dash-status">
    <div class="rm-section-head"><h2 class="rm-section-title" id="rm-dash-status">処理状態の内訳</h2><p class="rm-section-note">受付全体に占める割合</p></div>
    ${d.total
      ? html`<div class="rm-stack" aria-hidden="true">
          ${d.statuses.filter((s) => s.count).map((s) => html`<span class="rm-stack__seg" data-tone="${s.value}" style="flex-grow: ${s.count}"></span>`)}
        </div>`
      : html`<p class="rm-empty-text">該当する申請はありません</p>`}
    <ul class="rm-legend">
      ${d.statuses.map(
        (s) => html`<li>
          <span class="rm-legend__swatch" data-tone="${s.value}" aria-hidden="true"></span>
          <span class="rm-legend__name">${s.count ? listLink(s.link, s.label, `${s.label} ${s.count}件の一覧`) : s.label}</span>
          <span class="rm-legend__count"><span ${statusMark(s.value)}>${s.count}</span> 件</span>
          <span class="rm-legend__share" ${statusShareMark(s.value)}>${s.shareText}</span>
        </li>`,
      )}
    </ul>
  </section>`;
}

function types(d) {
  return html`<section class="rm-dash-section" aria-labelledby="rm-dash-types">
    <div class="rm-section-head"><h2 class="rm-section-title" id="rm-dash-types">申請種別の内訳</h2><p class="rm-section-note">受付件数の多い順</p></div>
    ${d.types.length
      ? html`<table class="rm-types">
          <thead>
            <tr><th scope="col">申請種別</th><th scope="col" class="rm-types__bar-col"><span class="rm-vh">件数の棒</span></th><th scope="col" class="rm-right">件数</th><th scope="col" class="rm-right">割合</th></tr>
          </thead>
          <tbody>
            ${d.types.map(
              (t) => html`<tr>
                <th scope="row">${listLink(t.link, t.type, `${t.type} ${t.count}件の一覧`)}</th>
                <td class="rm-types__bar-col"><span class="rm-types__track" aria-hidden="true"><span style="width: ${(t.ratio * 100).toFixed(1)}%"></span></span></td>
                <td class="rm-right rm-num"><strong ${typeMark(t.type)}>${t.count}</strong> 件</td>
                <td class="rm-right rm-num" ${typeShareMark(t.type)}>${t.shareText}</td>
              </tr>`,
            )}
          </tbody>
        </table>`
      : html`<p class="rm-empty-text">該当する申請はありません</p>`}
  </section>`;
}

export function dashboardView(d) {
  return html`${conditions(d)} ${kpis(d)}
    <div class="rm-dash-grid">${months(d)} ${statuses(d)}</div>
    ${types(d)}`;
}
