import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

const chromePath =
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    launchOptions: fs.existsSync(chromePath)
      ? {
          executablePath: chromePath,
        }
      : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 5173 --strictPort',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    url: 'http://127.0.0.1:5173',
  },
})
