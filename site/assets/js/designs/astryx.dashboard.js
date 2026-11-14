// Astryx の Dashboard テンプレート（全体で1つのフィルター帯 → 指標タイル → グラフ → 内訳の表）を参考にしたダッシュボード。
// 数値・遷移は共通ビューモデルを使用する。
import { html } from '../html.js';
import { icon, TONE_ICONS } from '../icons.js';
import { columns, hbars, stacked } from './charts.js';
import { kpiMark, listLink, statusMark, statusShareMark } from './dash-common.js';

const badge = (s) => html`<span class="ax-badge tone-${s.tone}">${icon(TONE_ICONS[s.tone], { size: 14 })}${s.label}</span>`;

function filterBar(d, ctx) {
  const select = (name, label, options) => {
    const id = `${ctx.uid}-ax-${name}`;
    return html`<div class="ax-select-field">
      <label for="${id}">${label}</label>
      <select id="${id}" data-bind="${name}">
        ${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
      </select>
    </div>`;
  };
  return html`<section class="ax-filterbar" aria-label="集計条件">
    <div class="ax-filterbar__row">
      ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
      <button type="button" class="ax-button ax-button--secondary" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>
        条件をリセット
      </button>
    </div>
    <details class="ax-definitions">
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
  </section>`;
}

function tiles(d, ctx) {
  return html`<section class="ax-tiles" aria-label="主な指標">
    ${d.kpis.map(
      (k) => html`<div class="ax-tile">
        <p class="ax-tile__label">${k.label}</p>
        <p class="ax-tile__value"><span ${kpiMark(k.key)}>${k.value}</span><small>${k.unit}</small></p>
        ${k.key === 'rate'
          ? html`<span class="ax-progress" aria-hidden="true" style="--r: ${(d.rateTenths / 1000).toFixed(3)}"><span></span></span>`
          : ''}
        <p class="ax-sub">${k.note}</p>
        ${k.link
          ? listLink(ctx, k.link, html`一覧を表示${icon('arrowRight', { size: 14 })}`, {
              cls: 'ax-link',
              hint: `${k.label} ${k.value}件`,
            })
          : ''}
      </div>`,
    )}
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
    labelHtml: listLink(ctx, t.link, t.type, { cls: 'ax-link' }),
    value: t.count,
    ratio: t.ratio,
    marker: ['data-type-count', t.type],
    share: t.shareText,
    shareMarker: ['data-type-share', t.type],
  }));
  return html`<div class="ax-masthead">
      <div>
        <h2 tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
        <p class="ax-sub">${d.scopeText}</p>
      </div>
      ${listLink(ctx, {}, html`${icon('list', { size: 18 })}申請一覧を開く`, {
        cls: 'ax-button ax-button--primary',
      })}
    </div>
    ${filterBar(d, ctx)}${tiles(d, ctx)}
    <div class="ax-charts">
      <section class="ax-card ax-panel" aria-labelledby="${ctx.uid}-ax-month">
        <h3 id="${ctx.uid}-ax-month">月別の受付件数</h3>
        <p class="ax-sub">${d.period.rangeText}・合計 ${d.total}件</p>
        ${columns(months, { title: '月別の受付件数' })}
      </section>
      <section class="ax-card ax-panel" aria-labelledby="${ctx.uid}-ax-types">
        <h3 id="${ctx.uid}-ax-types">申請種別別の件数</h3>
        <p class="ax-sub">件数の多い順</p>
        ${types.length ? hbars(types, { title: '申請種別別の件数' }) : html`<p class="ax-empty-text">該当する申請はありません</p>`}
      </section>
    </div>
    <section class="ax-card ax-panel" aria-labelledby="${ctx.uid}-ax-status">
      <h3 id="${ctx.uid}-ax-status">処理状況</h3>
      <p class="ax-sub">受付件数 ${d.total}件の内訳</p>
      ${d.total
        ? stacked(
            d.statuses.map((s) => ({ ...s, value: s.count })),
            { title: '処理状態別の件数' },
          )
        : html`<p class="ax-empty-text">該当する申請はありません</p>`}
      <div class="ax-table-scroll" role="region" aria-label="処理状況の内訳の表（横スクロール可）" tabindex="0">
        <table class="ax-table ax-table--compact">
          <thead>
            <tr>
              <th scope="col">処理状態</th>
              <th scope="col" class="ax-right">件数</th>
              <th scope="col" class="ax-right">割合</th>
              <th scope="col"><span class="visually-hidden">操作</span></th>
            </tr>
          </thead>
          <tbody>
            ${d.statuses.map(
              (s) =>
                html`<tr>
                  <td>${badge(s)}</td>
                  <td class="ax-number ax-right"><span ${statusMark(s.value)}>${s.count}</span>件</td>
                  <td class="ax-number ax-right"><span ${statusShareMark(s.value)}>${s.shareText}</span></td>
                  <td class="ax-cell-action">
                    ${s.count
                      ? listLink(ctx, s.link, '表示', { cls: 'ax-link', hint: `${s.label} ${s.count}件の一覧` })
                      : ''}
                  </td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
    </section>`;
}
