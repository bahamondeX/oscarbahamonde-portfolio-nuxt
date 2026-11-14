import { defineConfig, devices } from '@playwright/test'

// Always launches an isolated browser. Never attaches to a user's browser/profile.
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'reports/playwright-artifacts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }], ['json', { outputFile: 'reports/playwright-results.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3187',
    reducedMotion: 'reduce',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 3187',
    url: 'http://127.0.0.1:3187/es',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
