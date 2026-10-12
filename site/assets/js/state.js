// 比較状態の既定値と URL クエリとの相互変換。DOM に依存しない。

import { APPLICATIONS, DEFAULT_SORT, STATUSES } from './data.js';
import { SORT_KEYS } from './query.js';

export const WIDTHS = [
  { value: 'auto', label: '自動' },
  { value: '1280', label: '1280px' },
  { value: '1024', label: '1024px' },
  { value: '768', label: '768px' },
  { value: '375', label: '375px' },
];

export function defaultState(designIds) {
  return {
    mode: 'single',
    left: designIds[0],
    right: designIds[1],
    width: 'auto',
    keyword: '',
    status: '',
    sort: { ...DEFAULT_SORT },
    detail: null,
    notice: null, // 一時的な通知。URL には含めない
  };
}

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

export function parseState(search, designIds) {
  const p = new URLSearchParams(search);
  const base = defaultState(designIds);
  const mode = pick(p.get('mode'), ['single', 'compare'], base.mode);
  const left = pick(p.get(mode === 'compare' ? 'left' : 'design'), designIds, base.left);
  let right = pick(p.get('right'), designIds, base.right);
  if (mode === 'single' && right === left) right = designIds.find((id) => id !== left);
  const sortKey = pick(p.get('sort'), SORT_KEYS, base.sort.key);
  const sortDir = pick(p.get('order'), ['asc', 'desc'], sortKey === base.sort.key ? base.sort.dir : 'asc');
  const detail = p.get('detail');

  return {
    ...base,
    mode,
    left,
    right,
    width: pick(p.get('width'), WIDTHS.map((w) => w.value), base.width),
    keyword: (p.get('q') ?? '').slice(0, 100),
    status: pick(p.get('status'), STATUSES.map((s) => s.value), ''),
    sort: { key: sortKey, dir: sortDir },
    detail: APPLICATIONS.some((a) => a.id === detail) ? detail : null,
  };
}

/** 既定値と同じ項目は省略して、共有しやすい短いクエリにする。 */
export function serializeState(state) {
  const p = new URLSearchParams();
  if (state.mode === 'compare') {
    p.set('mode', 'compare');
    p.set('left', state.left);
    p.set('right', state.right);
  } else {
    p.set('design', state.left);
  }
  if (state.width !== 'auto') p.set('width', state.width);
  if (state.keyword) p.set('q', state.keyword);
  if (state.status) p.set('status', state.status);
  if (state.sort.key !== DEFAULT_SORT.key || state.sort.dir !== DEFAULT_SORT.dir) {
    p.set('sort', state.sort.key);
    p.set('order', state.sort.dir);
  }
  if (state.detail) p.set('detail', state.detail);
  return `?${p.toString()}`;
}
