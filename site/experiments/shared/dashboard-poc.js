// ダッシュボードの独立試作（H′・J・K・L）で共通に使う、状態とイベントだけの小さな制御。
// 集計は共通の dashboard.js（buildDashboardModel）をそのまま使い、件数・割合をここでも各案でも計算しない。
// 見た目は各試作の view が持つ。集計条件はページのメモリだけに置き、URL・履歴・ストレージには書かない。
//
// view(model, ui) が守る約束：
//   対象期間のセレクトは data-bind="period"、担当課は data-bind="dept"。既定に戻すボタンは data-action="reset"。
//   ui = { layout: 'wide' | 'narrow' }。

import { DEFAULT_PERIOD, buildDashboardModel } from '../../assets/js/dashboard.js';
import { patch } from '../../assets/js/morph.js';

export function startDashboardPoc({ app, live, view, title, narrowBelow = 760 }) {
  const state = { period: DEFAULT_PERIOD, dept: '' };
  const media = window.matchMedia(`(max-width: ${narrowBelow - 1}px)`);

  function render() {
    const model = buildDashboardModel(state);
    patch(app, view(model, { layout: media.matches ? 'narrow' : 'wide' }).toString());
    document.title = `${model.scopeText}｜${title}`;
    return model;
  }

  function announce(text) {
    live.textContent = '';
    setTimeout(() => {
      live.textContent = text;
    }, 50);
  }
  const summary = (d) => `${d.scopeText}で集計しました。受付${d.total}件、処理待ち${d.pending}件、処理完了${d.done}件、処理完了率${d.rate}`;

  app.addEventListener('change', (event) => {
    const { bind } = event.target.dataset;
    if (bind !== 'period' && bind !== 'dept') return;
    state[bind] = event.target.value;
    announce(summary(render()));
  });
  app.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="reset"]')) return;
    state.period = DEFAULT_PERIOD;
    state.dept = '';
    const d = render();
    app.querySelector('[data-bind="period"]')?.focus();
    announce(`集計条件を既定に戻しました。${summary(d)}`);
  });
  media.addEventListener('change', render);
  render();
}
