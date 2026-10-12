// テンプレートリテラル用の小さなヘルパー。差し込み値は既定でエスケープする。

class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export const raw = (value) => new Raw(String(value));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

function toHtml(value) {
  if (value == null || value === false || value === true) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(toHtml).join('');
  return escapeHtml(value);
}

/** html`<p>${text}</p>` — 戻り値は Raw なので入れ子にしても二重エスケープされない。 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += toHtml(values[i]) + strings[i + 1];
  return new Raw(out);
}

/** 真の値を持つキーだけをクラス名として連結する。 */
export const cx = (...parts) =>
  parts
    .flatMap((p) => (p && typeof p === 'object' ? Object.entries(p).filter(([, v]) => v).map(([k]) => k) : [p]))
    .filter(Boolean)
    .join(' ');
