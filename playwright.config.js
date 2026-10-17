import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  timeout: 90000, expect: { timeout: 15000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4178', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } }],
  webServer: [
    { command: 'node node_modules/tsx/dist/cli.mjs apps/api/src/server.ts', url: 'http://127.0.0.1:3101/health', reuseExistingServer: false, timeout: 120000,
      env: { NODE_ENV: 'test', API_PORT: '3101', CLIENT_ORIGIN: 'http://127.0.0.1:4178', DATABASE_URL: process.env.TEST_DATABASE_URL || '' } },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4178 --strictPort', url: 'http://127.0.0.1:4178', reuseExistingServer: false, timeout: 120000,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101', VITE_API_BASE_URL: '' } },
  ],
})
