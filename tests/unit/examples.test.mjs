// Skill の適用見本（examples/）の検査。Skill の正本は YanTKYS/design-skills に移ったので、ここでは Skill そのものは調べない。
// 見本は Skill を作った当時の固定のコピー（assets/ を含む）で、design-skills の最新版との一致は求めない。
// 調べるのは、検証記録のリンク、見本が比較サイトや外部を読み込まずに file:// で開けること、標示盤のドット文字の字形。

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

import { dots } from '../../site/assets/js/designs/l-signage.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const EXAMPLES = [
  'examples/okinawa-thread-memo',
  'examples/h-prime-room-booking',
  'examples/j-risograph-equipment-lending',
  'examples/k-shoreline-inquiry-tracker',
  'examples/l-signage-counter-queue',
];

test('skills/README.md（移転の案内）と適用見本の検証記録の相対リンクが存在する', () => {
  for (const file of ['skills/README.md', ...EXAMPLES.map((dir) => `${dir}/VERIFICATION.md`)]) {
    const text = readFileSync(join(ROOT, file), 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      assert.ok(existsSync(join(dirname(join(ROOT, file)), decodeURI(target.split('#')[0]))), `${file}: ${target} の参照先がない`);
    }
  }
});

test('適用見本は比較サイト（site/）や外部のファイルを読み込まず、読み込むファイルが見本の中にある', () => {
  for (const dir of EXAMPLES) {
    const html = readFileSync(join(ROOT, dir, 'index.html'), 'utf8');
    for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      assert.ok(!/^(https?:)?\/\//.test(url) && !url.startsWith('..') && !url.startsWith('/'), `${dir}: ${url}`);
      assert.ok(existsSync(join(ROOT, dir, url)), `${dir}: ${url} がない`);
    }
  }
});

test('標示盤の見本の dot-digits.js：比較サイトの標示盤と同じ字形で描き、1桁は 0 ではなく消灯の桁でそろえ、読み上げない', () => {
  const sandbox = {};
  runInNewContext(readFileSync(join(ROOT, 'examples/l-signage-counter-queue/assets/dot-digits.js'), 'utf8'), sandbox);
  const { dotDigits } = sandbox;
  for (const v of [...Array.from({ length: 100 }, (_, i) => i), '73.2', '—']) assert.equal(dotDigits(v), dots(v).toString(), String(v));
  const lit = (svg) => (svg.match(/class="on"/g) ?? []).length;
  assert.equal(lit(dotDigits(8, { width: 3 })), lit(dotDigits(8)));
  assert.match(dotDigits(8, { width: 3 }), /viewBox="0 0 17 7"/);
  assert.notEqual(lit(dotDigits(8, { width: 3 })), lit(dotDigits('008')));
  assert.match(dotDigits(12), /aria-hidden="true"/);
  assert.match(dotDigits(1, { className: 'x" onload="y' }), /^<svg class="x onloady"/);
});
