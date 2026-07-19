import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const artifactDirectory = join(process.env.TEMP || process.cwd(), 'lino-mailbox-qa')
const views = [
  { id: 'chat', desktopName: '打开对话界面', mobileName: '对话', heading: '对话', selector: '.conversation-panel' },
  { id: 'mailbox', desktopName: '打开信箱界面', mobileName: '情绪信箱', heading: '情绪信箱', selector: '.mailbox-page' },
  { id: 'memory', desktopName: '打开记忆界面', mobileName: '记忆', heading: '记忆剪贴簿', selector: '.scrapbook-panel' },
  { id: 'actions', desktopName: '打开行动界面', mobileName: '行动', heading: '行动面板', selector: '.action-board' },
  { id: 'account', desktopName: '打开账户界面', mobileName: '账户与隐私', heading: '账户与隐私', selector: '.account-page' },
]

test.beforeEach(async ({ page }) => {
  mkdirSync(artifactDirectory, { recursive: true })
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"not_authenticated"}' }),
  )
  await page.route('**/api/chat', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"provider_unavailable"}' }),
  )
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
})

test('capture all desktop product views at the acceptance viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: '发送消息' }).click()
  for (const view of views) {
    await page.getByRole('button', { name: view.desktopName }).click()
    await expect(page.getByRole('heading', { name: view.heading })).toBeVisible()
    await expect(page.locator(view.selector)).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ fullPage: true, path: join(artifactDirectory, `desktop-${view.id}.png`) })
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('capture all mobile product views through the edge drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '发送消息' }).click()
  for (const view of views) {
    await page.getByRole('button', { name: '打开移动导航' }).click()
    const drawer = page.getByRole('dialog', { name: 'Lino 移动导航' })
    await drawer.getByRole('button', { name: new RegExp(view.mobileName) }).click()
    await expect(page.getByRole('heading', { name: view.heading })).toBeVisible()
    await expect(page.locator(view.selector)).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ fullPage: true, path: join(artifactDirectory, `mobile-${view.id}.png`) })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }
})

test('mailbox remains stable at tablet and narrow-phone acceptance sizes', async ({ page }) => {
  for (const viewport of [{ width: 768, height: 1024, name: 'tablet' }, { width: 360, height: 800, name: 'mobile-360' }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await page.getByRole('button', { name: '发送消息' }).click()
    if (viewport.width < 768) {
      await page.getByRole('button', { name: '打开移动导航' }).click()
      await page.getByRole('dialog', { name: 'Lino 移动导航' }).getByRole('button', { name: /情绪信箱/ }).click()
    } else {
      await page.getByRole('button', { name: '打开信箱界面' }).click()
    }
    await expect(page.locator('.mailbox-page')).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ fullPage: true, path: join(artifactDirectory, `${viewport.name}-mailbox.png`) })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }
})
