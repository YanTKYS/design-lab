// 画面全体のビューモデル：URL 対象の状態（state）とフォームの状態（form）を合成する。
// state は一覧・ダッシュボード・比較条件、form はメモリだけに持つ入力内容で、互いに依存しない。

import { buildDashboardModel } from './dashboard.js';
import { buildFormModel } from './form.js';
import { buildModel } from './query.js';

export function buildAppModel(state, form) {
  const model = buildModel(state);
  if (state.screen === 'form') return { ...model, form: buildFormModel(form) };
  if (state.screen === 'dashboard') return { ...model, dashboard: buildDashboardModel(state) };
  return model;
}
