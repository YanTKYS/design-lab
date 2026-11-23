/*
 * 標示盤（仮称・L案）— 5×7 のドット文字を SVG の文字列にする小さな関数（自作）。
 * 使える文字：0〜9、小数点（.）、ダッシュ（—）。それ以外と、桁をそろえるための空きは「消灯の桁」になる。
 * 返す SVG は装飾（aria-hidden）。数値は、呼び出し側が読み上げられる文字として別に1回だけ置くこと。
 *
 * 使い方（モジュールにしていないので file:// でも読み込める）：
 *   <script src="dot-digits.js"></script>
 *   el.innerHTML = dotDigits(8, { width: 2, className: 'l-dots' });   // 「 8」：左は消灯の桁（0 で埋めない）
 *   // CSS：.l-dots { height: 34px; width: calc(var(--w) * 34px / 7); } .l-dots .on { fill: …; } .l-dots .off { fill: …; opacity: .1; }
 */
(function (root) {
  'use strict';

  var GLYPHS = {
    0: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
    1: ['00110', '01110', '00110', '00110', '00110', '00110', '01111'],
    2: ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
    3: ['01110', '11011', '00011', '00110', '00011', '11011', '01110'],
    4: ['00011', '00111', '01011', '11011', '11111', '00011', '00011'],
    5: ['11111', '11000', '11110', '00011', '00011', '11011', '01110'],
    6: ['00110', '01100', '11000', '11110', '11011', '11011', '01110'],
    7: ['11111', '00011', '00110', '00110', '01100', '01100', '01100'],
    8: ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
    9: ['01110', '11011', '11011', '01111', '00011', '00110', '01100'],
    '.': ['00', '00', '00', '00', '00', '11', '11'],
    '—': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
  };

  /**
   * @param {number|string} value 表示する値（数値はそのまま、文字列は1字ずつ）
   * @param {{ width?: number, className?: string }} [options] width：左を消灯の桁で埋めて、この字数にそろえる（既定 2）
   * @returns {string} SVG の文字列（viewBox の横幅を style の --w にも入れる）
   */
  function dotDigits(value, options) {
    var opts = options || {};
    var width = Math.max(1, opts.width == null ? 2 : opts.width);
    var cls = String(opts.className || 'l-dots').replace(/[^\w -]/g, '');
    var chars = String(value).split('');
    while (chars.length < width) chars.unshift(' ');
    var x = 0;
    var circles = [];
    chars.forEach(function (c) {
      var glyph = GLYPHS[c] || GLYPHS[' '];
      glyph.forEach(function (row, y) {
        row.split('').forEach(function (on, i) {
          circles.push('<circle cx="' + (x + i + 0.5) + '" cy="' + (y + 0.5) + '" r="0.38" class="' + (on === '1' ? 'on' : 'off') + '"/>');
        });
      });
      x += glyph[0].length + 1;
    });
    var w = Math.max(1, x - 1);
    return '<svg class="' + cls + '" viewBox="0 0 ' + w + ' 7" style="--w:' + w + '" aria-hidden="true" focusable="false">' + circles.join('') + '</svg>';
  }

  root.dotDigits = dotDigits;
})(typeof window !== 'undefined' ? window : globalThis);
