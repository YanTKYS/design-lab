// 糸の交点（仮称）：3画面で使う小さな表示部品。
import { attr, html, raw } from '../../assets/js/html.js';
import { icon } from '../../assets/js/icons.js';
import { formatDate } from '../../assets/js/query.js';

export const date = (iso) => formatDate(iso, 'slash');

const STATUS_ICONS = { received: 'inbox', reviewing: 'clock', returned: 'alert', approved: 'check', rejected: null };

/** 処理状態：正式名を常に出し、アイコンと枠の形でも区別する（色だけに頼らない）。 */
export function badge(status) {
  const name = STATUS_ICONS[status.value];
  return html`<span class="th-badge" data-status="${status.value}">${name ? icon(name, { size: 14, stroke: 2 }) : ''}${status.label}</span>`;
}

/** 章見出しの前の小さな交点の印（装飾）。 */
export const mark = raw(
  '<svg class="th-mark" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true" focusable="false"><path d="M1 4h10M1 8h10M4 1v10M8 1v10"/></svg>',
);

/** 一覧へ移る文字リンク。data-link-* に引き継ぐ条件を持たせ、下線付きの文字で示す。 */
export function listLink(link, text, hint = '') {
  return html`<a class="th-link" href="#" data-action="open-list" ${attr('data-link-status', link.status || null)} ${attr('data-link-group', link.group || null)} ${attr('data-link-type', link.type || null)}>${text}${hint ? html`<span class="th-vh">（${hint}）</span>` : ''}</a>`;
}
