// 標示盤：ダッシュボード。指標はドット文字の盤面、月別・種別は「1目盛り＝1件」の点灯（右端に件数）、
// 処理状況は処理待ち／処理完了の区分で束ね、処理待ちは上段の指標と同じ琥珀で結ぶ。
// 集計・割合・一覧へ引き継ぐ条件は共通の dashboard.js（buildDashboardModel）と ctx.listHref を使う。
// ドット文字と目盛りは装飾（aria-hidden）で、数値は読み上げられる文字として1回だけ置く。
import { attr, html, raw } from '../html.js';
import { kpiMark, listLink, statusMark, statusShareMark, typeMark, typeShareMark } from './dash-common.js';
import { STATUS_MARK, dots } from './l-signage.js';

const GROUPS = [
  { key: 'pending', label: '処理待ち', values: ['received', 'reviewing', 'returned'] },
  { key: 'done', label: '処理完了', values: ['approved', 'rejected'] },
];

/**
 * 1目盛り＝1件の点灯。目盛りの数は最大値を5の倍数に切り上げたもの（どの値でも1目盛りは1件のまま。
 * 最多の値に合わせて縮めない）。点灯の数は件数と同じ。
 */
export function ticks(n, max) {
  const total = Math.max(5, Math.ceil(max / 5) * 5);
  return raw(`<span class="ld-ticks" style="--n:${total}" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`);
}

function head(d, ctx, title) {
  const select = (name, label, options) => html`<div class="ld-cond__field">
    <label for="${ctx.uid}-ld-${name}">${label}</label>
    <select id="${ctx.uid}-ld-${name}" data-bind="${name}">${options.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}</select>
  </div>`;
  return html`<div class="ld-head">
    <div><h2 class="ld-title" tabindex="-1" data-focus="heading">${title}</h2><p class="ld-ref">基準日　${d.refDate}<span>${d.scopeText}</span></p></div>
    <div class="ld-cond" role="group" aria-label="集計条件">
      ${select('period', '対象期間', d.periodOptions)}${select('dept', '担当課', d.deptOptions)}
      <button type="button" class="ld-reset" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>既定に戻す</button>
    </div>
  </div>`;
}

function kpis(d, ctx) {
  return html`<details class="ld-defs">
      <summary>集計の定義</summary>
      <dl>${d.definitions.map((x) => html`<div><dt>${x.term}</dt><dd>${x.text}</dd></div>`)}</dl>
      <p>基準日：${d.refDate}（架空のデータ）</p>
    </details>
    <dl class="ld-board" aria-label="受付と処理の概況">
      ${d.kpis.map((k) => {
        // 処理完了率は「73.2%」の文字列で来るので、ドット文字は数値の部分だけにして「%」は単位として添える
        const pct = String(k.value).endsWith('%');
        const num = pct ? String(k.value).slice(0, -1) : k.value;
        return html`<div class="ld-kpi ld-kpi--${k.key}">
          <dt>${k.label}</dt>
          <dd class="ld-kpi__value">${dots(num, 'l-dots ld-kpi__dots')}<span class="ld-kpi__unit" aria-hidden="true">${pct ? '%' : k.unit}</span><span class="visually-hidden"><span ${kpiMark(k.key)}>${k.value}</span>${k.unit}</span></dd>
          <dd class="ld-kpi__note">${k.note}</dd>
          ${k.link && Number(k.value) > 0 ? html`<dd class="ld-kpi__link">${listLink(ctx, k.link, '一覧を見る ›', { cls: 'll-link', hint: `${k.label} ${k.value}件` })}</dd>` : ''}
        </div>`;
      })}
    </dl>`;
}

const secHead = (ctx, key, title, note = '') => html`<div class="ld-sec__head"><h3 id="${ctx.uid}-ld-${key}">${title}</h3>${note ? html`<p>${note}</p>` : ''}</div>`;

function months(d, ctx) {
  return html`<section class="ld-sec" aria-labelledby="${ctx.uid}-ld-months">${secHead(ctx, 'months', '月別の受付件数', '1目盛り＝1件　単位　件')}
    <table class="ld-table ld-table--months"><caption class="visually-hidden">月別の受付件数（${d.period.rangeText}）</caption>
      <thead class="visually-hidden"><tr><th scope="col">月</th><th scope="col">目盛り</th><th scope="col">件数</th></tr></thead>
      <tbody>${d.months.map((m) => html`<tr><th scope="row">${m.label}</th><td>${ticks(m.count, d.monthMax)}</td><td class="ld-num" data-month="${m.key}">${m.count}</td></tr>`)}</tbody>
    </table></section>`;
}

function statuses(d, ctx) {
  const byValue = Object.fromEntries(d.statuses.map((s) => [s.value, s]));
  return html`<section class="ld-sec" aria-labelledby="${ctx.uid}-ld-status">${secHead(ctx, 'status', '処理状況の内訳')}
    <table class="ld-table ld-table--status"><caption class="visually-hidden">処理状況の内訳（処理待ち・処理完了の区分つき）</caption>
      <thead><tr><th scope="col">区分</th><th scope="col">処理状態</th><th scope="col" class="ld-num">件数</th><th scope="col" class="ld-num">割合</th></tr></thead>
      ${GROUPS.map(
        (g) => html`<tbody class="ld-group ld-group--${g.key}">${g.values.map((v, i) => {
          const s = byValue[v];
          return html`<tr>${i === 0 ? html`<th scope="rowgroup" ${attr('rowspan', g.values.length)} class="ld-group__label">${g.label}</th>` : ''}
            <th scope="row"><span aria-hidden="true">${STATUS_MARK[s.value]} </span>${s.count ? listLink(ctx, s.link, s.label, { cls: 'll-link', hint: `${s.label} ${s.count}件の一覧` }) : s.label}</th>
            <td class="ld-num" ${statusMark(s.value)}>${s.count}</td><td class="ld-num ld-share" ${statusShareMark(s.value)}>${s.shareText}</td></tr>`;
        })}</tbody>`,
      )}
    </table></section>`;
}

function types(d, ctx) {
  const max = d.types[0]?.count ?? 0;
  return html`<section class="ld-sec" aria-labelledby="${ctx.uid}-ld-types">${secHead(ctx, 'types', '申請種別の内訳', '1目盛り＝1件')}
    <table class="ld-table ld-table--types"><caption class="visually-hidden">申請種別の内訳</caption>
      <thead><tr><th scope="col">申請種別</th><th scope="col"><span class="visually-hidden">目盛り</span></th><th scope="col" class="ld-num">件数</th><th scope="col" class="ld-num">割合</th></tr></thead>
      <tbody>${d.types.length
        ? d.types.map(
            (t) => html`<tr><th scope="row">${listLink(ctx, t.link, t.type, { cls: 'll-link', hint: `${t.type} ${t.count}件の一覧` })}</th><td>${ticks(t.count, max)}</td>
              <td class="ld-num" ${typeMark(t.type)}>${t.count}</td><td class="ld-num ld-share" ${typeShareMark(t.type)}>${t.shareText}</td></tr>`,
          )
        : html`<tr><td colspan="4" class="ld-empty">この条件に該当する申請はありません。</td></tr>`}</tbody>
    </table></section>`;
}

export function dashboardPage(model, ctx, title) {
  const d = model.dashboard;
  return html`${head(d, ctx, title)}${kpis(d, ctx)}
    <div class="ld-grid">
      <div class="ld-col">${months(d, ctx)}${statuses(d, ctx)}</div>
      ${types(d, ctx)}
    </div>`;
}
