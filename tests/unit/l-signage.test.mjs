// 標示盤（l-signage）のドット文字と「1目盛り＝1件」。数値そのものの一致は designs.dashboard.test.mjs で全デザイン共通に確かめている。
// ここでは、ドット文字が値の字形どおりで1桁を 0 で埋めないこと、点灯の数が件数と一致すること（0件を含む）、
// 数値の読み上げが1回だけであること（ドット文字・目盛り・見た目の単位は aria-hidden）を確かめる。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDashboardModel } from '../../site/assets/js/dashboard.js';
import { DEFAULT_SORT } from '../../site/assets/js/data.js';
import lSignage, { dots } from '../../site/assets/js/designs/l-signage.js';
import { buildModel } from '../../site/assets/js/query.js';

const ctx = (uid = 'p0') => ({ uid, ui: {}, href: () => '?', navHref: () => '?', listHref: () => '?' });
const dashboard = (c, apps) => {
  const state = { screen: 'dashboard', keyword: '', status: '', sort: DEFAULT_SORT, detail: null, notice: null, ...c };
  return lSignage.render({ ...buildModel(state), dashboard: buildDashboardModel(state, apps) }, ctx()).toString();
};
/** ドット文字の SVG から、桁ごとの点灯の並び（7段×幅）を取り出す。 */
function lit(svg) {
  const on = new Set([...svg.matchAll(/cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+" class="on"/g)].map((m) => `${Math.floor(m[1])},${Math.floor(m[2])}`));
  const width = Number(svg.match(/viewBox="0 0 (\d+) 7"/)[1]);
  return Array.from({ length: 7 }, (_, y) => Array.from({ length: width }, (_, x) => (on.has(`${x},${y}`) ? '1' : '0')).join(''));
}

test('ドット文字：1桁は左の桁を消灯にし、0 で埋めない（「8」が「08」と読めない）', () => {
  const eight = lit(dots(8).toString());
  for (const row of eight) assert.match(row, /^00000/, '左の桁はすべて消灯');
  assert.deepEqual(lit(dots('08').toString()).map((r) => r.slice(0, 5)), ['01110', '11011', '11011', '11011', '11011', '11011', '01110'], '比較：0 の字形');
  assert.deepEqual(eight.map((r) => r.slice(6)), ['01110', '11011', '11011', '01110', '11011', '11011', '01110'], '右の桁は 8');
  assert.match(dots('73.2').toString(), /viewBox="0 0 20 7"/, '7・3・小数点・2 の幅');
  assert.match(dots('—').toString(), /aria-hidden="true"/);
});

test('ダッシュボード：月別・種別の点灯の数が件数と一致する（1目盛り＝1件、0件は全消灯）', () => {
  for (const c of [{ period: 'fy', dept: '' }, { period: 'fy', dept: '都市計画課' }, { period: 'q2', dept: '市民課' }]) {
    const out = dashboard(c);
    const rows = [...out.matchAll(/<tr><th scope="row">[^<]*(?:<[^>]+>[^<]*)*?<\/th><td><span class="ld-ticks"[^>]*>(.*?)<\/span><\/td>\s*<td class="ld-num"[^>]*>(\d+)<\/td>/gs)];
    assert.ok(rows.length >= buildDashboardModel(c).months.length, `${c.period}/${c.dept}: 目盛りの行`);
    for (const [, cells, count] of rows) assert.equal((cells.match(/class="on"/g) ?? []).length, Number(count), `${c.period}/${c.dept}: ${count}件`);
    const m = buildDashboardModel(c);
    // 目盛りの数は最大値を5の倍数に切り上げたもの（どの値でも1目盛り＝1件のまま）
    assert.match(out, new RegExp(`--n:${Math.max(5, Math.ceil(m.monthMax / 5) * 5)}`));
  }
});

test('ダッシュボード：指標の数値は文字で1回だけ読み、ドット文字と見た目の単位は読み上げない', () => {
  const out = dashboard({ period: 'fy', dept: '' });
  const kpis = [...out.matchAll(/<dd class="ld-kpi__value">(.*?)<\/dd>/gs)].map((m) => m[1]);
  assert.equal(kpis.length, 4);
  for (const v of kpis) {
    assert.match(v, /<svg class="l-dots ld-kpi__dots"[^>]*aria-hidden="true"/);
    assert.match(v, /<span class="ld-kpi__unit" aria-hidden="true">/);
    const spoken = v.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<span class="ld-kpi__unit" aria-hidden="true">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '');
    assert.match(spoken.trim(), /^(\d+件|\d+\.\d%)$/, `読み上げ：${spoken.trim()}`);
  }
});

test('ダッシュボード：0件の指標と0件の状態は一覧へのリンクにしない', () => {
  const out = dashboard({ period: 'fy', dept: '廃棄物対策課' });
  assert.match(out, /data-kpi="pending">0</);
  assert.doesNotMatch(out, /class="ld-board"[\s\S]*data-link-group="pending"[\s\S]*<\/dl>/, '処理待ち0件の指標にリンクがない');
  assert.match(out, /data-link-group="done"/);
  const empty = dashboard({ period: 'q2', dept: '' }, []);
  assert.doesNotMatch(empty, /data-action="open-list"/, 'すべて0件ならリンクは1つもない');
});
