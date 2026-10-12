import { expect, test as base } from '@playwright/test';

export { expect };

/** コンソールエラー・ページエラー・失敗したリクエストを検出したらテストを失敗させる。 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`console.${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('response', (res) => {
      if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    page.on('requestfailed', (req) => problems.push(`request failed: ${req.url()}`));
    await use(page);
    expect(problems, 'ブラウザのエラー').toEqual([]);
  },
});
