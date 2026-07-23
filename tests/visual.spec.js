import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const artifactDirectory = join(process.env.TEMP || process.cwd(), 'lumora-visual-qa')
const pages = [
  { id: 'chat', label: '首页' },
  { id: 'record', label: '记录' },
  { id: 'memory', label: '回忆' },
  { id: 'actions', label: '行动' },
  { id: 'spirits', label: '精灵' },
  { id: 'account', label: '个人账户' },
]

async function seed(page) {
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"not_authenticated"}' }))
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('lumora-home:v1', JSON.stringify({ version: 1, onboardingComplete: true, selectedSpiritId: 'lino', conversations: [], activeBySpirit: {}, conversationMemories: [], sharedMemories: [], favoriteMessageIds: [], deletedConversationIds: [] }))
  })
  await page.reload({ waitUntil: 'networkidle' })
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'mobile', width: 390, height: 844 }, { name: 'mobile-360', width: 360, height: 800 }]) {
  test(`六个核心页面截图 ${viewport.name}`, async ({ page }) => {
    mkdirSync(artifactDirectory, { recursive: true })
    await page.setViewportSize(viewport)
    await seed(page)
    for (const item of pages) {
      if (viewport.width <= 767) {
        await page.getByRole('button', { name: '打开导航' }).click()
        await page.locator('.mobile-drawer').getByRole('button', { name: item.label }).click()
        await expect(page.locator('.mobile-drawer')).toBeHidden()
      } else {
        await page.getByRole('button', { name: item.id === 'account' ? /个人账户/ : item.label }).click()
      }
      await expect(page.locator('.cloud-transition')).toBeHidden({ timeout: 2_000 })
      await page.screenshot({ fullPage: true, path: join(artifactDirectory, `${viewport.name}-${item.id}.png`) })
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    }
  })
}
