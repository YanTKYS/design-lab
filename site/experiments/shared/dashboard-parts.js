// ダッシュボードの独立試作（H′・J・K・L）の view が共通に使う、DOM に依存しない部品。
// view をブラウザ外（ユニットテスト）でも描画できるよう、制御（dashboard-poc.js）とは分けている。

import { html } from '../../assets/js/html.js';

/** 集計条件の欄（対象期間・担当課・既定に戻す）。見た目は prefix の class で各案が決める。 */
export function conditionFields(d, prefix) {
  return html`<div class="${prefix}-cond__field"><label for="${prefix}-period">対象期間</label>
      <select id="${prefix}-period" data-bind="period">${d.periodOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}</select></div>
    <div class="${prefix}-cond__field"><label for="${prefix}-dept">担当課</label>
      <select id="${prefix}-dept" data-bind="dept">${d.deptOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`)}</select></div>
    <button type="button" class="${prefix}-reset" data-action="reset" aria-disabled="${String(d.isDefault)}">既定に戻す</button>`;
}

/**
 * 割合（受付総数に対する構成比）を棒の長さ 0〜1 にする。共通モデルの tenths（0.1% 単位、0件なら null）をそのまま使い、
 * 隣に出す割合の文字（shareText）と同じ尺度にする。共通モデルの types[].ratio は「最多の種別＝1」なので棒には使わない。
 */
export const shareRatio = (item) => (item.tenths == null ? 0 : item.tenths / 1000);

/** 状態の記号（色に頼らない手がかり）。 */
export const STATUS_MARK = { received: '○', reviewing: '◐', returned: '△', approved: '●', rejected: '×' };

/** 処理状態を、処理待ち（受付済・審査中・補正依頼）と処理完了（承認済・却下）に分ける。件数・割合は共通モデルの値のまま。 */
export const statusGroups = (d) => [
  { key: 'pending', label: '処理待ち', items: d.statuses.filter((s) => ['received', 'reviewing', 'returned'].includes(s.value)) },
  { key: 'done', label: '処理完了', items: d.statuses.filter((s) => ['approved', 'rejected'].includes(s.value)) },
];
