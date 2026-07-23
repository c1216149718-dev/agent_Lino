import { expect, test } from '@playwright/test'

async function mockServices(page) {
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"not_authenticated"}' }))
  await page.route('**/api/chat', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"provider_unavailable"}' }))
  await page.route('**/api/conversations/*/close', (route) => {
    const conversation = route.request().postDataJSON()?.conversation
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memory: {
      id: `memory-${conversation.id}`,
      conversationId: conversation.id,
      spiritId: conversation.spiritId,
      title: '今天的对话',
      summary: '这是一段由测试服务整理的完整对话摘要。',
      keyPoints: ['用户想记录今天发生的事'],
      createdAt: new Date().toISOString(),
    } }) })
  })
}

async function freshStart(page, spiritName = 'Lino') {
  await mockServices(page)
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: `选择 ${spiritName}` }).click()
  await expect(page.getByText(`${spiritName} 已经在这里了`)).toBeVisible()
}

async function waitForTransition(page) {
  await expect(page.locator('.cloud-transition')).toBeHidden({ timeout: 2_000 })
}

test('首次选择精灵后进入独立对话库', async ({ page }) => {
  await freshStart(page, 'Momo')
  await expect(page).toHaveTitle(/云栖境 Lumora/)
  await expect(page.getByText('Momo 已经在这里了')).toBeVisible()
  await page.getByRole('button', { name: '精灵' }).click()
  await waitForTransition(page)
  await page.getByRole('button', { name: '选择 Lino' }).click()
  await waitForTransition(page)
  await expect(page.getByText('Lino 的对话库')).toBeVisible()
})

test('新对话划定边界并生成一张对话记忆', async ({ page }) => {
  await freshStart(page)
  await page.getByLabel('输入消息').fill('今天发生了一件值得记录的事。')
  await page.getByRole('button', { name: '发送' }).click()
  await expect(page.getByText('本地陪伴模式', { exact: true })).toBeVisible()
  await page.locator('.new-conversation-button').click()
  await expect(page.getByText('Lino 已经在这里了')).toBeVisible()
  await page.getByRole('button', { name: '回忆' }).click()
  await waitForTransition(page)
  await expect(page.getByRole('heading', { name: '今天的对话' })).toBeVisible()
  await expect(page.getByText('这是一段由测试服务整理的完整对话摘要。')).toBeVisible()
})

test('删除当前对话同时移除关联记忆并可撤销', async ({ page }) => {
  await freshStart(page)
  await page.getByLabel('输入消息').fill('这段内容稍后会被删除。')
  await page.getByRole('button', { name: '发送' }).click()
  await expect(page.getByText('本地陪伴模式', { exact: true })).toBeVisible()
  await page.locator('.new-conversation-button').click()
  await page.getByRole('button', { name: '回忆' }).click()
  await waitForTransition(page)
  await page.getByRole('button', { name: '删除对应对话和记忆' }).click()
  await page.getByRole('button', { name: '确认删除' }).click()
  await expect(page.getByText('还没有对话记忆')).toBeVisible()
  await page.getByRole('button', { name: '撤销' }).click()
  await expect(page.getByRole('heading', { name: '今天的对话' })).toBeVisible()
})

test('行动入口为指定精灵建立并发送独立任务', async ({ page }) => {
  await freshStart(page)
  await page.getByRole('button', { name: '行动' }).click()
  await waitForTransition(page)
  await page.getByRole('button', { name: '请 Piko 帮忙' }).click()
  await waitForTransition(page)
  await expect(page.getByText('我想寻找一些新的灵感，主题是：', { exact: true })).toBeVisible()
  await expect(page.getByText('本地陪伴模式', { exact: true })).toBeVisible()
})

test('手机端使用侧边抽屉且无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await freshStart(page)
  await page.getByRole('button', { name: '打开导航' }).click()
  await expect(page.locator('.mobile-drawer')).toBeVisible()
  await expect(page.locator('.mobile-drawer').getByRole('button', { name: '个人账户' })).toBeVisible()
  await expect(page.locator('.mobile-drawer').getByText('云栖者')).toBeVisible()
  await page.locator('.mobile-drawer').getByRole('button', { name: '记录' }).click()
  await waitForTransition(page)
  await expect(page.getByRole('heading', { name: '把今天轻轻放进云里' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
})

test('账户资料默认使用云栖身份并可更改名称与头像', async ({ page }) => {
  await freshStart(page)
  await page.getByRole('button', { name: /个人账户：云栖者/ }).click()
  await waitForTransition(page)
  await expect(page.getByRole('heading', { name: '你的云端栖居地' })).toBeVisible()
  await page.getByLabel('用户名').fill('小云')
  await page.locator('input[type="file"][accept^="image/"]').setInputFiles('public/favicon.png')
  await page.getByRole('button', { name: '保存资料' }).click()
  await expect(page.getByText('个人资料已保存在本机。')).toBeVisible()
  await expect(page.getByRole('button', { name: /个人账户：小云/ })).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lumora-profile:v1')))
  expect(stored.displayName).toBe('小云')
  expect(stored.avatarDataUrl).toMatch(/^data:image\/(webp|png);base64,/)
})
