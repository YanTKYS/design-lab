// ドキュメントのリンク切れと、登録済みデザインとの記述のずれを検出する。

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DESIGNS } from '../../site/assets/js/designs/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = ['README.md', 'CHANGELOG.md', ...readdirSync(join(ROOT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const withoutCode = (text) => text.replace(/```[\s\S]*?```/g, '');

/** GitHub の見出しアンカーと同じ規則（小文字化、記号の除去、空白をハイフンに）。 */
const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\- ]/gu, '')
    .replace(/ /g, '-');
const anchors = (text) => new Set([...withoutCode(text).matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1])));

for (const file of DOCS) {
  test(`${file}: 相対リンクの参照先と見出しが存在する`, () => {
    const text = read(file);
    for (const [, target] of withoutCode(text).matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const [path, hash] = target.split('#');
      const dest = path ? join(dirname(join(ROOT, file)), decodeURI(path)) : join(ROOT, file);
      assert.ok(existsSync(dest), `${file}: ${target} の参照先がない`);
      if (hash && dest.endsWith('.md')) {
        assert.ok(anchors(readFileSync(dest, 'utf8')).has(decodeURI(hash)), `${file}: ${target} の見出しがない`);
      }
    }
  });
}

test('README のデザイン数と対応デザインが登録済みのデザインと一致する', () => {
  const readme = read('README.md');
  assert.match(readme, new RegExp(`3画面・${DESIGNS.length}デザイン`));
  const line = readme.match(/^対応デザイン：(.+)$/m)[1];
  assert.equal(line.split('、').length, DESIGNS.length, '対応デザインの列挙数');
});

test('デザイン選定ガイドの一覧表に、登録済みの全デザインが 1 行ずつある', () => {
  const doc = read('docs/design-selection.md');
  const section = doc.split(/^## /m).find((s) => s.startsWith('3. '));
  const rows = section.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| デザイン') && !l.startsWith('| ---'));
  assert.equal(rows.length, DESIGNS.length, '表の行数');
  for (const d of DESIGNS) {
    assert.ok(rows.some((r) => r.includes(d.shortName) || r.includes(d.name)), `${d.id} の行`);
  }
});
