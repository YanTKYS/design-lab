// ダッシュボード描画の共通の小道具（構造は共通化せず、リンクと集計値の印だけを揃える）。

import { attr, html } from '../html.js';

/** 集計値を出力するテキストに付ける印（テストと「グラフの数値をテキストで確認できる」ことの検証に使う）。 */
export const kpiMark = (key) => attr('data-kpi', key);
export const statusMark = (value) => attr('data-status', value);
export const statusShareMark = (value) => attr('data-status-share', value);
export const typeMark = (type) => attr('data-type-count', type);
export const typeShareMark = (type) => attr('data-type-share', type);

/**
 * 指標から申請一覧への遷移リンク。同じ集計条件で絞り込んだ一覧を開く。
 * hint は読み上げ用の補足（視覚的には隠す）。link が null のときはリンクにしない。
 */
export function listLink(ctx, link, text, { cls = '', hint = '' } = {}) {
  if (!link) return '';
  return html`<a class="${cls}" href="${ctx.listHref(link)}" data-action="open-list" ${attr('data-link-status', link.status || null)} ${attr('data-link-group', link.group || null)} ${attr('data-link-type', link.type || null)}>${text}${hint ? html`<span class="visually-hidden">（${hint}）</span>` : ''}</a>`;
}

/** 一覧側に出す「ダッシュボードから引き継いだ絞り込み」の文言。 */
export const scopeSentence = (scope) => scope.items.map((i) => `${i.label}：${i.text}`).join(' ／ ');
