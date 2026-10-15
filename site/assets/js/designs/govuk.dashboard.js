// GOV.UK Design System の考え方を参考にしたダッシュボード。
// 数値と説明を優先し、先頭に「何が分かるか」を文章で示す。グラフは月別の推移だけに限り（表の中の棒）、
// それ以外は見出し付きの表で示す。左側に絞り込み、右側に結果を置き、最後に「この数字の見方」で集計方法を説明する。
// カードやアイコンは使わず、数値は太字で大きく、説明は短い文で添える。

import { html } from '../html.js';
import { kpiMark, listLink, statusMark, statusShareMark, typeMark, typeShareMark } from './dash-common.js';

const TAG = { info: '', progress: 'gvk-tag--purple', warning: 'gvk-tag--orange', success: 'gvk-tag--green', error: 'gvk-tag--red' };

function filters(d, ctx) {
  const deptId = `${ctx.uid}-gvk-dept`;
  return html`
    <form class="gvk-filter" aria-label="集計条件">
      <h3 class="gvk-heading-m">集計条件</h3>
      <div class="gvk-form-group">
        <fieldset class="gvk-fieldset">
          <legend class="gvk-fieldset__legend">対象期間</legend>
          <div class="gvk-radios gvk-radios--small">
            ${d.periodOptions.map(
              (o, i) => html`
                <div class="gvk-radios__item">
                  <input class="gvk-radios__input" id="${ctx.uid}-gvk-pd-${i}" type="radio" name="${ctx.uid}-gvk-period" value="${o.value}" data-bind="period" ${o.selected ? 'checked' : ''} />
                  <label class="gvk-label gvk-radios__label" for="${ctx.uid}-gvk-pd-${i}">${o.label}</label>
                </div>`,
            )}
          </div>
        </fieldset>
      </div>
      <div class="gvk-form-group">
        <label class="gvk-label gvk-label--s" for="${deptId}">担当課</label>
        <select class="gvk-select" id="${deptId}" data-bind="dept">
          ${d.deptOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}
        </select>
      </div>
      <p class="gvk-body-s"><button type="button" class="gvk-link-button" data-action="reset-conditions" ${d.isDefault ? 'disabled' : ''}>条件をリセットする</button></p>
    </form>`;
}

/** 数値から、結果を文章で伝える（グラフを見なくても要点が分かるように）。 */
function summary(d) {
  if (d.total === 0) return html`<p class="gvk-body-l">${d.scopeText}に受け付けた申請はありません。</p>`;
  const peak = d.months.reduce((a, b) => (b.count > a.count ? b : a));
  return html`
    <p class="gvk-body-l">${d.scopeText}に受け付けた申請は<strong>${d.total}件</strong>です。このうち<strong>${d.done}件</strong>（${d.rate}）は処理が完了し、<strong>${d.pending}件</strong>が処理待ちです。</p>
    <p class="gvk-body">月別では${peak.label}が最も多く、${peak.count}件でした。</p>`;
}

function keyNumbers(d, ctx) {
  return html`
    <h3 class="gvk-heading-m">主な数字</h3>
    <dl class="gvk-numbers">
      ${d.kpis.map(
        (k) => html`
          <div class="gvk-numbers__row">
            <dt class="gvk-numbers__label">${k.label}</dt>
            <dd class="gvk-numbers__value"><span ${kpiMark(k.key)}>${k.value}</span>${k.unit ? html`<span class="gvk-numbers__unit">${k.unit}</span>` : ''}</dd>
            <dd class="gvk-numbers__note">${k.note}${k.link ? html`　${listLink(ctx, k.link, '申請の一覧を見る', { cls: 'gvk-link', hint: `${k.label} ${k.value}件` })}` : ''}</dd>
          </div>`,
      )}
    </dl>`;
}

function monthTable(d, ctx) {
  return html`
    <h3 class="gvk-heading-m" id="${ctx.uid}-gvk-month">月別の受付件数</h3>
    <p class="gvk-body">${d.period.rangeText}に受け付けた件数です。棒は最も多い月を基準にした長さです。</p>
    <table class="gvk-table" aria-labelledby="${ctx.uid}-gvk-month">
      <thead><tr><th scope="col" class="gvk-table__header">月</th><th scope="col" class="gvk-table__header gvk-num">受付件数</th><th scope="col" class="gvk-table__header"><span class="visually-hidden">件数の比較</span></th></tr></thead>
      <tbody>
        ${d.months.map(
          (m) => html`
            <tr>
              <th scope="row" class="gvk-table__cell gvk-table__rowhead">${m.label}</th>
              <td class="gvk-table__cell gvk-num"><span data-month="${m.key}">${m.count}</span>件</td>
              <td class="gvk-table__cell gvk-bar-cell" aria-hidden="true"><span class="gvk-bar" style="--r: ${m.ratio.toFixed(4)}"></span></td>
            </tr>`,
        )}
      </tbody>
      <tfoot><tr><th scope="row" class="gvk-table__cell">合計</th><td class="gvk-table__cell gvk-num">${d.total}件</td><td class="gvk-table__cell"></td></tr></tfoot>
    </table>`;
}

function statusTable(d, ctx) {
  return html`
    <h3 class="gvk-heading-m" id="${ctx.uid}-gvk-status">処理状況</h3>
    <p class="gvk-body">受付件数に対する、処理状態ごとの件数と割合です。</p>
    <table class="gvk-table" aria-labelledby="${ctx.uid}-gvk-status">
      <thead><tr><th scope="col" class="gvk-table__header">処理状態</th><th scope="col" class="gvk-table__header gvk-num">件数</th><th scope="col" class="gvk-table__header gvk-num">割合</th><th scope="col" class="gvk-table__header"><span class="visually-hidden">一覧</span></th></tr></thead>
      <tbody>
        ${d.statuses.map(
          (s) => html`
            <tr>
              <th scope="row" class="gvk-table__cell gvk-table__rowhead"><strong class="gvk-tag ${TAG[s.tone]}">${s.label}</strong></th>
              <td class="gvk-table__cell gvk-num"><span ${statusMark(s.value)}>${s.count}</span>件</td>
              <td class="gvk-table__cell gvk-num"><span ${statusShareMark(s.value)}>${s.shareText}</span></td>
              <td class="gvk-table__cell gvk-nowrap">${s.count ? listLink(ctx, s.link, '表示', { cls: 'gvk-link', hint: `${s.label} ${s.count}件の一覧` }) : ''}</td>
            </tr>`,
        )}
      </tbody>
    </table>`;
}

function typeTable(d, ctx) {
  return html`
    <h3 class="gvk-heading-m" id="${ctx.uid}-gvk-type">申請種別別の件数</h3>
    ${d.types.length === 0
      ? html`<p class="gvk-body">一致する申請はありません。</p>`
      : html`
          <p class="gvk-body">件数の多い順に並べています。</p>
          <table class="gvk-table" aria-labelledby="${ctx.uid}-gvk-type">
            <thead><tr><th scope="col" class="gvk-table__header">申請種別</th><th scope="col" class="gvk-table__header gvk-num">件数</th><th scope="col" class="gvk-table__header gvk-num">割合</th><th scope="col" class="gvk-table__header"><span class="visually-hidden">一覧</span></th></tr></thead>
            <tbody>
              ${d.types.map(
                (t) => html`
                  <tr>
                    <th scope="row" class="gvk-table__cell gvk-table__rowhead">${t.type}</th>
                    <td class="gvk-table__cell gvk-num"><span ${typeMark(t.type)}>${t.count}</span>件</td>
                    <td class="gvk-table__cell gvk-num"><span ${typeShareMark(t.type)}>${t.shareText}</span></td>
                    <td class="gvk-table__cell gvk-nowrap">${listLink(ctx, t.link, '表示', { cls: 'gvk-link', hint: `${t.type} ${t.count}件の一覧` })}</td>
                  </tr>`,
              )}
            </tbody>
          </table>`}`;
}

function howToRead(d) {
  return html`
    <div class="gvk-inset-text">
      <h3 class="gvk-heading-s">この数字の見方</h3>
      <ul class="gvk-list gvk-list--bullet">${d.definitions.map((x) => html`<li><strong>${x.term}</strong>：${x.text}</li>`)}</ul>
      <p class="gvk-body-s">基準日：${d.refDate}。データは架空です。</p>
    </div>`;
}

/** extra: 通知バナーなど、デザイン共通の枠が差し込む HTML */
export function dashboardPage(model, ctx, extra = '') {
  const d = model.dashboard;
  return html`
    <div class="gvk-main">
      ${extra}
      <span class="gvk-caption-l">${model.system.name}</span>
      <h2 class="gvk-heading-xl" tabindex="-1" data-focus="heading">申請処理ダッシュボード</h2>
      <div class="gvk-grid-row">
        <div class="gvk-grid-column-one-quarter">${filters(d, ctx)}</div>
        <div class="gvk-grid-column-three-quarters">
          ${summary(d)} ${keyNumbers(d, ctx)} ${monthTable(d, ctx)} ${statusTable(d, ctx)} ${typeTable(d, ctx)} ${howToRead(d)}
        </div>
      </div>
    </div>`;
}
