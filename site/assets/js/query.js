// 検索・絞り込み・並べ替えと、デザインへ渡すビューモデルの組み立て。
// DOM に依存しない純粋関数のみ（Node のユニットテスト対象）。

import { APPLICATIONS, COLUMNS, DEFAULT_SORT, NAV_ITEMS, STATUSES, SYSTEM } from './data.js';

const STATUS_BY_VALUE = new Map(STATUSES.map((s, i) => [s.value, { ...s, order: i }]));

/** 全角半角・大文字小文字・カタカナ/ひらがな・空白の差を吸収する。 */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '');
}

/** 空白区切りの各語をすべて含む申請を返す（AND 検索）。 */
export function matchesKeyword(app, keyword) {
  const terms = String(keyword ?? '').normalize('NFKC').split(/\s+/).map(normalize).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize([app.id, app.applicant, app.kana, app.type, app.department].join(' '));
  return terms.every((t) => haystack.includes(t));
}

const collator = new Intl.Collator('ja');

const SORTERS = {
  id: (a, b) => a.id.localeCompare(b.id),
  applicant: (a, b) => collator.compare(a.kana, b.kana),
  type: (a, b) => collator.compare(a.type, b.type),
  receivedAt: (a, b) => a.receivedAt.localeCompare(b.receivedAt),
  status: (a, b) => STATUS_BY_VALUE.get(a.status).order - STATUS_BY_VALUE.get(b.status).order,
};

export const SORT_KEYS = Object.keys(SORTERS);

export function sortApplications(list, sort = DEFAULT_SORT) {
  const cmp = SORTERS[sort.key] ?? SORTERS[DEFAULT_SORT.key];
  const sign = sort.dir === 'asc' ? 1 : -1;
  // 同順位は受付番号の降順で安定させる
  return [...list].sort((a, b) => sign * cmp(a, b) || b.id.localeCompare(a.id));
}

export function filterApplications(list, { keyword = '', status = '' } = {}) {
  return list.filter((app) => (!status || app.status === status) && matchesKeyword(app, keyword));
}

export function formatDate(iso, style = 'ja') {
  const [y, m, d] = iso.split('-');
  if (style === 'slash') return `${y}/${m}/${d}`;
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}

function toRow(app) {
  return { ...app, status: STATUS_BY_VALUE.get(app.status) };
}

/**
 * 状態からデザイン共通のビューモデルを作る。
 * デザイン側はこの値を表示するだけで、検索ロジックを持たない。
 */
export function buildModel(state) {
  const { keyword, status, sort, detail, notice } = state;
  const keywordMatched = filterApplications(APPLICATIONS, { keyword });
  const rows = sortApplications(filterApplications(keywordMatched, { status }), sort).map(toRow);
  const countBy = (value) => keywordMatched.filter((a) => a.status === value).length;
  const detailApp = detail ? APPLICATIONS.find((a) => a.id === detail) : null;

  return {
    system: SYSTEM,
    nav: NAV_ITEMS.map((item) => ({ ...item, current: item.id === 'applications' })),
    keyword,
    status,
    sort,
    statusOptions: [
      { value: '', label: 'すべて', tone: 'neutral', count: keywordMatched.length, selected: !status },
      ...STATUSES.map((s) => ({ ...s, count: countBy(s.value), selected: s.value === status })),
    ],
    columns: COLUMNS.map((c) => ({
      ...c,
      sorted: sort.key === c.key ? sort.dir : null,
      ariaSort: sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none',
    })),
    rows,
    total: APPLICATIONS.length,
    shown: rows.length,
    filtered: Boolean(keyword || status),
    detail: detailApp ? toRow(detailApp) : null,
    notice,
  };
}

/** 現在の並びに対し、列見出しを押したときの次の並び順。 */
export function nextSort(current, key) {
  if (current.key !== key) return { key, dir: key === 'receivedAt' ? 'desc' : 'asc' };
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}

export function countText(model) {
  return model.filtered ? `${model.total}件中 ${model.shown}件` : `全${model.total}件`;
}
