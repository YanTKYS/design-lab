// 画面全体のビューモデル：URL 対象の状態（state）とフォームの状態（form）を合成する。
// state は一覧・比較条件、form はメモリだけに持つ入力内容で、互いに依存しない。

import { buildFormModel } from './form.js';
import { buildModel } from './query.js';

export function buildAppModel(state, form) {
  const model = buildModel(state);
  return state.screen === 'form' ? { ...model, form: buildFormModel(form) } : model;
}
