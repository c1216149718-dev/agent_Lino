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

test('信件保存收件精灵、信纸、字体与寄送状态', async ({ page }) => {
  await page.getByRole('button', { name: '写一封信' }).click()
  await expect(page.locator('.stationery-grid img')).toHaveCount(12)
  await expect.poll(() => page.locator('.stationery-grid img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true)
  await page.locator('.recipient-row').getByRole('button', { name: /Nox/ }).click()
  await page.getByRole('button', { name: '星夜手札' }).click()
  await expect(page.locator('.letter-paper-surface')).toHaveCSS('border-image-source', /starry-journal\.webp/)
  await expect(page.locator('.letter-writing')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await page.getByRole('button', { name: '书信仿宋' }).click()
  await page.getByRole('textbox', { name: '信件正文' }).fill('今晚想把这份疲惫交给云朵。')
  await page.getByRole('button', { name: '寄给 Nox' }).click()
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('lumora-mailbox:v2')))
  expect(stored.letters.at(-1)).toMatchObject({ recipientSpiritId: 'nox', stationeryId: 'starry-journal', fontId: 'serif', delivery: 'sent', status: 'pending' })
})

test('mobile letter composer stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.segmented-control button').nth(1).click()
  await expect(page.locator('.letter-paper')).toBeVisible()

  const layout = await page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const boxes = ['.letter-layout', '.letter-options', '.letter-compose-panel', '.letter-paper']
      .map((selector) => document.querySelector(selector)?.getBoundingClientRect())
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth,
      boxes: boxes.map((box) => box && ({ left: box.left, right: box.right })),
    }
  })

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth)
  for (const box of layout.boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(layout.viewportWidth)
  }
})

test('letter paper grows to a stable height before the external scrollbar appears', async ({ page }) => {
  await page.getByRole('button', { name: '写一封信' }).click()
  const paper = page.locator('.letter-paper')
  const textarea = page.getByRole('textbox', { name: '信件正文' })
  const scrollbar = page.getByRole('scrollbar', { name: '信件正文滚动位置' })
  const shortState = await paper.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
  }))
  await expect(scrollbar).not.toHaveClass(/is-visible/)

  await textarea.fill('把今天慢慢写下来。'.repeat(75))
  const mediumState = await paper.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
  }))
  expect(mediumState.height).toBeGreaterThanOrEqual(shortState.height)

  await textarea.fill('把今天慢慢写下来。'.repeat(700))
  await expect(scrollbar).toHaveClass(/is-visible/)
  const longState = await page.evaluate(() => {
    const paperBox = document.querySelector('.letter-paper').getBoundingClientRect()
    const scrollbarBox = document.querySelector('.letter-scrollbar').getBoundingClientRect()
    const textareaElement = document.querySelector('#letter-content')
    return {
      documentHeight: document.documentElement.scrollHeight,
      paperHeight: paperBox.height,
      paperRight: paperBox.right,
      scrollbarLeft: scrollbarBox.left,
      textareaClientHeight: textareaElement.clientHeight,
      textareaScrollHeight: textareaElement.scrollHeight,
    }
  })
  expect(longState.paperHeight).toBeLessThan(1_100)
  expect(longState.documentHeight).toBeLessThan(2_400)
  expect(longState.textareaScrollHeight).toBeGreaterThan(longState.textareaClientHeight)
  expect(longState.scrollbarLeft).toBeGreaterThan(longState.paperRight)
  await expect(page.locator('.letter-paper-surface')).toBeVisible()
  await scrollbar.press('End')
  await expect(scrollbar).toHaveAttribute('aria-valuenow', /^(9[0-9]|100)$/)
  await scrollbar.press('Home')
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '0')
})

test('all twelve stationery styles use bounded nine-slice surfaces', async ({ page }) => {
  await page.getByRole('button', { name: '写一封信' }).click()
  const options = page.locator('.stationery-grid button')
  await expect(options).toHaveCount(12)
  for (let index = 0; index < 12; index += 1) {
    await options.nth(index).click()
    const state = await page.locator('.letter-paper').evaluate((element) => {
      const surface = element.querySelector('.letter-paper-surface')
      return {
        height: element.getBoundingClientRect().height,
        image: window.getComputedStyle(surface).borderImageSource,
      }
    })
    expect(state.height).toBeLessThan(1_100)
    expect(state.image).toContain('/lumora-assets/stationery/')
  }
})
