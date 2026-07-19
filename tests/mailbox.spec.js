import { expect, test } from '@playwright/test'

async function enterWorkspace(page) {
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'not_authenticated' }),
    }),
  )
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'provider_unavailable' }),
    }),
  )
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
})

test('a letter keeps its mood, paper, font, calendar stamp, and delivery state', async ({ page }) => {
  await enterWorkspace(page)
  await page.getByRole('button', { name: '打开信箱界面' }).click()

  await page.getByRole('button', { name: '难过' }).click()
  await page.getByRole('button', { name: /夜空来信/ }).click()
  await page.getByRole('button', { name: '书信仿宋' }).click()
  await page.getByLabel('写下今天的感受').fill('今天有点累，但写下来以后，好像没那么堵了。')
  await page.getByRole('button', { name: '寄给 Lino' }).click()

  await expect(page.getByText('已经寄给 Lino')).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('lino-mailbox-v1')))
  expect(stored.letters).toHaveLength(1)
  expect(stored.letters[0]).toMatchObject({
    delivery: 'sent',
    fontId: 'serif',
    moodId: 'sad',
    stationeryId: 'night',
    status: 'pending',
  })

  await page.getByRole('tab', { name: '我的信箱' }).click()
  await expect(page.getByRole('button', { name: /写过信/ })).toBeVisible()
  await page.getByRole('button', { name: /写过信/ }).click()
  await expect(page.getByText('今天有点累，但写下来以后，好像没那么堵了。')).toBeVisible()
})

test('the crisis note offers immediate help instead of asking the user to wait', async ({ page }) => {
  await enterWorkspace(page)
  await page.getByRole('button', { name: '打开信箱界面' }).click()
  await page.getByLabel('写下今天的感受').fill('我现在觉得活不下去了。')
  const notice = page.getByRole('status')
  await expect(notice).toContainText('现在的你不必一个人撑着')
  await expect(notice).toContainText('120 / 110')
  await expect(notice).toContainText('不能代替紧急支持')
})

test('mobile letter writing uses the side drawer and bottom selectors without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await enterWorkspace(page)

  await expect(page.getByRole('navigation', { name: 'Lino 工作台视图' })).toBeHidden()
  await page.getByRole('button', { name: '打开移动导航' }).click()
  await page.getByRole('dialog', { name: 'Lino 移动导航' }).getByRole('button', { name: /情绪信箱/ }).click()
  await page.getByRole('button', { name: '信纸' }).click()
  const sheet = page.getByRole('dialog', { name: '挑一张信纸' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: /夜空来信/ }).click()
  await page.getByLabel('写下今天的感受').fill('这是手机端写下的一封短信。')
  await page.getByRole('button', { name: '留在信箱' }).click()

  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    width: document.documentElement.scrollWidth,
  }))
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport)
  await expect(page.getByText('已经留在信箱')).toBeVisible()
})

test('a guest can create a Lino ID and explicitly approve the first upload', async ({ page }) => {
  await page.route('**/api/auth/create', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { linoId: 'LINO-ABCD-EFGH' },
        recoveryCode: 'spring-cloud-letter-2026',
      }),
    }),
  )
  await page.route('**/api/sync', (route) => {
    const body = route.request().method() === 'GET'
      ? { chat: { version: 4, messages: [], memories: [], manualMemories: [] }, mailbox: { version: 1, letters: [], moods: [], replies: [], settings: {} } }
      : { ok: true, syncedAt: new Date().toISOString() }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await enterWorkspace(page)
  await page.getByRole('button', { name: '打开账户界面' }).click()
  await page.getByRole('button', { name: '创建 Lino ID' }).click()

  const recovery = page.getByRole('dialog')
  await expect(recovery).toContainText('LINO-ABCD-EFGH')
  await expect(recovery).toContainText('spring-cloud-letter-2026')
  await recovery.getByRole('button', { name: '关闭恢复卡' }).click()
  await expect(page.getByText('要把这台设备的内容带进账号吗？')).toBeVisible()
  await page.getByRole('button', { name: '上传本机内容' }).click()
  await expect(page.getByText('聊天、记忆、心情和信件已同步。')).toBeVisible()
})

test('restoring an account waits for a local-data decision before enabling sync', async ({ page }) => {
  const remoteMessage = '这是恢复卡账号里的云端对话。'
  await page.route('**/api/auth/restore', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { linoId: 'LINO-CLOUD-2026' } }),
    }),
  )
  await page.route('**/api/sync', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        chat: {
          version: 4,
          agentState: 'idle',
          favoriteMessageIds: [],
          hiddenMemoryMessageIds: [],
          manualMemories: [],
          memories: [],
          messages: [{ id: 'assistant-cloud', role: 'assistant', content: remoteMessage, createdAt: new Date().toISOString() }],
        },
        mailbox: { version: 1, letters: [], moods: [], replies: [], settings: { timezone: 'Asia/Shanghai' } },
      }),
    }),
  )

  await enterWorkspace(page)
  await page.getByRole('button', { name: '打开账户界面' }).click()
  await page.getByLabel('Lino ID', { exact: true }).fill('LINO-CLOUD-2026')
  await page.getByLabel('恢复码', { exact: true }).fill('CLOUD-CARD-2026')
  await page.getByRole('button', { name: '恢复账号' }).click()

  await expect(page.getByText('要把这台设备的内容带进账号吗？')).toBeVisible()
  await expect(page.getByRole('button', { name: '上传本机内容' })).toBeVisible()
  await page.getByRole('button', { name: '只使用云端内容' }).click()
  await page.getByRole('button', { name: '打开对话界面' }).click()
  await expect(page.locator('.conversation-panel').getByText(remoteMessage)).toBeVisible()
})
