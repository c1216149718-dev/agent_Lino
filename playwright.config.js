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
    baseURL: 'http://127.0.0.1:5175',
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
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    url: 'http://127.0.0.1:5175',
  },
})
