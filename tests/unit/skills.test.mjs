// Agent Skills の形式（SKILL.md の frontmatter・相対リンク）と、適用見本へのコピーのずれを検出する。

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

import { dots } from '../../site/assets/js/designs/l-signage.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKILLS = join(ROOT, 'skills');
const skillDirs = readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

/** 単純な YAML（キー: 値、1 段の入れ子）だけを読む。仕様の検査に必要な範囲に限る。 */
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'frontmatter がない');
  const data = {};
  let parent = null;
  for (const line of m[1].split('\n')) {
    const nested = line.match(/^ {2}([\w-]+):\s*(.*)$/);
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    const value = (v) => v.replace(/^"(.*)"$/, '$1');
    if (nested && parent) data[parent][nested[1]] = value(nested[2]);
    else if (top) {
      parent = top[2] === '' ? top[1] : null;
      data[top[1]] = top[2] === '' ? {} : value(top[2]);
    }
  }
  return data;
}

test('skills/ に Skill が 1 つ以上ある', () => {
  assert.ok(skillDirs.length > 0);
});

for (const name of skillDirs) {
  const dir = join(SKILLS, name);
  const skill = readFileSync(join(dir, 'SKILL.md'), 'utf8');

  test(`${name}: frontmatter が Agent Skills の仕様に合う`, () => {
    const fm = frontmatter(skill);
    assert.equal(fm.name, name, 'name とフォルダー名が一致する');
    assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'name は小文字英数字とハイフン（先頭・末尾・連続なし）');
    assert.ok(fm.name.length <= 64, 'name は 64 字以内');
    assert.ok(typeof fm.description === 'string' && fm.description.length >= 1 && fm.description.length <= 1024, 'description は 1〜1024 字');
    if (fm.compatibility) assert.ok(fm.compatibility.length <= 500, 'compatibility は 500 字以内');
    if (fm.metadata) for (const v of Object.values(fm.metadata)) assert.equal(typeof v, 'string', 'metadata の値は文字列');
    const allowed = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
    for (const key of Object.keys(fm)) assert.ok(allowed.includes(key), `未知のキー ${key}`);
  });

  test(`${name}: SKILL.md は 500 行未満で、相対リンクの参照先が Skill の中にある`, () => {
    assert.ok(skill.split('\n').length < 500);
    const files = [join(dir, 'SKILL.md'), ...readdirSync(join(dir, 'references')).map((f) => join(dir, 'references', f))];
    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
      for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const dest = resolve(dirname(file), decodeURI(target.split('#')[0]));
        assert.ok(existsSync(dest), `${file}: ${target} の参照先がない`);
        assert.ok(dest.startsWith(dir + '/'), `${file}: ${target} が Skill の外を指している`);
      }
    }
  });
}

// 適用見本（examples/<名前>/）と、その見本が使う Skill
const EXAMPLES = [
  { dir: 'examples/okinawa-thread-memo', skill: 'okinawa-thread-ui', assets: ['tokens.css', 'thread-pattern.svg'] },
  { dir: 'examples/h-prime-room-booking', skill: 'h-prime-ui', assets: ['tokens.css'] },
  { dir: 'examples/j-risograph-equipment-lending', skill: 'j-risograph-ui', assets: ['tokens.css'] },
  { dir: 'examples/k-shoreline-inquiry-tracker', skill: 'k-shoreline-ui', assets: ['tokens.css', 'k-shore.svg'] },
  { dir: 'examples/l-signage-counter-queue', skill: 'l-signage-ui', assets: ['tokens.css', 'dot-digits.js'] },
];

test('skills/README.md と適用見本の記録の相対リンクが存在する', () => {
  for (const file of ['skills/README.md', ...EXAMPLES.map((e) => `${e.dir}/VERIFICATION.md`)]) {
    const text = readFileSync(join(ROOT, file), 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      assert.ok(existsSync(join(dirname(join(ROOT, file)), decodeURI(target.split('#')[0]))), `${file}: ${target} の参照先がない`);
    }
  }
});

test('適用見本の assets は Skill の assets と同じ内容', () => {
  for (const { dir, skill, assets } of EXAMPLES) {
    for (const f of assets) {
      assert.equal(readFileSync(join(ROOT, dir, 'assets', f), 'utf8'), readFileSync(join(SKILLS, skill, 'assets', f), 'utf8'), `${dir}: ${f}`);
    }
  }
});

test('適用見本は比較サイト（site/）や外部のファイルを読み込まない', () => {
  for (const { dir } of EXAMPLES) {
    const html = readFileSync(join(ROOT, dir, 'index.html'), 'utf8');
    for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      assert.ok(!/^(https?:)?\/\//.test(url) && !url.startsWith('..') && !url.startsWith('/'), `${dir}: ${url}`);
      assert.ok(existsSync(join(ROOT, dir, url)), `${dir}: ${url} がない`);
    }
  }
});

test('l-signage-ui の dot-digits.js：比較サイトの標示盤と同じ字形で描き、1桁は 0 ではなく消灯の桁でそろえ、読み上げない', () => {
  const sandbox = {};
  runInNewContext(readFileSync(join(SKILLS, 'l-signage-ui/assets/dot-digits.js'), 'utf8'), sandbox);
  const { dotDigits } = sandbox;
  // 比較サイト（l-signage.js の dots）と同じ SVG になる（0〜99、小数、ダッシュ）
  for (const v of [...Array.from({ length: 100 }, (_, i) => i), '73.2', '—']) assert.equal(dotDigits(v), dots(v).toString(), String(v));
  // 桁数をそろえるときは、左に消灯の桁を足す（「008」ではなく「  8」）
  const lit = (svg) => (svg.match(/class="on"/g) ?? []).length;
  assert.equal(lit(dotDigits(8, { width: 3 })), lit(dotDigits(8)));
  assert.match(dotDigits(8, { width: 3 }), /viewBox="0 0 17 7"/);
  assert.notEqual(lit(dotDigits(8, { width: 3 })), lit(dotDigits('008')));
  assert.match(dotDigits(12), /aria-hidden="true"/);
  assert.match(dotDigits(1, { className: 'x" onload="y' }), /^<svg class="x onloady"/); // クラス名に属性を書き込めない
});
