import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"not_authenticated"}' }))
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.localStorage.setItem('lumora-home:v1', JSON.stringify({
      version: 1, onboardingComplete: true, selectedSpiritId: 'lino', conversations: [], activeBySpirit: {}, conversationMemories: [], sharedMemories: [], favoriteMessageIds: [], deletedConversationIds: [],
    }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '记录' }).click()
  await expect(page.locator('.cloud-transition')).toBeHidden({ timeout: 2_000 })
})

test('六种心情会切换角色状态并写入日历', async ({ page }) => {
  await page.getByRole('button', { name: '难过' }).click()
  await page.getByPlaceholder('想对今天的自己说些什么？').fill('今天需要慢一点。')
  await page.getByRole('button', { name: '记录今天' }).click()
  await expect(page.getByText('当前心情：')).toContainText('难过')
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('lumora-mailbox:v2')))
  expect(stored.moods.at(-1)).toMatchObject({ moodId: 'sad', spiritId: 'lino', note: '今天需要慢一点。' })
  await page.locator('.calendar-grid button.has-mood').click()
  await expect(page.locator('.calendar-day-detail').getByText('今天需要慢一点。')).toBeVisible()
})

test('信件保存收件精灵、信封、字体与寄送状态', async ({ page }) => {
  await page.getByRole('button', { name: '写一封信' }).click()
  await expect(page.locator('.stationery-grid img')).toHaveCount(12)
  await expect.poll(() => page.locator('.stationery-grid img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true)
  await page.locator('.recipient-row').getByRole('button', { name: /Nox/ }).click()
  await page.getByRole('button', { name: '星夜手札' }).click()
  await page.getByRole('button', { name: '书信仿宋' }).click()
  await page.getByLabel('信件正文').fill('今晚想把这份疲惫交给云朵。')
  await page.getByRole('button', { name: '寄给 Nox' }).click()
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('lumora-mailbox:v2')))
  expect(stored.letters.at(-1)).toMatchObject({ recipientSpiritId: 'nox', stationeryId: 'starry-journal', fontId: 'serif', delivery: 'sent', status: 'pending' })
})
