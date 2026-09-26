const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'shop',
      testDir: './tests/shop',
      use: { baseURL: 'http://localhost:3000' },
    },
    {
      name: 'admin',
      testDir: './tests/admin',
      use: { baseURL: 'http://localhost:3001' },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: 'http://localhost:8080' },
    },
  ],
});
