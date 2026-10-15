// 装飾を抑えた素の HTML のダッシュボード。グラフもカードも使わず、見出し・表・文章だけで数値を示す。
// 比較の基準線として、「数値が読めること」を満たすのに最低限必要な構造を示す。

import { html } from '../html.js';
import { kpiMark, listLink, statusMark, statusShareMark, typeMark, typeShareMark } from './dash-common.js';

export function dashboardPage(model, ctx) {
  const d = model.dashboard;
  const pId = `${ctx.uid}-plain-period`;
  const dId = `${ctx.uid}-plain-dept`;
  return html`
    <h2 tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
    <form aria-label="集計条件">
      <p>
        <label for="${pId}">対象期間</label>
        <select id="${pId}" data-bind="period">${d.periodOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}</select>
        <label for="${dId}">担当課</label>
        <select id="${dId}" data-bind="dept">${d.deptOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}</select>
        <button type="button" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>リセット</button>
      </p>
    </form>
    <p>集計条件：${d.scopeText}（基準日：${d.refDate}）</p>

    <h3>主な数字</h3>
    <table>
      <thead><tr><th scope="col">指標</th><th scope="col">値</th><th scope="col">説明</th><th scope="col">一覧</th></tr></thead>
      <tbody>
        ${d.kpis.map(
          (k) => html`
            <tr>
              <th scope="row">${k.label}</th>
              <td><span ${kpiMark(k.key)}>${k.value}</span>${k.unit}</td>
              <td>${k.note}</td>
              <td>${listLink(ctx, k.link, '表示', { hint: `${k.label} ${k.value}件の一覧` })}</td>
            </tr>`,
        )}
      </tbody>
    </table>

    <h3>月別の受付件数</h3>
    <table>
      <thead><tr><th scope="col">月</th><th scope="col">受付件数</th></tr></thead>
      <tbody>${d.months.map((m) => html`<tr><th scope="row">${m.label}</th><td><span data-month="${m.key}">${m.count}</span>件</td></tr>`)}</tbody>
      <tfoot><tr><th scope="row">合計</th><td>${d.total}件</td></tr></tfoot>
    </table>

    <h3>処理状況</h3>
    <table>
      <thead><tr><th scope="col">処理状態</th><th scope="col">件数</th><th scope="col">割合</th><th scope="col">一覧</th></tr></thead>
      <tbody>
        ${d.statuses.map(
          (s) => html`
            <tr>
              <th scope="row">${s.label}</th>
              <td><span ${statusMark(s.value)}>${s.count}</span>件</td>
              <td><span ${statusShareMark(s.value)}>${s.shareText}</span></td>
              <td>${s.count ? listLink(ctx, s.link, '表示', { hint: `${s.label} ${s.count}件の一覧` }) : ''}</td>
            </tr>`,
        )}
      </tbody>
    </table>

    <h3>申請種別別の件数</h3>
    ${d.types.length === 0
      ? html`<p>該当する申請はありません。</p>`
      : html`
          <table>
            <thead><tr><th scope="col">順位</th><th scope="col">申請種別</th><th scope="col">件数</th><th scope="col">割合</th><th scope="col">一覧</th></tr></thead>
            <tbody>
              ${d.types.map(
                (t) => html`
                  <tr>
                    <td>${t.rank}</td>
                    <th scope="row">${t.type}</th>
                    <td><span ${typeMark(t.type)}>${t.count}</span>件</td>
                    <td><span ${typeShareMark(t.type)}>${t.shareText}</span></td>
                    <td>${listLink(ctx, t.link, '表示', { hint: `${t.type} ${t.count}件の一覧` })}</td>
                  </tr>`,
              )}
            </tbody>
          </table>`}

    <h3>集計の見方</h3>
    <ul>${d.definitions.map((x) => html`<li>${x.term}：${x.text}</li>`)}</ul>`;
}
