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

test('screen：既存の URL（screen なし）は一覧、screen=form は入力フォーム', () => {
  assert.equal(parseState('?design=govuk&q=%E4%BF%9D%E8%82%B2', IDS).screen, 'list', '既存の URL との互換性');
  assert.equal(parseState('?mode=compare&left=dads&right=carbon&status=reviewing', IDS).screen, 'list');
  assert.equal(parseState('?screen=form', IDS).screen, 'form');
  assert.equal(parseState('?screen=unknown', IDS).screen, 'list', '不正な値は一覧');
});

test('screen：一覧のときは URL に載せず、フォームのときだけ載せる（既存の URL 形式を変えない）', () => {
  const list = parseState('?mode=compare&left=dads&right=carbon&width=1024&q=%E4%BF%9D%E8%82%B2', IDS);
  assert.equal(serializeState(list), '?mode=compare&left=dads&right=carbon&width=1024&q=%E4%BF%9D%E8%82%B2');
  assert.equal(serializeState({ ...list, screen: 'form' }), '?screen=form&mode=compare&left=dads&right=carbon&width=1024&q=%E4%BF%9D%E8%82%B2');
});

test('screen：画面を切り替えてもデザイン・表示モード・表示幅・一覧の条件を維持して往復できる', () => {
  const search = '?screen=form&mode=compare&left=uswds&right=fluent&width=768&q=%E9%81%93%E8%B7%AF&status=approved&sort=id&order=asc';
  const state = parseState(search, IDS);
  assert.deepEqual([state.screen, state.mode, state.left, state.right, state.width, state.keyword, state.status], ['form', 'compare', 'uswds', 'fluent', '768', '道路', 'approved']);
  assert.equal(serializeState(state), search);
  const list = { ...state, screen: 'list' };
  assert.equal(serializeState(list), search.replace('screen=form&', ''));
  assert.deepEqual(parseState(serializeState(list), IDS), list);
});

test('フォームの入力内容は URL に含まれない（state にも持たず、URL のフォーム項目は無視する）', () => {
  const state = parseState('?screen=form&name=%E6%A1%9C%E4%BA%95&email=a%40example.com&kana=x&phone=090&body=secret&agree=true', IDS);
  const url = serializeState(state);
  assert.equal(url, '?screen=form&design=dads');
  for (const key of ['name', 'kana', 'email', 'phone', 'type', 'date', 'body', 'agree', 'values', 'form']) {
    assert.ok(!(key in state), `state に ${key} がない`);
  }
  assert.ok(!/secret|example|桜井|090/.test(url));
});
