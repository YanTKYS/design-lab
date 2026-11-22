// 汀線（k-shoreline）の月別グラフ：点の位置は件数に比例し0件は基準線、曲線は隣り合う月の範囲からはみ出さない。
// 左右比較でも clipPath の ID がペインごとに分かれる。数値そのものの一致は designs.dashboard.test.mjs で全デザイン共通に確かめている。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDashboardModel } from '../../site/assets/js/dashboard.js';
import { DEFAULT_SORT } from '../../site/assets/js/data.js';
import kShoreline from '../../site/assets/js/designs/k-shoreline.js';
import { curve, points } from '../../site/assets/js/designs/k-shoreline.dashboard.js';
import { buildModel } from '../../site/assets/js/query.js';

const CONDITIONS = [
  { period: 'fy', dept: '' },
  { period: 'fy', dept: '都市計画課' },
  { period: 'q2', dept: '市民課' },
  { period: 'm3', dept: 'こども家庭課' },
];

test('月別の点：件数に比例し、0件の月は基準線（y=0）', () => {
  for (const c of CONDITIONS) {
    const d = buildDashboardModel(c);
    for (const p of points(d.months)) {
      assert.ok(Math.abs(p.y - p.m.ratio * 78) < 1e-9, `${c.period}/${c.dept} ${p.m.key}`);
      if (p.m.count === 0) assert.equal(p.y, 0);
    }
  }
  assert.ok(buildDashboardModel(CONDITIONS[1]).months.some((m) => m.count === 0), '0件の月を含む条件で確かめている');
});

test('月別の曲線：制御点が隣り合う2か月の値の範囲に収まる（実在しない山・谷を作らない）', () => {
  for (const c of CONDITIONS) {
    const pts = points(buildDashboardModel(c).months);
    const segments = [...curve(pts).matchAll(/C([\d. -]+)/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
    assert.equal(segments.length, pts.length - 1);
    segments.forEach(([, c1y, , c2y], i) => {
      const [a, b] = [100 - pts[i].y, 100 - pts[i + 1].y];
      for (const y of [c1y, c2y]) assert.ok(y >= Math.min(a, b) - 0.01 && y <= Math.max(a, b) + 0.01, `${c.period}/${c.dept} ${i}: ${y}`);
    });
  }
});

test('左右のペインで clipPath の ID が分かれ、それぞれ自分の ID を参照する', () => {
  const state = { screen: 'dashboard', keyword: '', status: '', sort: DEFAULT_SORT, detail: null, notice: null, period: 'fy', dept: '' };
  const model = { ...buildModel(state), dashboard: buildDashboardModel(state) };
  const ids = ['p0', 'p1'].map((uid) => {
    const out = kShoreline.render(model, { uid, ui: {}, href: () => '?', navHref: () => '?', listHref: () => '?' }).toString();
    const id = out.match(/<clipPath id="([^"]+)"/)[1];
    assert.ok(out.includes(`clip-path="url(#${id})"`));
    return id;
  });
  assert.notEqual(ids[0], ids[1]);
});
