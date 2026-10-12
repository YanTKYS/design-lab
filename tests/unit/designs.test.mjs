// すべてのデザインが同じ情報と操作を提供していることを、描画結果の HTML で確認する。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COLUMNS, DEFAULT_SORT, NAV_ITEMS } from '../../site/assets/js/data.js';
import { DESIGNS } from '../../site/assets/js/designs/index.js';
import { buildModel, countText } from '../../site/assets/js/query.js';

const base = { keyword: '', status: '', sort: DEFAULT_SORT, detail: null, notice: null };
const ctx = () => ({ uid: 't', ui: {}, href: () => '?' });
const render = (design, state) => design.render(buildModel({ ...base, ...state }), ctx()).toString();
const count = (htmlText, needle) => htmlText.split(needle).length - 1;

test('6 種類のデザインが登録されている', () => {
  assert.deepEqual(
    DESIGNS.map((d) => d.id),
    ['dads', 'carbon', 'fluent', 'govuk', 'uswds', 'plain'],
  );
});

for (const design of DESIGNS) {
  test(`${design.id}: 説明・公式リンク・比較観点がそろっている`, () => {
    assert.match(design.url, /^https:\/\//);
    assert.ok(design.name && design.shortName && design.summary);
    for (const key of ['density', 'navigation', 'table', 'input', 'actions', 'hierarchy']) {
      assert.ok(design.traits[key], key);
    }
  });

  test(`${design.id}: 一覧の情報と操作がすべて含まれる`, () => {
    const model = buildModel(base);
    const out = render(design, {});
    assert.match(out, /申請一覧/);
    assert.ok(out.includes(model.system.name));
    assert.ok(out.includes(`${model.total}件`), '件数表示');
    assert.equal(count(out, 'data-bind="keyword"'), 1, 'キーワード入力');
    assert.ok(out.includes('data-bind="status"'), '状態の絞り込み');
    assert.ok(out.includes('data-action="new"'), '新規申請ボタン');
    assert.ok(out.includes('data-focus="heading"'), 'ページ見出し');
    for (const item of NAV_ITEMS) assert.ok(out.includes(`data-target="${item.id}"`), `ナビ ${item.id}`);
    for (const column of COLUMNS) {
      assert.ok(out.includes(column.label), `列 ${column.label}`);
      assert.ok(out.includes(`data-action="sort" data-key="${column.key}"`), `並べ替え ${column.key}`);
    }
    for (const row of model.rows) {
      assert.ok(out.includes(row.applicant), row.applicant);
      assert.ok(out.includes(row.type), row.type);
      assert.ok(out.includes(row.status.label), row.status.label);
      assert.match(out, new RegExp(`data-action="open-detail"\\s+data-id="${row.id}"`), `詳細ボタン ${row.id}`);
    }
  });

  test(`${design.id}: 絞り込み結果と空の結果を表示できる`, () => {
    const out = render(design, { status: 'rejected' });
    const model = buildModel({ ...base, status: 'rejected' });
    assert.equal(count(out, 'data-action="open-detail"'), model.shown);
    assert.ok(out.includes(countText(model)), '絞り込み時は全体件数と表示件数');
    const empty = render(design, { keyword: '該当なし' });
    assert.equal(count(empty, 'data-action="open-detail"'), 0);
    assert.match(empty, /(ありません|一致する申請)/);
  });

  test(`${design.id}: 詳細と通知を表示し、閉じる操作がある`, () => {
    const out = render(design, {
      detail: '2026-01041',
      notice: { title: '通知タイトル', text: '通知本文' },
    });
    for (const text of ['2026-01041', '株式会社さくら野建設', '道路管理課', '窓口', '工事期間']) {
      assert.ok(out.includes(text), text);
    }
    assert.ok(out.includes('data-action="close-detail"'), '詳細を閉じる操作');
    if (!['carbon'].includes(design.id)) assert.ok(out.includes('data-focus="detail"'), '詳細のフォーカス先');

    const withNotice = render(design, { notice: { title: '通知タイトル', text: '通知本文' } });
    assert.ok(withNotice.includes('通知タイトル') && withNotice.includes('通知本文'));
    assert.ok(withNotice.includes('data-action="dismiss-notice"'));
  });

  test(`${design.id}: 利用者の入力値はエスケープされる`, () => {
    const out = render(design, { keyword: '"><script>alert(1)</script>' });
    assert.ok(!out.includes('<script>alert(1)</script>'));
    assert.ok(out.includes('&lt;script&gt;'));
  });
}
