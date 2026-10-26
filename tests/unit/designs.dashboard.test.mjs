// 登録済みの全デザインで、同じ条件なら同じ集計値が表示され、グラフの値が文字でも確認できることを描画結果で確認する。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aggregate, buildDashboardModel, percentText } from '../../site/assets/js/dashboard.js';
import { APPLICATIONS, DEFAULT_SORT } from '../../site/assets/js/data.js';
import { DESIGNS } from '../../site/assets/js/designs/index.js';
import { createForm } from '../../site/assets/js/form.js';
import { buildAppModel } from '../../site/assets/js/model.js';
import { buildModel } from '../../site/assets/js/query.js';
import { defaultState } from '../../site/assets/js/state.js';

const CONDITIONS = [
  { period: 'fy', dept: '' },
  { period: 'q2', dept: '' },
  { period: 'h1', dept: 'こども家庭課' },
  { period: 'm3', dept: '都市計画課' },
];

const ctx = () => ({
  uid: 'p0',
  ui: {},
  href: () => '?',
  navHref: () => '?',
  listHref: (link) => `?screen=list&s=${link.status ?? ''}&g=${link.group ?? ''}&t=${link.type ?? ''}`,
});
const render = (design, conditions, extra = {}) =>
  design
    .render(buildAppModel({ ...defaultState(['dads', 'carbon']), screen: 'dashboard', sort: DEFAULT_SORT, notice: null, ...conditions, ...extra }, createForm()), ctx())
    .toString();

const read = (out, attrName, key) => {
  const re = new RegExp(`${attrName}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([^<]*)<`);
  return out.match(re)?.[1]?.trim();
};

for (const design of DESIGNS) {
  test(`${design.id}: ダッシュボードの特徴説明（5 観点）がそろっている`, () => {
    for (const key of ['kpi', 'density', 'chart', 'filter', 'hierarchy']) assert.ok(design.dashboardTraits[key], key);
  });

  for (const c of CONDITIONS) {
    test(`${design.id}: ${c.period}/${c.dept || '全課'} の KPI・月別・処理状況・種別の数値が集計結果と一致する`, () => {
      const out = render(design, c);
      const a = aggregate(APPLICATIONS, c);

      assert.equal(read(out, 'data-kpi', 'total'), String(a.total));
      assert.equal(read(out, 'data-kpi', 'pending'), String(a.pending));
      assert.equal(read(out, 'data-kpi', 'done'), String(a.done));
      assert.equal(read(out, 'data-kpi', 'rate'), percentText(a.rateTenths));

      for (const m of a.months) assert.equal(read(out, 'data-month', m.key), String(m.count), `月 ${m.key}`);
      for (const s of a.statuses) {
        assert.equal(read(out, 'data-status', s.value), String(s.count), `状態 ${s.value}`);
        assert.equal(read(out, 'data-status-share', s.value), percentText(s.tenths), `割合 ${s.value}`);
      }
      for (const t of a.types) {
        assert.equal(read(out, 'data-type-count', t.type), String(t.count), `種別 ${t.type}`);
        assert.equal(read(out, 'data-type-share', t.type), percentText(t.tenths), `種別割合 ${t.type}`);
      }
      // 表示されている種別は 0 件のものを含まない
      assert.equal([...out.matchAll(/data-type-count="/g)].length, a.types.length);
      assert.equal([...out.matchAll(/data-month="/g)].length, a.months.length);
    });
  }

  test(`${design.id}: 集計条件のセレクト（または選択肢）と、一覧へのリンク・リセット操作がある`, () => {
    const out = render(design, { period: 'q2', dept: '市民課' });
    for (const bind of ['period', 'dept']) assert.ok(out.includes(`data-bind="${bind}"`), bind);
    assert.match(out, /<option value="q2" selected>|value="q2" data-bind="period" checked/, '選択中の期間');
    assert.match(out, /<option value="市民課" selected>/, '選択中の担当課');
    assert.ok(out.includes('data-action="reset-conditions"'));
    assert.ok(out.includes('data-focus="heading"'));
    // 指標・状態・種別から一覧へ移動できる（受付件数→全体、処理待ち、処理完了、状態、種別）
    const links = [...out.matchAll(/data-action="open-list"[^>]*>/g)].map((m) => m[0]);
    assert.ok(links.length >= 3, '一覧へのリンクがある');
    const hasLink = (re) => links.some((l) => re.test(l)) || [...out.matchAll(/<a[^>]*>/g)].some((m) => re.test(m[0]));
    assert.ok(hasLink(/data-link-group="pending"/), '処理待ちの一覧');
    assert.ok(hasLink(/data-link-group="done"/), '処理完了の一覧');
    assert.ok(hasLink(/data-link-status="approved"/), '承認済の一覧');
    assert.ok(out.includes('href="?screen=list&amp;s=&amp;g=pending&amp;t="'), 'href に一覧の URL が入る');
  });

  test(`${design.id}: ラベル・補足・集計の定義・基準日があり、id と参照が壊れていない`, () => {
    const out = render(design, { period: 'fy', dept: '' });
    for (const text of ['受付件数', '処理待ち', '処理完了', '処理完了率', '月別', '処理状況', '申請種別']) assert.ok(out.includes(text), text);
    assert.ok(out.includes('2026年10月12日'), '基準日');
    assert.ok(out.includes('受付日が対象期間内'), '集計の定義');
    const ids = [...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, new Set(ids).size, 'id が重複している');
    for (const m of out.matchAll(/aria-(?:labelledby|controls)="([^"]+)"/g)) {
      for (const ref of m[1].split(' ')) assert.ok(ids.includes(ref), `参照先 ${ref} がない`);
    }
  });

  test(`${design.id}: 現在の画面（ダッシュボード）が aria-current で示される`, () => {
    const out = render(design, {});
    const current = [...out.matchAll(/aria-current="page"[^>]*>([\s\S]*?)<\/(?:a|span)\s*>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    assert.ok(current.some((t) => t.includes('ダッシュボード')), `現在地: ${current.join(',')}`);
  });

  test(`${design.id}: 該当する申請が 0 件でも崩れず、割合は「—」で示す`, () => {
    const state = { ...defaultState(['dads', 'carbon']), screen: 'dashboard', sort: DEFAULT_SORT, notice: null, period: 'q2', dept: '都市計画課' };
    const model = { ...buildModel(state), dashboard: buildDashboardModel(state, []) };
    const out = design.render(model, ctx()).toString();
    assert.equal(read(out, 'data-kpi', 'total'), '0');
    assert.equal(read(out, 'data-kpi', 'pending'), '0');
    assert.equal(read(out, 'data-kpi', 'done'), '0');
    assert.equal(read(out, 'data-kpi', 'rate'), '—');
    assert.equal(read(out, 'data-status-share', 'approved'), '—');
    assert.equal([...out.matchAll(/data-type-count="/g)].length, 0, '種別の行は出さない');
    for (const m of model.dashboard.months) assert.equal(read(out, 'data-month', m.key), '0');
    assert.match(out, /(ありません|該当する申請)/);
  });
}

test('同じ条件なら 登録済みの全デザインが同じ数値を表示する', () => {
  for (const c of CONDITIONS) {
    const values = DESIGNS.map((d) => {
      const out = render(d, c);
      const a = aggregate(APPLICATIONS, c);
      return JSON.stringify({
        kpi: ['total', 'pending', 'done', 'rate'].map((k) => read(out, 'data-kpi', k)),
        months: a.months.map((m) => read(out, 'data-month', m.key)),
        statuses: a.statuses.map((s) => [read(out, 'data-status', s.value), read(out, 'data-status-share', s.value)]),
        types: a.types.map((t) => [read(out, 'data-type-count', t.type), read(out, 'data-type-share', t.type)]),
      });
    });
    assert.equal(new Set(values).size, 1, `${c.period}/${c.dept}: デザインで数値が異なる`);
  }
});

test('デザインごとにグラフの種類・構成が異なる（色だけの差し替えではない）', () => {
  const kinds = Object.fromEntries(
    DESIGNS.map((d) => {
      const out = render(d, { period: 'fy', dept: '' });
      const found = ['chart-columns', 'chart-hbars', 'chart-stacked', 'chart-donut', 'chart-line'].filter((k) => out.includes(`class="${k}`) || out.includes(` ${k} `));
      return [d.id, found.join('+') || 'none'];
    }),
  );
  assert.equal(kinds.plain, 'none', 'Plain はグラフを使わない');
  assert.equal(kinds.govuk, 'none', 'GOV.UK は表と表内の棒だけ');
  assert.match(kinds.carbon, /chart-donut/);
  assert.match(kinds.fluent, /chart-line/);
  assert.match(kinds.dads, /chart-columns/);
  assert.match(kinds.uswds, /chart-hbars/);
  assert.ok(new Set(Object.values(kinds)).size >= 5, `グラフの組み合わせ: ${JSON.stringify(kinds)}`);
});

test('グラフは読み取れる代替情報を持つ（SVG は role=img と値入りのラベル、棒は ol/ul とテキストの値）', () => {
  for (const d of DESIGNS) {
    const out = render(d, { period: 'fy', dept: '' });
    for (const m of out.matchAll(/<svg[^>]*role="img"[^>]*aria-label="([^"]+)"/g)) {
      assert.match(m[1], /\d/, `${d.id}: SVG のラベルに値がある`);
    }
    for (const m of out.matchAll(/class="chart-stacked[^"]*" role="img" aria-label="([^"]+)"/g)) assert.match(m[1], /\d+件/);
    // 装飾の棒（aria-hidden）だけでなく、値のテキストが対応づいている
    for (const m of out.matchAll(/<(?:ol|ul) class="chart-(?:columns|hbars)[^"]*"[^>]*>/g)) assert.match(m[0], /aria-label="/, `${d.id}: グラフの名前`);
  }
});
