import assert from 'node:assert/strict';
import { test } from 'node:test';

import { APPLICATIONS, DEFAULT_SORT } from '../../site/assets/js/data.js';
import { buildModel, countText, filterApplications, matchesKeyword, nextSort, normalize, sortApplications } from '../../site/assets/js/query.js';

const base = { keyword: '', status: '', sort: DEFAULT_SORT, detail: null, notice: null };

test('normalize は全角半角・カタカナ・空白の差を吸収する', () => {
  assert.equal(normalize('ＡＢＣ　１２３'), 'abc123');
  assert.equal(normalize('アオキ サクラ'), 'あおきさくら');
});

test('キーワードは受付番号・氏名・ふりがな・種別・担当課に一致する', () => {
  const app = APPLICATIONS.find((a) => a.id === '2026-01042');
  for (const keyword of ['01042', '青木', 'あおき', 'アオキ', '住民票', '市民課', '青木　さくら']) {
    assert.ok(matchesKeyword(app, keyword), keyword);
  }
  assert.ok(!matchesKeyword(app, '青木 道路'), '空白区切りは AND 条件');
});

test('状態とキーワードで絞り込める', () => {
  const reviewing = filterApplications(APPLICATIONS, { status: 'reviewing' });
  assert.ok(reviewing.length > 0);
  assert.ok(reviewing.every((a) => a.status === 'reviewing'));
  const expected = APPLICATIONS.filter((a) => a.department === 'こども家庭課' && a.status === 'approved').length;
  assert.ok(expected > 0);
  assert.equal(filterApplications(APPLICATIONS, { keyword: 'こども家庭課', status: 'approved' }).length, expected);
  assert.equal(filterApplications(APPLICATIONS, { keyword: '該当なしの語' }).length, 0);
});

test('並べ替えは昇順・降順と同順位の安定化に対応する', () => {
  const byDateDesc = sortApplications(APPLICATIONS, { key: 'receivedAt', dir: 'desc' });
  assert.equal(byDateDesc[0].id, '2026-01042');
  const byDateAsc = sortApplications(APPLICATIONS, { key: 'receivedAt', dir: 'asc' });
  assert.equal(byDateAsc[0].receivedAt, [...APPLICATIONS].map((a) => a.receivedAt).sort()[0]);
  const byStatus = sortApplications(APPLICATIONS, { key: 'status', dir: 'asc' });
  assert.equal(byStatus[0].status, 'received');
  assert.equal(byStatus.at(-1).status, 'rejected');
  const byName = sortApplications(APPLICATIONS, { key: 'applicant', dir: 'asc' });
  assert.equal(byName[0].applicant, '青木 さくら');
});

test('nextSort は同じ列で向きを反転し、別の列では既定の向きにする', () => {
  assert.deepEqual(nextSort({ key: 'id', dir: 'asc' }, 'id'), { key: 'id', dir: 'desc' });
  assert.deepEqual(nextSort({ key: 'id', dir: 'asc' }, 'receivedAt'), { key: 'receivedAt', dir: 'desc' });
  assert.deepEqual(nextSort({ key: 'receivedAt', dir: 'desc' }, 'applicant'), { key: 'applicant', dir: 'asc' });
});

test('buildModel は件数・状態別件数・詳細を組み立てる', () => {
  const all = buildModel(base);
  assert.equal(all.total, APPLICATIONS.length);
  assert.equal(all.shown, APPLICATIONS.length);
  assert.equal(countText(all), `全${APPLICATIONS.length}件`);
  assert.equal(all.statusOptions[0].count, APPLICATIONS.length);
  assert.equal(
    all.statusOptions.slice(1).reduce((sum, o) => sum + o.count, 0),
    APPLICATIONS.length,
    '状態別件数の合計は全件数に一致する',
  );

  const kodomo = APPLICATIONS.filter((a) => a.department === 'こども家庭課');
  const kodomoReviewing = kodomo.filter((a) => a.status === 'reviewing');
  const filtered = buildModel({ ...base, keyword: 'こども家庭課', status: 'reviewing', detail: '2026-01036' });
  assert.equal(filtered.shown, kodomoReviewing.length);
  assert.equal(countText(filtered), `${APPLICATIONS.length}件中 ${kodomoReviewing.length}件`);
  assert.equal(filtered.statusOptions[0].count, kodomo.length, '「すべて」はキーワードのみで絞った件数');
  assert.equal(filtered.detail.id, '2026-01036', '絞り込み外でも詳細は保持する');
  assert.equal(filtered.detail.status.label, '補正依頼');
  assert.equal(filtered.columns.find((c) => c.key === 'receivedAt').ariaSort, 'descending');
});
