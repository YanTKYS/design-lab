import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultState, parseState, serializeState } from '../../site/assets/js/state.js';

const IDS = ['dads', 'carbon', 'fluent', 'govuk', 'uswds', 'plain'];

test('空のクエリは既定値になり、単独表示の URL に正規化される', () => {
  const state = parseState('', IDS);
  assert.deepEqual(state, defaultState(IDS));
  assert.equal(serializeState(state), '?design=dads');
});

test('比較状態・検索条件・並び・詳細を往復変換できる', () => {
  const search = '?mode=compare&left=govuk&right=carbon&width=1024&q=%E9%9D%92%E6%9C%A8&status=received&sort=id&order=asc&detail=2026-01042';
  const state = parseState(search, IDS);
  assert.equal(state.mode, 'compare');
  assert.equal(state.left, 'govuk');
  assert.equal(state.right, 'carbon');
  assert.equal(state.width, '1024');
  assert.equal(state.keyword, '青木');
  assert.equal(state.status, 'received');
  assert.deepEqual(state.sort, { key: 'id', dir: 'asc' });
  assert.equal(state.detail, '2026-01042');
  assert.deepEqual(parseState(serializeState(state), IDS), state);
});

test('不正な値は既定値に戻す', () => {
  const state = parseState('?mode=x&design=unknown&status=bad&sort=evil&order=up&detail=nope&width=9', IDS);
  assert.equal(state.mode, 'single');
  assert.equal(state.left, 'dads');
  assert.equal(state.status, '');
  assert.deepEqual(state.sort, { key: 'receivedAt', dir: 'desc' });
  assert.equal(state.detail, null);
  assert.equal(state.width, 'auto');
});

test('単独表示では design、比較では left/right を使う', () => {
  const single = parseState('?design=fluent', IDS);
  assert.equal(single.left, 'fluent');
  assert.notEqual(single.right, 'fluent', '比較へ切り替えたとき同じデザインにならない');
  assert.equal(serializeState({ ...single, mode: 'compare' }), `?mode=compare&left=fluent&right=${single.right}`);
});
