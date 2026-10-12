// フォーム部品そのもの（input / select / textarea / checkbox）の出力。
// ラベルとの関連付け・aria 属性・状態の同期に必要な属性だけをここで揃え、
// 配置・ラベルの見せ方・補足・エラー表示はデザインごとに組み立てる。

import { attr, html } from '../html.js';

export const fieldId = (ctx, prefix, name) => `${ctx.uid}-${prefix}-${name}`;

/**
 * @param field   buildFormModel の項目（value / error / first を含む）
 * @param options id: 部品の id、describedBy: 補足・エラーの id（空白区切り）、cls: 種類ごとの class、
 *                placeholder: 入力例などを欄の中に出すとき（text / textarea のみ）
 */
export function control(field, { id, describedBy = '', cls = {}, placeholder = '' }) {
  const common = html`id="${id}" data-field="${field.name}" ${attr('aria-describedby', describedBy || null)} ${attr('aria-invalid', field.error && 'true')} ${attr('aria-required', field.required && 'true')} ${attr('data-focus', field.first && 'first-error')}`;

  switch (field.control) {
    case 'select':
      return html`
        <select class="${cls.select ?? ''}" ${common}>
          <option value="" ${field.value === '' ? 'selected' : ''}>${field.placeholder}</option>
          ${field.options.map((o) => html`<option value="${o}" ${field.value === o ? 'selected' : ''}>${o}</option>`)}
        </select>`;
    case 'textarea':
      // 先頭の改行は HTML パーサーに 1 つ無視されるため、値の先頭が改行でも保たれるよう 1 つ足す
      return html`<textarea class="${cls.textarea ?? ''}" rows="${field.rows}" ${common} ${attr('placeholder', placeholder || null)}>
${field.value}</textarea>`;
    case 'checkbox':
      return html`<input class="${cls.checkbox ?? ''}" type="checkbox" ${common} ${field.value ? 'checked' : ''} />`;
    default:
      return html`<input
        class="${cls.input ?? ''}"
        type="${field.control}"
        ${common}
        ${attr('autocomplete', field.autocomplete)}
        ${attr('placeholder', placeholder || null)}
        ${field.control === 'email' ? html`spellcheck="false" autocapitalize="off" inputmode="email"` : ''}
        ${field.control === 'tel' ? html`inputmode="tel"` : ''}
        value="${field.value}"
      />`;
  }
}

/** 補足（hint）とエラーの id を、aria-describedby に渡す文字列にまとめる。 */
export const describedBy = (...ids) => ids.filter(Boolean).join(' ');
