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

test('dashboard：screen・集計条件（period / dept）を URL に載せ、既存の URL との互換を保つ', () => {
  assert.equal(parseState('?screen=dashboard', IDS).screen, 'dashboard');
  assert.equal(serializeState(parseState('?screen=dashboard', IDS)), '?screen=dashboard&design=dads');
  const search = '?screen=dashboard&mode=compare&left=carbon&right=govuk&width=768&period=q2&dept=%E5%B8%82%E6%B0%91%E8%AA%B2';
  const state = parseState(search, IDS);
  assert.deepEqual([state.screen, state.period, state.dept], ['dashboard', 'q2', '市民課']);
  assert.equal(serializeState(state), search);
  // 既定の期間・担当課は URL に出さない。既存の URL は従来どおり
  assert.equal(serializeState(parseState('?design=fluent&period=fy', IDS)), '?design=fluent');
  assert.equal(parseState('?design=fluent', IDS).period, 'fy');
  assert.equal(parseState('?design=fluent', IDS).dept, '');
  // 不正な値は既定値に戻す
  const bad = parseState('?screen=dashboard&period=zzz&dept=%E3%81%AA%E3%81%84%E8%AA%B2&lperiod=x&ldept=y&ltype=z&lgroup=w', IDS);
  assert.deepEqual([bad.period, bad.dept, bad.scope], ['fy', '', { period: '', dept: '', type: '', group: '' }]);
});

test('dashboard：一覧へ引き継いだ絞り込み（lperiod / ldept / ltype / lgroup）の往復と、ダッシュボード条件との独立', () => {
  const search = '?design=govuk&status=approved&lperiod=q2&ldept=%E5%B8%82%E6%B0%91%E8%AA%B2&ltype=%E7%8A%AC%E3%81%AE%E7%99%BB%E9%8C%B2%E7%94%B3%E8%AB%8B&lgroup=done';
  const state = parseState(search, IDS);
  assert.deepEqual(state.scope, { period: 'q2', dept: '市民課', type: '犬の登録申請', group: 'done' });
  assert.deepEqual([state.period, state.dept], ['fy', ''], '一覧の絞り込みとダッシュボードの集計条件は別');
  assert.equal(serializeState(state), search);
  const changed = { ...state, period: 'm3', dept: '住宅政策課' };
  assert.deepEqual(parseState(serializeState(changed), IDS).scope, state.scope, '集計条件を変えても一覧の絞り込みは変わらない');
});

test('dashboard：フォームの入力内容は引き続き URL に含まれない', () => {
  const state = parseState('?screen=dashboard&name=%E6%A1%9C%E4%BA%95&email=a%40example.com', IDS);
  assert.equal(serializeState(state), '?screen=dashboard&design=dads');
});
