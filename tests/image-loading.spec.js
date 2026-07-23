import { expect, test } from '@playwright/test'

async function seedApp(page) {
  await page.route('**/api/auth/session', (route) => route.fulfill({
    body: '{"error":"not_authenticated"}',
    contentType: 'application/json',
    status: 401,
  }))
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('lumora-home:v1', JSON.stringify({
      activeBySpirit: {},
      conversationMemories: [],
      conversations: [],
      deletedConversationIds: [],
      favoriteMessageIds: [],
      onboardingComplete: true,
      selectedSpiritId: 'lino',
      sharedMemories: [],
      version: 1,
    }))
  })
}

test('character images retry after a temporary network failure', async ({ page }) => {
  let attempts = 0
  await page.route('**/lino-avatar-neutral.webp*', (route) => {
    attempts += 1
    if (attempts === 1) return route.abort('failed')
    return route.continue()
  })
  await seedApp(page)
  await page.reload({ waitUntil: 'domcontentloaded' })

  const avatar = page.locator('.current-spirit-button img')
  await expect(avatar).toHaveAttribute('data-image-status', 'loaded')
  await expect.poll(() => attempts).toBeGreaterThan(1)
  await expect.poll(() => avatar.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
})

test('brand uses the lightweight icon instead of the large source artwork', async ({ page }) => {
  await seedApp(page)
  await page.reload({ waitUntil: 'domcontentloaded' })

  await expect(page.locator('.lumora-brand img').first()).toHaveAttribute('src', '/lumora-icon-192.png')
  await expect(page.locator('img[src*="lumora-mark.png"]')).toHaveCount(0)
})
