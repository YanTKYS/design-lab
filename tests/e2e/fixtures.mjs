import { expect, test as base } from '@playwright/test';

export { expect };

/**
 * コンソールエラー・ページエラー・失敗したリクエストを検出したらテストを失敗させる。
 * ただし、テストが次のページへ移ったことで、前のページの取得（アイコンやモジュール）が中断されたもの
 * （net::ERR_ABORTED で、要求の後にメインフレームの移動が始まっている）は、ブラウザの誤りではないので数えない。
 * 移動していないのに中断されたもの・ほかの理由で失敗したものは、これまでどおり失敗として数える。
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    let navigations = 0;
    const startedAt = new WeakMap();
    // 移動はその開始（メインフレームのナビゲーション要求）で数える。前のページの取得は、移動の開始時点で中断される
    page.on('request', (req) => {
      if (req.isNavigationRequest() && req.frame() === page.mainFrame()) navigations += 1;
      else startedAt.set(req, navigations);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`console.${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('response', (res) => {
      if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    page.on('requestfailed', (req) => {
      const abortedByNavigation = req.failure()?.errorText === 'net::ERR_ABORTED' && navigations > (startedAt.get(req) ?? navigations);
      if (!abortedByNavigation) problems.push(`request failed: ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`);
    });
    await use(page);
    expect(problems, 'ブラウザのエラー').toEqual([]);
  },
});
