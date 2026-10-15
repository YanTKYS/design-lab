// 期待値は、画面とは別にサンプルデータから算出する（データを拡充してもテストを書き換えずに済む）。

import { APPLICATIONS } from '../../site/assets/js/data.js';
import { filterApplications } from '../../site/assets/js/query.js';

export { APPLICATIONS };
export const TOTAL = APPLICATIONS.length;

/** 一覧のキーワード・状態の絞り込み結果の件数。 */
export const countOf = (conditions) => filterApplications(APPLICATIONS, conditions).length;
export const LOWEST_ID = APPLICATIONS.map((a) => a.id).sort()[0];
