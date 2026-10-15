import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFINITIONS,
  DEFAULT_PERIOD,
  GROUPS,
  PERIODS,
  aggregate,
  buildDashboardModel,
  filterByScope,
  listStateFor,
  percentText,
  percentTenths,
} from '../../site/assets/js/dashboard.js';
import { APPLICATIONS, APPLICATION_TYPES, DEFAULT_SORT, DEPARTMENTS, REFERENCE_DATE, STATUSES } from '../../site/assets/js/data.js';
import { buildModel } from '../../site/assets/js/query.js';
import { defaultState } from '../../site/assets/js/state.js';

// 期待値はモジュールの定数を使わず、仕様どおりにテスト側で定義する
const PENDING = ['received', 'reviewing', 'returned']; // 受付済・審査中・補正依頼
const DONE = ['approved', 'rejected']; // 承認済・却下
const DEPTS = ['', ...DEPARTMENTS];
const CONDITIONS = PERIODS.flatMap((p) => DEPTS.map((dept) => ({ period: p.value, dept })));

/** 画面の集計とは独立に、生データを数え直す（期待値）。 */
function recount({ period, dept }) {
  const p = PERIODS.find((x) => x.value === period);
  const apps = APPLICATIONS.filter((a) => a.receivedAt >= p.from && a.receivedAt <= p.to && (!dept || a.department === dept));
  const by = (key) => apps.reduce((m, a) => m.set(a[key], (m.get(a[key]) ?? 0) + 1), new Map());
  return { apps, total: apps.length, status: by('status'), type: by('type') };
}

const listState = (conditions, extra = {}) => ({ ...defaultState(['dads', 'carbon']), screen: 'list', sort: DEFAULT_SORT, ...conditions, ...extra });

test('サンプルデータは一覧とダッシュボードで共通で、担当課・種別・状態が定義済みの値に収まる', () => {
  assert.ok(APPLICATIONS.length >= 60, '月別推移が読めるだけの件数');
  assert.equal(new Set(APPLICATIONS.map((a) => a.id)).size, APPLICATIONS.length, '受付番号が重複しない');
  for (const a of APPLICATIONS) {
    assert.ok(DEPARTMENTS.includes(a.department), `${a.id}: 担当課 ${a.department}`);
    assert.ok(APPLICATION_TYPES.includes(a.type), `${a.id}: 種別 ${a.type}`);
    assert.ok(STATUSES.some((s) => s.value === a.status), `${a.id}: 状態`);
    assert.ok(a.receivedAt <= REFERENCE_DATE, `${a.id}: 受付日が基準日より後`);
  }
  const fy = PERIODS.find((p) => p.value === DEFAULT_PERIOD);
  assert.ok(APPLICATIONS.every((a) => a.receivedAt >= fy.from && a.receivedAt <= fy.to), '既定の期間が全データを含む');
  assert.equal(new Set(APPLICATIONS.map((a) => a.receivedAt.slice(0, 7))).size, 7, '4〜10月の 7 か月');
});

test('既定の条件では全件を集計する', () => {
  const a = aggregate(APPLICATIONS);
  assert.equal(a.total, APPLICATIONS.length);
  assert.equal(a.period.value, DEFAULT_PERIOD);
  assert.equal(a.dept, '');
});

test('すべての期間 × 担当課で、集計は生データの数え直しと一致し、合計に矛盾がない', () => {
  for (const c of CONDITIONS) {
    const label = `${c.period}/${c.dept || '全課'}`;
    const exp = recount(c);
    const a = aggregate(APPLICATIONS, c);

    assert.equal(a.total, exp.total, `${label}: 受付件数`);
    assert.equal(a.pending, exp.apps.filter((x) => PENDING.includes(x.status)).length, `${label}: 処理待ち`);
    assert.equal(a.done, exp.apps.filter((x) => DONE.includes(x.status)).length, `${label}: 処理完了`);
    assert.equal(a.pending + a.done, a.total, `${label}: 処理待ち＋処理完了＝受付件数`);

    assert.equal(a.statuses.reduce((n, s) => n + s.count, 0), a.total, `${label}: 状態別の合計`);
    for (const s of a.statuses) assert.equal(s.count, exp.status.get(s.value) ?? 0, `${label}: 状態 ${s.value}`);

    assert.equal(a.months.reduce((n, m) => n + m.count, 0), a.total, `${label}: 月別の合計`);
    for (const m of a.months) assert.equal(m.count, exp.apps.filter((x) => x.receivedAt.startsWith(m.key)).length, `${label}: ${m.key}`);

    assert.equal(a.types.reduce((n, t) => n + t.count, 0), a.total, `${label}: 種別別の合計`);
    for (const t of a.types) assert.equal(t.count, exp.type.get(t.type), `${label}: 種別 ${t.type}`);
    assert.ok(a.types.every((t) => t.count > 0), `${label}: 0 件の種別は出さない`);
    assert.deepEqual(a.types.map((t) => t.count), [...a.types.map((t) => t.count)].sort((x, y) => y - x), `${label}: 件数の多い順`);

    // 割合：件数 ÷ 受付件数を 0.1% 単位に四捨五入
    for (const s of a.statuses) assert.equal(s.tenths, a.total ? Math.round((s.count / a.total) * 1000) : null, `${label}: 割合 ${s.value}`);
    assert.equal(a.rateTenths, a.total ? Math.round((a.done / a.total) * 1000) : null, `${label}: 処理完了率`);
    if (a.total) {
      const sum = a.statuses.reduce((n, s) => n + s.tenths, 0);
      assert.ok(Math.abs(sum - 1000) <= a.statuses.length * 0.5 + 0.5, `${label}: 割合の合計が 100% から端数以上ずれない（${sum / 10}%）`);
    }
  }
});

test('月の並びは対象期間の月を欠けなく時系列に並べる（件数 0 の月も残す）', () => {
  const keys = (period) => aggregate(APPLICATIONS, { period }).months.map((m) => m.key);
  assert.deepEqual(keys('fy'), ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  assert.deepEqual(keys('h1'), ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
  assert.deepEqual(keys('q2'), ['2026-07', '2026-08', '2026-09']);
  assert.deepEqual(keys('m3'), ['2026-08', '2026-09', '2026-10']);
  const empty = aggregate([], { period: 'q2' });
  assert.equal(empty.months.length, 3);
  assert.ok(empty.months.every((m) => m.count === 0));
});

test('期間・担当課を変えると数値が変わる（絞り込みが反映される）', () => {
  const all = aggregate(APPLICATIONS, { period: 'fy' });
  const q2 = aggregate(APPLICATIONS, { period: 'q2' });
  const kodomo = aggregate(APPLICATIONS, { period: 'fy', dept: 'こども家庭課' });
  assert.ok(q2.total < all.total);
  assert.ok(kodomo.total < all.total);
  assert.deepEqual(kodomo.types.map((t) => t.type).sort(), ['保育所等入所申込', '児童手当認定請求']);
  assert.equal(aggregate(APPLICATIONS, { period: 'm3' }).total, APPLICATIONS.filter((a) => a.receivedAt >= '2026-08-01').length);
});

test('割合の表示：0.1% 単位、受付件数 0 のときは「—」', () => {
  assert.equal(percentTenths(1, 3), 333);
  assert.equal(percentText(333), '33.3%');
  assert.equal(percentText(percentTenths(2, 3)), '66.7%');
  assert.equal(percentText(percentTenths(0, 5)), '0.0%');
  assert.equal(percentText(percentTenths(5, 5)), '100.0%');
  assert.equal(percentTenths(0, 0), null);
  assert.equal(percentText(null), '—');
  const none = aggregate([], {});
  assert.equal(none.total, 0);
  assert.equal(none.rateTenths, null);
  assert.ok(none.statuses.every((s) => s.tenths === null));
  assert.equal(buildDashboardModel({ ...defaultState(['dads', 'carbon']) }).rate, percentText(aggregate(APPLICATIONS).rateTenths));
});

test('集計は決定的で、実時計に依存しない', () => {
  const RealDate = globalThis.Date;
  const before = JSON.stringify(aggregate(APPLICATIONS, { period: 'm3', dept: '市民課' }));
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [2031, 0, 1]));
    }

    static now() {
      return new RealDate(2031, 0, 1).getTime();
    }
  };
  try {
    assert.equal(JSON.stringify(aggregate(APPLICATIONS, { period: 'm3', dept: '市民課' })), before);
  } finally {
    globalThis.Date = RealDate;
  }
});

test('一覧の絞り込み（filterByScope）は集計と同じ判定で、条件の組み合わせを扱える', () => {
  assert.equal(filterByScope(APPLICATIONS).length, APPLICATIONS.length);
  assert.equal(filterByScope(APPLICATIONS, { group: 'pending' }).length, aggregate(APPLICATIONS).pending);
  assert.equal(filterByScope(APPLICATIONS, { group: 'done' }).length, aggregate(APPLICATIONS).done);
  const one = filterByScope(APPLICATIONS, { period: 'q2', dept: '市民課', type: '住民票の写し等交付申請', group: 'done' });
  assert.ok(one.every((a) => a.department === '市民課' && a.type === '住民票の写し等交付申請' && DONE.includes(a.status)));
  assert.ok(one.every((a) => a.receivedAt >= '2026-07-01' && a.receivedAt <= '2026-09-30'));
});

test('ダッシュボードの数値から開く一覧は、表示対象が集計と一致する（全条件・全リンク）', () => {
  for (const c of CONDITIONS) {
    const state = { ...listState(c), screen: 'dashboard' };
    const d = buildDashboardModel(state);
    const label = `${c.period}/${c.dept || '全課'}`;
    const shown = (link) => buildModel({ ...state, screen: 'list', ...listStateFor(state, link) });

    assert.equal(shown({}).shown, d.total, `${label}: 受付件数→一覧`);
    assert.equal(shown({ group: 'pending' }).shown, d.pending, `${label}: 処理待ち→一覧`);
    assert.equal(shown({ group: 'done' }).shown, d.done, `${label}: 処理完了→一覧`);
    for (const s of d.statuses) assert.equal(shown(s.link).shown, s.count, `${label}: ${s.label}→一覧`);
    for (const t of d.types) assert.equal(shown(t.link).shown, t.count, `${label}: ${t.type}→一覧`);

    // 一覧側の「すべて」の件数・状態別件数も集計と一致する
    const all = shown({});
    assert.equal(all.statusOptions[0].count, d.total);
    for (const s of d.statuses) assert.equal(all.statusOptions.find((o) => o.value === s.value).count, s.count);
  }
});

test('一覧への引き継ぎ：条件だけを渡し、ダッシュボード側の条件は変えない', () => {
  const state = listState({ period: 'q2', dept: '市民課' });
  const next = listStateFor(state, { status: 'approved' });
  assert.deepEqual(next.scope, { period: 'q2', dept: '市民課', type: '', group: '' });
  assert.equal(next.status, 'approved');
  assert.equal(next.keyword, '', '一覧のキーワードは集計と一致させるため空にする');
  assert.equal(listStateFor(listState({ period: DEFAULT_PERIOD }), {}).scope.period, DEFAULT_PERIOD, '既定の期間でも明示的に引き継ぐ');
  assert.equal(buildModel({ ...listState({}), ...listStateFor(listState({}), {}) }).scope.items[0].key, 'period', '既定の期間も条件として表示する');
  assert.equal('period' in next && next.period !== undefined, false, 'ダッシュボードの集計条件（period / dept）は返さない');
  assert.deepEqual(listStateFor(state, { type: '犬の登録申請' }).scope.type, '犬の登録申請');
  assert.deepEqual(listStateFor(state, { group: 'pending' }).scope.group, 'pending');
});

test('一覧の絞り込み条件の表示モデル', () => {
  const none = buildModel(listState({}));
  assert.equal(none.scope.active, false);
  const scoped = buildModel(listState({}, { scope: { period: 'q2', dept: '市民課', type: '', group: 'pending' } }));
  assert.equal(scoped.scope.active, true);
  assert.deepEqual(scoped.scope.items.map((i) => i.key), ['period', 'dept', 'group']);
  assert.match(scoped.scope.summary, /対象期間：第2四半期/);
  assert.match(scoped.scope.items.find((i) => i.key === 'group').text, /処理待ち（受付済・審査中・補正依頼）/);
  assert.equal(scoped.total, filterByScope(APPLICATIONS, { period: 'q2', dept: '市民課', group: 'pending' }).length);
});

test('ビューモデル：指標・定義・リンクがそろう', () => {
  const d = buildDashboardModel({ ...listState({}), screen: 'dashboard' });
  assert.deepEqual(d.kpis.map((k) => k.key), ['total', 'pending', 'done', 'rate']);
  for (const k of d.kpis) assert.ok(k.label && k.note, `${k.key}: ラベルと補足`);
  assert.deepEqual(d.kpis.map((k) => k.link && (k.link.group ?? '')), ['', 'pending', 'done', null]);
  assert.equal(d.definitions, DEFINITIONS);
  assert.equal(GROUPS.length, 2);
  assert.equal(d.periodOptions.filter((o) => o.selected).length, 1);
  assert.equal(d.deptOptions.filter((o) => o.selected).length, 1);
  assert.equal(d.isDefault, true);
  assert.equal(buildDashboardModel({ ...listState({ dept: '市民課' }) }).isDefault, false);
  assert.equal(d.months.reduce((n, m) => n + m.count, 0), d.total);
  assert.ok(d.months.every((m) => m.ratio >= 0 && m.ratio <= 1));
  assert.equal(Math.max(...d.months.map((m) => m.ratio)), 1, '最大の月が 1');
});

test('将来、集計期間外（別年度）の申請が増えても、ダッシュボードから開く一覧は集計と同じ範囲になる', () => {
  const future = { ...APPLICATIONS[0], id: '2027-00001', receivedAt: '2027-05-10', status: 'received' };
  const apps = [...APPLICATIONS, future];
  const state = { ...listState({}), screen: 'dashboard' };
  const agg = aggregate(apps, { period: DEFAULT_PERIOD });
  assert.equal(agg.total, APPLICATIONS.length, '期間外の申請は集計に含まれない');
  // 一覧側：既定の期間でも期間を引き継ぐため、期間外の申請は含まれない
  const scope = listStateFor(state, {}).scope;
  assert.equal(filterByScope(apps, scope).length, agg.total);
  assert.equal(filterByScope(apps, { ...scope, group: 'pending' }).length, agg.pending);
});
