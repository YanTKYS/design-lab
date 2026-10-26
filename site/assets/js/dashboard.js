// 申請処理ダッシュボードの集計。DOM に依存しない純粋関数のみ。
// 全デザインは、ここで作る結果をそのまま表示する（デザイン側に集計処理を持たない）。
// 一覧画面と同じ APPLICATIONS から計算し、一覧の絞り込み（filterByScope）と同じ条件判定を使う。
//
// 計算方法
//   受付件数  = 受付日が対象期間内で、担当課が条件に一致する申請の数
//   処理待ち  = 受付済・審査中・補正依頼の合計
//   処理完了  = 承認済・却下の合計
//   処理完了率 = 処理完了 ÷ 受付件数
//   各割合    = 件数 ÷ 受付件数（小数第 2 位を四捨五入して小数第 1 位まで表示。受付件数が 0 のときは「—」）

import { APPLICATIONS, APPLICATION_TYPES, DEPARTMENTS, REFERENCE_DATE, STATUSES } from './data.js';

export const PERIODS = [
  { value: 'fy', label: '令和8年度（4月〜）', from: '2026-04-01', to: '2026-10-31' },
  { value: 'h1', label: '上半期（4月〜9月）', from: '2026-04-01', to: '2026-09-30' },
  { value: 'q2', label: '第2四半期（7月〜9月）', from: '2026-07-01', to: '2026-09-30' },
  { value: 'm3', label: '直近3か月（8月〜10月）', from: '2026-08-01', to: '2026-10-31' },
];
export const DEFAULT_PERIOD = 'fy';
const PERIOD_BY_VALUE = new Map(PERIODS.map((p) => [p.value, p]));

export const PENDING_STATUSES = ['received', 'reviewing', 'returned']; // 処理待ち
export const DONE_STATUSES = ['approved', 'rejected']; // 処理完了
export const GROUPS = [
  { value: 'pending', label: '処理待ち', statuses: PENDING_STATUSES },
  { value: 'done', label: '処理完了', statuses: DONE_STATUSES },
];

export const EMPTY_SCOPE = Object.freeze({ period: '', dept: '', type: '', group: '' });

export const DEFINITIONS = [
  { term: '受付件数', text: '受付日が対象期間内で、担当課が条件に一致する申請の数です。' },
  { term: '処理待ち', text: '受付済・審査中・補正依頼の合計です。' },
  { term: '処理完了', text: '承認済・却下の合計です。' },
  { term: '処理完了率', text: '処理完了 ÷ 受付件数です。' },
  { term: '割合', text: '件数 ÷ 受付件数です。小数第2位を四捨五入しているため、合計が100%にならない場合があります。' },
];

/* ---------- 範囲の判定（一覧・ダッシュボード共通） ---------- */

export function inPeriod(app, period) {
  const p = PERIOD_BY_VALUE.get(period);
  return !p || (app.receivedAt >= p.from && app.receivedAt <= p.to);
}

/** 期間・担当課・申請種別・処理状態のグループで絞り込む。空の条件は無視する。 */
export function filterByScope(apps, scope = EMPTY_SCOPE) {
  const { period = '', dept = '', type = '', group = '' } = scope;
  const statuses = GROUPS.find((g) => g.value === group)?.statuses;
  return apps.filter(
    (a) =>
      inPeriod(a, period) &&
      (!dept || a.department === dept) &&
      (!type || a.type === type) &&
      (!statuses || statuses.includes(a.status)),
  );
}

export const isScopeActive = (scope) => Object.values({ ...EMPTY_SCOPE, ...scope }).some(Boolean);

/* ---------- 割合 ---------- */

/** 件数 ÷ 合計 を 0.1% 単位（整数）にする。合計 0 のときは null。 */
export function percentTenths(count, total) {
  return total > 0 ? Math.round((count * 1000) / total) : null;
}

export const percentText = (tenths) => (tenths == null ? '—' : `${(tenths / 10).toFixed(1)}%`);

/* ---------- 集計 ---------- */

function monthKeys(period) {
  const [fy, fm] = period.from.split('-').map(Number);
  const [ty, tm] = period.to.split('-').map(Number);
  const keys = [];
  for (let i = fy * 12 + fm - 1; i <= ty * 12 + tm - 1; i += 1) {
    keys.push(`${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
  }
  return keys;
}

const count = (apps, pred) => apps.filter(pred).length;

/**
 * @param apps       申請の配列（通常は APPLICATIONS）
 * @param conditions { period, dept } 集計条件
 */
export function aggregate(apps, { period = DEFAULT_PERIOD, dept = '' } = {}) {
  const p = PERIOD_BY_VALUE.get(period) ?? PERIOD_BY_VALUE.get(DEFAULT_PERIOD);
  const scoped = filterByScope(apps, { period: p.value, dept });
  const total = scoped.length;
  const pending = count(scoped, (a) => PENDING_STATUSES.includes(a.status));
  const done = count(scoped, (a) => DONE_STATUSES.includes(a.status));

  const months = monthKeys(p).map((key) => ({
    key,
    month: Number(key.slice(5)),
    count: count(scoped, (a) => a.receivedAt.startsWith(key)),
  }));

  const statuses = STATUSES.map((s) => {
    const n = count(scoped, (a) => a.status === s.value);
    return { value: s.value, label: s.label, tone: s.tone, count: n, tenths: percentTenths(n, total) };
  });

  const types = APPLICATION_TYPES.map((type) => {
    const n = count(scoped, (a) => a.type === type);
    return { type, count: n, tenths: percentTenths(n, total) };
  })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, 'ja'));

  return {
    period: p,
    dept,
    total,
    pending,
    done,
    rateTenths: percentTenths(done, total),
    months,
    statuses,
    types,
  };
}

/* ---------- ダッシュボード → 一覧への引き継ぎ ---------- */

/**
 * ダッシュボードの現在の集計条件と、指標の絞り込み（status / group / type）から、
 * 一覧画面に設定する状態を作る。表示対象が集計と一致するよう、一覧のキーワードは空にする。
 * 期間・担当課は、既定値でもそのまま引き継ぐ。
 */
export function listStateFor(state, { status = '', group = '', type = '' } = {}) {
  return {
    // 既定の期間でも空にせず明示的に引き継ぐ（将来、別年度のデータが増えても集計と同じ範囲になる）
    scope: { period: state.period, dept: state.dept, type, group },
    status,
    keyword: '',
    detail: null,
  };
}

/* ---------- デザインへ渡すビューモデル ---------- */

const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

export function buildDashboardModel(state, apps = APPLICATIONS) {
  const agg = aggregate(apps, { period: state.period, dept: state.dept });
  const rate = percentText(agg.rateTenths);
  const peak = Math.max(1, ...agg.months.map((m) => m.count));
  const scopeText = `${agg.period.label}／${agg.dept || 'すべての担当課'}`;

  const withLink = (item, link) => ({ ...item, link });
  const kpis = [
    withLink({ key: 'total', label: '受付件数', value: agg.total, unit: '件', note: '対象期間に受け付けた申請の総数' }, {}),
    withLink({ key: 'pending', label: '処理待ち件数', value: agg.pending, unit: '件', note: '受付済・審査中・補正依頼の合計' }, { group: 'pending' }),
    withLink({ key: 'done', label: '処理完了件数', value: agg.done, unit: '件', note: '承認済・却下の合計' }, { group: 'done' }),
    { key: 'rate', label: '処理完了率', value: rate, unit: '', note: `受付 ${agg.total}件のうち処理完了 ${agg.done}件`, link: null },
  ];

  return {
    refDate: fmtDate(REFERENCE_DATE),
    scopeText,
    periodOptions: PERIODS.map((p) => ({ value: p.value, label: p.label, selected: p.value === agg.period.value })),
    deptOptions: [
      { value: '', label: 'すべての担当課', selected: !agg.dept },
      ...DEPARTMENTS.map((d) => ({ value: d, label: d, selected: d === agg.dept })),
    ],
    isDefault: agg.period.value === DEFAULT_PERIOD && !agg.dept,
    period: { ...agg.period, rangeText: `${fmtDate(agg.period.from)}〜${fmtDate(agg.period.to)}` },
    dept: agg.dept,
    total: agg.total,
    pending: agg.pending,
    done: agg.done,
    rate,
    rateTenths: agg.rateTenths,
    kpis,
    months: agg.months.map((m) => ({ ...m, label: `${m.month}月`, ratio: m.count / peak, link: null })),
    monthMax: peak,
    statuses: agg.statuses.map((s) => ({
      ...s,
      shareText: percentText(s.tenths),
      ratio: agg.total ? s.count / agg.total : 0,
      link: { status: s.value },
    })),
    types: agg.types.map((t, i) => ({
      ...t,
      rank: i + 1,
      shareText: percentText(t.tenths),
      ratio: agg.types[0] ? t.count / agg.types[0].count : 0,
      link: { type: t.type },
    })),
    definitions: DEFINITIONS,
  };
}
