import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    // GitHub Pages と同じサブパスで配信して参照切れを検出する
    baseURL: `http://localhost:${PORT}/design-lab/`,
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'node tests/server.mjs',
    url: `http://localhost:${PORT}/design-lab/`,
    reuseExistingServer: !process.env.CI,
  },
});
