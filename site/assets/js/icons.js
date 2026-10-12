// 独自に作図した簡易アイコン（24×24 の線画）。各公式アイコンセットの複製ではない。

import { raw } from './html.js';

const PATHS = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  arrowsUpDown: '<path d="M8 20V4M4 8l4-4 4 4M16 4v16M12 16l4 4 4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6M3 20h18"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3M12 16.5v.01"/>',
  home: '<path d="m4 11 8-7 8 7M6 9.5V20h12V9.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4.5M12 17v.01"/>',
  xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  inbox: '<path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20"/><path d="M6.5 5h11L20 13v6H4v-6z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
};

/** ステータスの意味（tone）に対応するアイコン名。色だけに頼らない表示に使う。 */
export const TONE_ICONS = {
  info: 'inbox',
  progress: 'clock',
  warning: 'alert',
  success: 'checkCircle',
  error: 'xCircle',
  neutral: 'list',
};

export function icon(name, { size = 20, stroke = 1.75, label = '', className = '' } = {}) {
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return raw(
    `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${PATHS[name] ?? ''}</svg>`,
  );
}
