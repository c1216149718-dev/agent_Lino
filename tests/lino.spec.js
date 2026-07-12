import { expect, test } from '@playwright/test'

const moodStates = [
  { id: 'idle', row: '0', column: '0' },
  { id: 'happy', row: '0', column: '1' },
  { id: 'playful', row: '0', column: '2' },
  { id: 'curious', row: '1', column: '0' },
  { id: 'shy', row: '1', column: '1' },
  { id: 'surprised', row: '1', column: '2' },
  { id: 'thinking', row: '2', column: '0' },
  { id: 'proud', row: '2', column: '1' },
  { id: 'sleepy', row: '2', column: '2' },
]

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'provider_unavailable' }),
    }),
  )
})

test('entry state expands into the Lino comic desk', async ({ page }) => {
  await expect(page).toHaveTitle(/Lino/)
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/site.webmanifest',
  )
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    '/favicon.png',
  )
  await expect(page.getByPlaceholder('请和我对话吧')).toBeVisible()
  await expect(page.getByRole('img', { name: /Lino idle front idle/ }).first()).toBeVisible()

  await page.getByLabel('对话输入').fill('帮我整理一个任务')
  await page.getByRole('button', { name: '发送消息' }).click()

  await expect(page.getByRole('navigation', { name: 'Lino 工作台视图' })).toBeVisible()
  await expect(page.getByRole('button', { name: '打开对话界面' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '情绪' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '记忆' })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(3)
})

test('entry scene uses a clean comic stage and opens the live conversation directly', async ({
  page,
}) => {
  await expect(page.locator('.idle-cloud')).toHaveCount(0)
  await expect(page.locator('.lino-entry-orbit > .comic-rays--tapered')).toHaveCount(1)
  await page.getByRole('button', { name: '发送消息' }).click()

  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible({
    timeout: 700,
  })
  await expect(page.locator('.entry-comic-burst.comic-rays--tapered')).toBeVisible()

  await page.waitForTimeout(180)
  const conversationBox = await page.getByRole('heading', { name: '对话' }).boundingBox()
  expect(conversationBox).not.toBeNull()
  expect(conversationBox.y).toBeLessThan(330)
})

test('entry menu opens a usable quick action and closes with Escape', async ({ page }) => {
  await page.getByLabel('打开菜单').click()

  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: '进入对话空间' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()

  await page.getByLabel('打开菜单').click()
  await page.getByRole('menuitem', { name: '进入对话空间' }).click()
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()
})

test('workspace menu closes on outside press and reset requires confirmation', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  const prompt = '这条消息不能被误删。'
  await page.locator('.conversation-panel input[name="message"]:not([disabled])').fill(prompt)
  await page.locator('.conversation-panel button[type="submit"]:not([disabled])').click()
  await expect(page.locator('article[data-message-id]').filter({ hasText: prompt })).toBeVisible()

  await page.getByLabel('打开菜单').click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.mouse.click(12, 680)
  await expect(page.getByRole('menu')).toBeHidden()

  await page.getByLabel('重置对话').click()
  await expect(page.getByRole('dialog', { name: '重新开始对话' })).toBeVisible()
  await expect(page.locator('.conversation-panel').getByText(prompt)).toBeVisible()
  await page.getByRole('dialog', { name: '重新开始对话' }).getByRole('button', { name: '取消' }).click()
  await expect(page.locator('.conversation-panel').getByText(prompt)).toBeVisible()

  await page.getByLabel('重置对话').click()
  await page.getByRole('button', { name: '确认重新开始' }).click()
  await expect(page.locator('article[data-message-id]')).toHaveCount(1)
})

test('memory records can be added, removed, and cleared without deleting the conversation', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  const prompt = '请保存这一条记忆。'
  await page.locator('.conversation-panel input[name="message"]:not([disabled])').fill(prompt)
  await page.locator('.conversation-panel button[type="submit"]:not([disabled])').click()
  await page.getByRole('button', { name: '打开记忆界面' }).click()

  const memoryPanel = page.locator('.scrapbook-panel')
  await expect(memoryPanel).toBeVisible()
  await expect(memoryPanel.getByText(prompt)).toBeVisible()
  await page.getByLabel('添加一条记忆').fill('我偏好安静的早晨。')
  await page.getByRole('button', { name: '保存记忆' }).click()
  await expect(page.getByText('我偏好安静的早晨。')).toBeVisible()

  await page.getByRole('button', { name: '删除记忆：我偏好安静的早晨。' }).click()
  await expect(page.getByText('我偏好安静的早晨。')).toBeHidden()
  await page.getByRole('button', { name: '清空基本记忆' }).click()
  await expect(page.getByText('还没有可保存的对话。')).toBeVisible()

  await page.getByRole('button', { name: '打开对话界面' }).click()
  await expect(page.locator('.conversation-panel').getByText(prompt)).toBeVisible()
})

test('local data can be exported and cleared from the local page', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.getByRole('button', { name: '打开本地界面' }).click()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出本地数据' }).click()
  await expect(await download).toBeTruthy()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'lino-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 4,
        agentState: 'idle',
        messages: [
          {
            id: 'assistant-imported',
            role: 'assistant',
            content: '已导入的本地对话。',
            createdAt: new Date().toISOString(),
          },
        ],
        favoriteMessageIds: [],
        hiddenMemoryMessageIds: [],
        manualMemories: [],
        memories: [],
      }),
    ),
  })
  await expect(page.getByText('本地数据已导入。')).toBeVisible()

  await page.getByRole('button', { name: '清除本地数据' }).click()
  await expect(page.getByRole('dialog', { name: '清除本地数据' })).toBeVisible()
  await page.getByRole('button', { name: '确认清除本地数据' }).click()
  await expect(page.getByText('本地数据已清除。')).toBeVisible()
})

test('one user and Lino reply share a single conversation action row', async ({ page }) => {
  const originalPrompt = '请为这一轮生成回答。'
  const editedPrompt = '请根据修改后的问题重新回答。'

  await page.getByRole('button', { name: '发送消息' }).click()
  await page.locator('.conversation-panel input[aria-label="对话输入"]:not([disabled])').fill(originalPrompt)
  await page.locator('.conversation-panel button[aria-label="发送消息"]:not([disabled])').click()

  const userMessage = page.locator('article[data-message-id]').filter({ hasText: originalPrompt })
  await expect(userMessage).toBeVisible()
  const userMessageId = await userMessage.getAttribute('data-message-id')
  const editedUserMessage = page.locator(`article[data-message-id="${userMessageId}"]`)
  await expect(page.getByLabel('复制 Lino 回答')).toHaveCount(1)
  await expect(page.getByLabel('编辑本轮用户消息')).toHaveCount(1)
  await expect(page.getByLabel('收藏本轮对话')).toHaveCount(1)
  await expect(page.getByLabel('重试 Lino 回答')).toHaveCount(1)
  await expect(userMessage.getByRole('button')).toHaveCount(0)

  await page.getByLabel('编辑本轮用户消息').click()
  await expect(userMessage.getByLabel('编辑消息内容')).toBeVisible()
  await userMessage.getByLabel('编辑消息内容').fill(editedPrompt)
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByText('Lino 正在思考')).toBeVisible()
  await expect(editedUserMessage).toContainText(editedPrompt)
  await expect(page.getByLabel('重试 Lino 回答')).toBeVisible()

  await page.getByLabel('重试 Lino 回答').click()
  await expect(page.getByText('Lino 正在思考')).toBeVisible()
  await expect(page.getByLabel('重试 Lino 回答')).toBeVisible()
})

test('memory tabs return to the linked conversation message', async ({ page }) => {
  const prompt = '帮我记住这个跳转测试。'
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.locator('.conversation-panel input[aria-label="对话输入"]:not([disabled])').fill(prompt)
  await page.locator('.conversation-panel button[aria-label="发送消息"]:not([disabled])').click()

  const sourceMessage = page.locator('article[data-message-id]').filter({ hasText: prompt })
  await expect(sourceMessage).toBeVisible()
  await page.getByRole('button', { name: '收藏本轮对话' }).click()

  await page.getByRole('button', { name: '打开记忆界面' }).click()
  await page.getByRole('tab', { name: '基本记忆' }).click()
  await page.locator('.scrapbook-panel .memory-link').filter({ hasText: prompt }).click()
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()
  await expect(sourceMessage).toHaveClass(/message-focus/)

  await page.getByRole('button', { name: '打开记忆界面' }).click()
  await page.getByRole('tab', { name: '收藏记忆' }).click()
  await page.locator('.scrapbook-panel .memory-link').filter({ hasText: prompt }).click()
  await expect(sourceMessage).toHaveClass(/message-focus/)
})

test('action cards send users back to the linked conversation without cue pills', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect(page.locator('.panel-cue-row')).toHaveCount(0)

  await page.getByRole('button', { name: '打开行动界面' }).click()
  await page.getByRole('button', { name: '整理一个任务' }).click()
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()
  await expect(page.locator('.message-focus')).toContainText('我想把一个任务整理清楚')
})

test('mobile desk navigation keeps all five views within the visible lane', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '发送消息' }).click()

  const navigation = page.getByRole('navigation', { name: 'Lino 工作台视图' })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('button')).toHaveCount(5)

  const metrics = await navigation.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
})

test('comic desk switches between distinct Lino views', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()

  await page.getByRole('button', { name: '打开情绪界面' }).click()
  await expect(page.getByRole('heading', { name: '情绪画板' })).toBeVisible()
  await page.getByRole('button', { name: /高兴/ }).click()
  await expect(page.getByRole('img', { name: /Lino happy front happy/ }).first()).toBeVisible()

  await page.getByRole('button', { name: '打开记忆界面' }).click()
  await expect(page.getByRole('heading', { name: '记忆剪贴簿' })).toBeVisible()

  await page.getByRole('button', { name: '打开行动界面' }).click()
  await expect(page.getByRole('heading', { name: '行动面板' })).toBeVisible()

  await page.getByRole('button', { name: '打开本地界面' }).click()
  await expect(page.getByRole('heading', { name: '本地空间' })).toBeVisible()
})

test('Lino exposes a distinct activity for chat, memory, actions, and local data feedback', async ({
  page,
}) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  const headerLino = page.locator('.lino-header-orbit [role="img"]')
  await expect(headerLino).toHaveAttribute('data-activity', 'listening')

  await page.getByRole('button', { name: '打开记忆界面' }).click()
  const memoryLino = page.locator('.stamp-panel [role="img"]')
  await expect(memoryLino).toHaveAttribute('data-activity', 'searching')
  await page.getByLabel('添加一条记忆').fill('动作反馈测试。')
  await page.getByRole('button', { name: '保存记忆' }).click()
  await expect(memoryLino).toHaveAttribute('data-activity', 'saving')

  await page.getByRole('button', { name: '打开行动界面' }).click()
  await expect(page.locator('.action-side-panel [role="img"]')).toHaveAttribute(
    'data-activity',
    'execute-ready',
  )

  await page.getByRole('button', { name: '打开本地界面' }).click()
  const localLino = page.locator('.ticket-card [role="img"]')
  await expect(localLino).toHaveAttribute('data-activity', 'guarding')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出本地数据' }).click()
  await download
  await expect(localLino).toHaveAttribute('data-activity', 'saving')
})

test('chat and Mood Lino acknowledge thinking, completion, and a mood reaction', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  const headerLino = page.locator('.lino-header-orbit [role="img"]')
  await page.locator('.conversation-panel input[name="message"]:not([disabled])').fill('请进入思考状态。')
  await page.locator('.conversation-panel button[type="submit"]:not([disabled])').click()
  await expect(headerLino).toHaveAttribute('data-activity', 'thinking')
  await expect(page.getByLabel('重试 Lino 回答')).toBeVisible()
  await expect(headerLino).toHaveAttribute('data-activity', 'complete')

  await page.getByRole('button', { name: '打开情绪界面' }).click()
  const moodLino = page.getByRole('button', { name: '随机切换 Lino 情绪' }).getByRole('img')
  await expect(moodLino).toHaveAttribute('data-activity', 'mood')
  await page.getByRole('button', { name: '随机切换 Lino 情绪' }).click()
  await expect(moodLino).toHaveAttribute('data-activity', 'reacting')
})

test('DeepSeek request falls back to the local simulator when the server is unavailable', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'provider_unavailable' }),
    }),
  )

  await page.locator('.conversation-panel input[name="message"]:not([disabled])').fill('请使用回退回复。')
  await page.locator('.conversation-panel button[type="submit"]:not([disabled])').click()

  await expect(page.locator('article[data-response-source="local-mock"]')).toBeVisible()
  await expect(page.getByText('DeepSeek 暂不可用，已切换为本地模拟回复。')).toBeVisible()
})

test('an in-flight DeepSeek response can be stopped without leaving a blank reply', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.route('**/api/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000))
    await route.abort()
  })

  await page.locator('.conversation-panel input[name="message"]:not([disabled])').fill('请开始一段可停止的回答。')
  await page.locator('.conversation-panel button[type="submit"]:not([disabled])').click()
  await expect(page.getByRole('button', { name: '停止生成' })).toBeVisible()
  await page.getByRole('button', { name: '停止生成' }).click()
  await expect(page.getByRole('button', { name: '停止生成' })).toBeHidden()
  await expect(page.locator('.conversation-panel input[name="message"]:not([disabled])')).toBeVisible()
})

test('mood stage centers Lino together with its status copy', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.getByRole('button', { name: '打开情绪界面' }).click()

  const panel = page.locator('.mood-feature-panel')
  const lino = page.getByRole('button', { name: '随机切换 Lino 情绪' })
  const description = page.getByText('选择一个分镜情绪，Lino 会用动作回应。')
  const [panelBox, linoBox, descriptionBox] = await Promise.all([
    panel.boundingBox(),
    lino.boundingBox(),
    description.boundingBox(),
  ])

  expect(panelBox).not.toBeNull()
  expect(linoBox).not.toBeNull()
  expect(descriptionBox).not.toBeNull()
  expect(Math.abs(linoBox.y + linoBox.height / 2 - (panelBox.y + panelBox.height / 2))).toBeLessThan(70)
  expect(descriptionBox.y).toBeGreaterThan(linoBox.y + linoBox.height)
})

test('mood stage keeps Lino visible in the first desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 920 })
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.getByRole('button', { name: '打开情绪界面' }).click()

  const linoBox = await page.getByRole('button', { name: '随机切换 Lino 情绪' }).boundingBox()
  expect(linoBox).not.toBeNull()
  expect(linoBox.y + linoBox.height).toBeLessThanOrEqual(920)
})

test('header menu actions work and tab hover stays inside the visible navigation lane', async ({
  page,
}) => {
  await page.getByRole('button', { name: '发送消息' }).click()

  const navigation = page.getByRole('navigation', { name: 'Lino 工作台视图' })
  const chatTab = page.getByRole('button', { name: '打开对话界面' })
  await chatTab.hover()

  const [navigationBox, chatTabBox] = await Promise.all([
    navigation.boundingBox(),
    chatTab.boundingBox(),
  ])

  expect(navigationBox).not.toBeNull()
  expect(chatTabBox).not.toBeNull()
  expect(chatTabBox.y).toBeGreaterThanOrEqual(navigationBox.y + 1)

  const menuButton = page.getByRole('button', { name: '打开菜单' })
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  await menuButton.click()
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menu')).toBeVisible()

  await page.getByRole('menuitem', { name: '打开记忆' }).click()
  await expect(page.getByRole('heading', { name: '记忆剪贴簿' })).toBeVisible()
  await expect(page.getByRole('menu')).toBeHidden()
})

test('Mood exposes all nine reference states and sprite coordinates', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.getByRole('button', { name: '打开情绪界面' }).click()

  const moodButtons = page.locator('.expression-strip')
  const mainLino = page.getByRole('button', { name: '随机切换 Lino 情绪' })
  const mainMascot = mainLino.getByRole('img')

  await expect(moodButtons).toHaveCount(9)
  await expect(mainMascot).toHaveAttribute('data-sprite-background', 'transparent')
  await expect(mainMascot.locator('img')).toHaveAttribute(
    'src',
    '/lino-assets/lino-nine-states-transparent.png',
  )

  for (const [index, state] of moodStates.entries()) {
    await moodButtons.nth(index).click()
    await expect(mainMascot).toHaveAttribute('data-state', state.id)
    await expect(mainMascot).toHaveAttribute('data-expression', state.id)
    await expect(mainMascot).toHaveAttribute('data-sprite-row', state.row)
    await expect(mainMascot).toHaveAttribute('data-sprite-column', state.column)
    await expect(moodButtons.nth(index)).toHaveAttribute('aria-pressed', 'true')
  }
})

test('legacy sad and angry states migrate to the approved sprite states', async ({
  page,
}) => {
  const restoreState = async (state) => {
    await page.evaluate((agentState) => {
      window.localStorage.setItem(
        'lino-home:v2',
        JSON.stringify({
          version: 2,
          agentState,
          memories: [],
          messages: [],
        }),
      )
    }, state)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '发送消息' }).click()
    await page.getByRole('button', { name: '打开情绪界面' }).click()
  }

  await restoreState('sad')
  await expect(
    page.getByRole('button', { name: '随机切换 Lino 情绪' }).getByRole('img'),
  ).toHaveAttribute('data-state', 'shy')

  await page.goto('/')
  await restoreState('angry')
  await expect(
    page.getByRole('button', { name: '随机切换 Lino 情绪' }).getByRole('img'),
  ).toHaveAttribute('data-state', 'proud')
})

test('clicking the main Mood Lino triggers a different random expression', async ({
  page,
}) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.getByRole('button', { name: '打开情绪界面' }).click()

  const mainLinoButton = page.getByRole('button', { name: '随机切换 Lino 情绪' })
  const mainLino = mainLinoButton.getByRole('img')
  const previousState = await mainLino.getAttribute('data-state')

  await mainLinoButton.click()

  await expect(mainLino).not.toHaveAttribute('data-state', previousState)
})

test('suggestions, thinking state, and v4 localStorage work', async ({ page }) => {
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()

  await page.getByRole('button', { name: '整理一个任务' }).click()
  await expect(page.getByText('Lino 正在思考')).toBeVisible()
  await expect(page.getByRole('button', { name: '发送消息' })).toBeDisabled()
  await expect(page.locator('article')).toHaveCount(3)
  await expect(page.getByLabel('重试 Lino 回答')).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(window.localStorage.getItem('lino-home:v2') || 'null')?.agentState,
      ),
    )
    .toBe('proud')

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('lino-home:v2') || 'null'),
  )

  expect(stored.version).toBe(4)
  expect(stored.agentState).toBe('proud')
  expect(stored.messages.length).toBeGreaterThanOrEqual(3)
})

test('mobile comic desk has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect(page.getByRole('heading', { name: '对话' })).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )

  expect(overflow).toBeLessThanOrEqual(0)
})
