// 実験中の独立した試作：H′・J・K・L（いずれも仮称）のダッシュボード。
// 4案の画面（view）は共通の buildDashboardModel の値をそのまま出すだけであることを、条件を変えた描画結果で確かめる。
// 0件（UI の期間×担当課では起きないため、空のデータで作る）でも NaN や誤った 100% を出さず「—」で示すことも確かめる。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aggregate, buildDashboardModel, percentText } from '../../site/assets/js/dashboard.js';
import { APPLICATIONS } from '../../site/assets/js/data.js';
import { view as hView } from '../../site/experiments/h-prime-dashboard/h-dash-view.js';
import { view as jView } from '../../site/experiments/j-risograph-dashboard/j-dash-view.js';
import { curve, points, view as kView } from '../../site/experiments/k-shoreline-dashboard/k-dash-view.js';
import { view as lView } from '../../site/experiments/l-signage-dashboard/l-dash-view.js';

const VIEWS = [
  ['折本（H′）', hView],
  ['二色刷り（J）', jView],
  ['汀線（K）', kView],
  ['標示盤（L）', lView],
];
const CONDITIONS = [
  { period: 'fy', dept: '' },
  { period: 'q2', dept: '市民課' },
  { period: 'h1', dept: 'こども家庭課' },
  { period: 'm3', dept: '都市計画課' },
];
const render = (v, d) => v(d, { layout: 'wide' }).toString();
const read = (out, attrName, key) => {
  const re = new RegExp(`${attrName}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([^<]*)<`);
  return out.match(re)?.[1]?.trim();
};
const text = (out) => out.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

for (const [name, v] of VIEWS) {
  for (const c of CONDITIONS) {
    test(`${name}: ${c.period}/${c.dept || '全課'} の指標・月別・処理状態・種別が共通の集計と一致する`, () => {
      const out = render(v, buildDashboardModel(c));
      const a = aggregate(APPLICATIONS, c);
      assert.equal(read(out, 'data-kpi', 'total'), String(a.total));
      assert.equal(read(out, 'data-kpi', 'pending'), String(a.pending));
      assert.equal(read(out, 'data-kpi', 'done'), String(a.done));
      assert.equal(read(out, 'data-kpi', 'rate'), percentText(a.rateTenths));
      for (const m of a.months) assert.equal(read(out, 'data-month', m.key), String(m.count), `月 ${m.key}`);
      assert.equal([...out.matchAll(/data-month="/g)].length, a.months.length, '対象期間の月だけを出す');
      for (const s of a.statuses) {
        assert.equal(read(out, 'data-status', s.value), String(s.count), `状態 ${s.value}`);
        assert.equal(read(out, 'data-status-share', s.value), percentText(s.tenths), `割合 ${s.value}`);
      }
      assert.equal([...out.matchAll(/data-type-count="/g)].length, a.types.length);
      for (const t of a.types) {
        assert.equal(read(out, 'data-type-count', t.type), String(t.count), `種別 ${t.type}`);
        assert.equal(read(out, 'data-type-share', t.type), percentText(t.tenths), `種別の割合 ${t.type}`);
      }
    });
  }

  test(`${name}: 既定（令和8年度・すべての担当課）は 71／19／52／73.2%`, () => {
    const out = render(v, buildDashboardModel({ period: 'fy', dept: '' }));
    assert.deepEqual(['total', 'pending', 'done', 'rate'].map((k) => read(out, 'data-kpi', k)), ['71', '19', '52', '73.2%']);
    assert.match(out, /data-action="reset"[^>]*aria-disabled="true"/, '既定のときは「既定に戻す」を押せない状態で示す');
  });

  test(`${name}: 0件でも NaN や 100% を出さず、割合は「—」、種別は「該当なし」を示す`, () => {
    const out = render(v, buildDashboardModel({ period: 'q2', dept: '' }, []));
    assert.doesNotMatch(out, /NaN|Infinity|undefined/);
    assert.doesNotMatch(text(out), /100(\.0)?%/);
    for (const k of ['total', 'pending', 'done']) assert.equal(read(out, 'data-kpi', k), '0');
    assert.equal(read(out, 'data-kpi', 'rate'), '—');
    for (const s of ['received', 'reviewing', 'returned', 'approved', 'rejected']) assert.equal(read(out, 'data-status-share', s), '—');
    for (const key of ['2026-07', '2026-08', '2026-09']) assert.equal(read(out, 'data-month', key), '0');
    assert.match(text(out), /この条件に該当する申請はありません。/);
  });

  test(`${name}: 指標から一覧へのリンクは置かない（集計条件の欄と既定に戻すだけ）`, () => {
    const out = render(v, buildDashboardModel({ period: 'fy', dept: '' }));
    assert.doesNotMatch(out, /<a\b/);
    assert.doesNotMatch(out, /一覧を見る/);
    assert.match(out, /data-bind="period"/);
    assert.match(out, /data-bind="dept"/);
  });
}

test('汀線（K）: 月別の曲線は、隣り合う2か月の値の範囲からはみ出さない', () => {
  for (const c of CONDITIONS) {
    const d = buildDashboardModel(c);
    const pts = points(d.months);
    const path = curve(pts);
    const segments = [...path.matchAll(/C([\d. -]+)/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
    assert.equal(segments.length, pts.length - 1);
    segments.forEach(([, c1y, , c2y], i) => {
      // ベジェ曲線は制御点の凸包に収まるので、制御点が両端の値の間にあれば曲線もその間にある
      const [a, b] = [100 - pts[i].y, 100 - pts[i + 1].y];
      const [lo, hi] = [Math.min(a, b) - 0.01, Math.max(a, b) + 0.01];
      for (const y of [c1y, c2y]) assert.ok(y >= lo && y <= hi, `${c.period}/${c.dept || '全課'} ${i}〜${i + 1}か月目: ${y} が ${lo}〜${hi} の外`);
    });
  }
});

for (const [name, v] of VIEWS.slice(0, 3)) {
  test(`${name}: 申請種別の棒は、隣の割合と同じ「受付総数に対する構成比」で描く`, () => {
    const width = (out, type) => out.match(new RegExp(`<th scope="row">${type}</th><td><span[^>]*><i style="width:([\\d.]+)%`))?.[1];
    assert.equal(width(render(v, buildDashboardModel({ period: 'fy', dept: '' })), '住民票の写し等交付申請'), '18.3'); // 13件／71件
    assert.equal(width(render(v, buildDashboardModel({ period: 'q2', dept: '市民課' })), '住民票の写し等交付申請'), '100.0'); // 8件／8件
  });
}

test('汀線（K）: 0件の月は点・縦の線・面を基準線に置き、件数に比例して立ち上げる', () => {
  const d = buildDashboardModel({ period: 'fy', dept: '都市計画課' });
  const out = render(kView, d);
  const zero = d.months.filter((m) => m.count === 0);
  assert.ok(zero.length > 0, 'この条件には0件の月がある');
  for (const m of d.months) {
    const y = Number(out.match(new RegExp(`--y:([\\d.]+)%"[^>]*>(?:(?!</li>).)*data-month="${m.key}"`, 's'))?.[1]);
    assert.ok(Math.abs(y - m.ratio * 78) < 0.01, `${m.key}: ${y}`);
    if (m.count === 0) assert.equal(y, 0, `${m.key} は基準線`);
  }
});
