// Agent Skills の形式（SKILL.md の frontmatter・相対リンク）と、適用見本へのコピーのずれを検出する。

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

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

test('skills/README.md と適用見本の記録の相対リンクが存在する', () => {
  for (const file of ['skills/README.md', 'examples/okinawa-thread-memo/VERIFICATION.md']) {
    const text = readFileSync(join(ROOT, file), 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      assert.ok(existsSync(join(dirname(join(ROOT, file)), decodeURI(target.split('#')[0]))), `${file}: ${target} の参照先がない`);
    }
  }
});

test('適用見本の assets は Skill の assets と同じ内容', () => {
  for (const f of ['tokens.css', 'thread-pattern.svg']) {
    assert.equal(
      readFileSync(join(ROOT, 'examples/okinawa-thread-memo/assets', f), 'utf8'),
      readFileSync(join(SKILLS, 'okinawa-thread-ui/assets', f), 'utf8'),
      f,
    );
  }
});
