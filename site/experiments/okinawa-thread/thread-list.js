// 糸の交点（仮称）：申請一覧。Astra のモックにない画面のため、B案の造形規則（縦の項目軸・横罫・交点の読み順）を展開した。
// 検索・件数・並べ替えは共通の query.js（buildModel）の結果をそのまま表示する。

import { COLUMNS } from '../../assets/js/data.js';
import { attr, html } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { countText } from '../../assets/js/query.js';
import { badge, date, mark } from './thread-parts.js';

/** 番号と状態を先に読み、続けて申請者・種別・受付日を読む列の順。 */
const ORDER = ['id', 'status', 'applicant', 'type', 'receivedAt'];

function conditions(model, layout) {
  return html`<div class="th-cond">
    <form class="th-search" role="search" aria-label="申請の検索" data-form="search">
      <label class="th-label" for="th-kw">キーワード</label>
      <div class="th-search__row">
        <input class="th-input" id="th-kw" type="search" value="${model.keyword}" aria-describedby="th-kw-help" autocomplete="off" />
        <button type="submit" class="th-btn th-btn--primary">検索</button>
      </div>
      <p class="th-help" id="th-kw-help">受付番号・申請者名（ふりがな可）・申請種別・担当課で探せます。</p>
    </form>
    ${layout === 'wide'
      ? html`<fieldset class="th-status">
          <legend class="th-label">処理状態</legend>
          <div class="th-status__items">
            ${model.statusOptions.map(
              (o) => html`<label class="th-status__item ${o.selected ? 'is-selected' : ''}">
                <input type="radio" name="th-status" value="${o.value}" data-bind="status" ${o.selected ? 'checked' : ''} />
                <span class="th-status__label">${o.selected ? icon('check', { size: 14, stroke: 2.5 }) : ''}${o.label}</span><span class="th-num th-status__count">${o.count}<span class="th-vh">件</span></span>
              </label>`,
            )}
          </div>
        </fieldset>`
      : html`<div class="th-field-inline">
          <label class="th-label" for="th-status-select">処理状態</label>
          <select class="th-select" id="th-status-select" data-bind="status">
            ${model.statusOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}（${o.count}件）</option>`)}
          </select>
        </div>`}
  </div>`;
}

function resultHead(model) {
  const status = model.statusOptions.find((o) => o.selected && o.value);
  const terms = [model.keyword && `「${model.keyword}」`, status?.label].filter(Boolean);
  return html`<div class="th-result-head">
      <h2 class="th-chapter" id="th-result-title" tabindex="-1">${mark}申請台帳</h2>
      <p class="th-count"><strong class="th-num th-count__num">${model.shown}</strong>件<span class="th-count__total">／ ${model.scope.active ? '引き継いだ条件の' : ''}全${model.total}件</span></p>
    </div>
    ${model.scope.active
      ? html`<div class="th-scope" data-scope>
          <p class="th-scope__title">ダッシュボードから引き継いだ条件</p>
          <ul>${model.scope.items.map((i) => html`<li>${i.label}：<strong>${i.text}</strong></li>`)}</ul>
          <button type="button" class="th-btn th-btn--ghost th-btn--sm" data-action="clear-scope">引き継ぎを解除</button>
        </div>`
      : ''}
    <div class="th-filterline">
      ${model.filtered
        ? html`<p><span class="th-filterline__tag">絞り込み中</span>${terms.join(' ・ ')}</p>
            <button type="button" class="th-btn th-btn--text" data-action="clear">条件をクリア</button>`
        : html`<p class="th-muted">検索語・処理状態の絞り込みなし</p>`}
    </div>`;
}

function sortControls(model) {
  const asc = model.sort.dir === 'asc';
  return html`<div class="th-sort">
    <label class="th-label" for="th-sort-key">並べ替え</label>
    <select class="th-select th-select--sm" id="th-sort-key" data-bind="sort-key">
      ${ORDER.map((k) => COLUMNS.find((c) => c.key === k)).map((c) => html`<option value="${c.key}" ${c.key === model.sort.key ? 'selected' : ''}>${c.label}</option>`)}
    </select>
    <button type="button" class="th-btn th-btn--ghost th-btn--sm" data-action="sort-dir">
      ${icon(asc ? 'arrowUp' : 'arrowDown', { size: 14, stroke: 2 })}${asc ? '昇順' : '降順'}<span class="th-vh">（押すと${asc ? '降順' : '昇順'}に切り替え）</span>
    </button>
  </div>`;
}

function toggle(row, open) {
  return html`<button
    type="button"
    class="th-btn th-btn--ghost th-btn--sm"
    data-action="toggle-detail"
    data-id="${row.id}"
    aria-expanded="${open ? 'true' : 'false'}"
    ${attr('aria-controls', open && `th-detail-${row.id}`)}
  >${icon(open ? 'chevronUp' : 'chevronDown', { size: 14, stroke: 2 })}${open ? '閉じる' : '詳細'}<span class="th-vh">（${row.id}）</span></button>`;
}

/** 選んだ記録の直下に、同じ「項目名｜値」の軸で詳細を差し込む。 */
function detail(d) {
  const items = [
    ['担当課', d.department],
    ['受付方法', d.channel],
    ['処理期限', html`<span class="th-num">${date(d.dueAt)}</span>`],
    ['備考', d.note || 'なし'],
  ];
  return html`<section class="th-detail" id="th-detail-${d.id}" aria-labelledby="th-detail-title-${d.id}" data-detail="${d.id}">
    <div class="th-detail__head">
      <h3 class="th-detail__title" id="th-detail-title-${d.id}" tabindex="-1">申請詳細<span class="th-num">（${d.id}）</span></h3>
      <button type="button" class="th-btn th-btn--ghost th-btn--sm" data-action="close-detail">${icon('chevronUp', { size: 14, stroke: 2 })}詳細を閉じる</button>
    </div>
    <dl class="th-axis">
      ${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}
    </dl>
  </section>`;
}

function cell(key, r) {
  if (key === 'id') return html`<td class="th-num th-strong">${r.id}</td>`;
  if (key === 'status') return html`<td>${badge(r.status)}</td>`;
  if (key === 'receivedAt') return html`<td class="th-num">${date(r.receivedAt)}</td>`;
  return html`<td>${r[key]}</td>`;
}

function table(model) {
  const cols = ORDER.map((k) => model.columns.find((c) => c.key === k));
  const arrow = (c) => icon(c.sorted === 'asc' ? 'arrowUp' : c.sorted === 'desc' ? 'arrowDown' : 'arrowsUpDown', { size: 14, stroke: 2 });
  return html`<table class="th-ledger">
    <caption class="th-vh">申請（${countText(model)}）。列見出しのボタンで並べ替えできます。</caption>
    <thead>
      <tr>
        ${cols.map(
          (c) => html`<th scope="col" aria-sort="${c.ariaSort}" class="${c.sorted ? 'is-sorted' : ''}"><button type="button" class="th-sort-button" data-action="sort" data-key="${c.key}">${c.label}${arrow(c)}</button></th>`,
        )}
        <th scope="col" class="th-col-action"><span class="th-vh">詳細</span></th>
      </tr>
    </thead>
    <tbody>
      ${model.rows.length
        ? model.rows.map((r) => {
            const open = model.detail?.id === r.id;
            return html`<tr class="${open ? 'is-open' : ''}">${ORDER.map((k) => cell(k, r))}<td class="th-col-action">${toggle(r, open)}</td></tr>
              ${open ? html`<tr class="th-detail-row"><td colspan="6">${detail(model.detail)}</td></tr>` : ''}`;
          })
        : html`<tr><td colspan="6" class="th-empty">一致する申請はありません</td></tr>`}
    </tbody>
  </table>`;
}

/** 375px：5項目を省略せず「項目名｜値」の軸で縦に読む。 */
function cards(model) {
  if (!model.rows.length) return html`<p class="th-empty">一致する申請はありません</p>`;
  return html`<ol class="th-cards" aria-label="申請（${countText(model)}）">
    ${model.rows.map((r) => {
      const open = model.detail?.id === r.id;
      return html`<li class="th-card ${open ? 'is-open' : ''}">
        <dl class="th-axis th-axis--card">
          <div><dt>受付番号</dt><dd class="th-num th-strong">${r.id}</dd></div>
          <div><dt>処理状態</dt><dd>${badge(r.status)}</dd></div>
          <div><dt>申請者</dt><dd>${r.applicant}</dd></div>
          <div><dt>申請種別</dt><dd>${r.type}</dd></div>
          <div><dt>受付日</dt><dd class="th-num">${date(r.receivedAt)}</dd></div>
        </dl>
        ${open ? detail(model.detail) : html`<div class="th-card__actions">${toggle(r, open)}</div>`}
      </li>`;
    })}
  </ol>`;
}

export function listView(model, layout) {
  return html`${conditions(model, layout)}
    <section class="th-section th-section--ledger" aria-labelledby="th-result-title">
      ${resultHead(model)} ${layout === 'narrow' ? sortControls(model) : ''} ${layout === 'narrow' ? cards(model) : table(model)}
    </section>`;
}
