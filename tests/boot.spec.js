import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const artifactDirectory = join(process.env.TEMP || process.cwd(), 'lumora-visual-qa')

test('启动加载层预载关键素材并在完成后进入页面', async ({ page }) => {
  mkdirSync(artifactDirectory, { recursive: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  const loader = page.locator('.lumora-boot')
  await expect(loader).toBeVisible()
  await expect(page.locator('.boot-gear')).toHaveCSS('animation-name', 'boot-gear-turn')
  await expect(page.locator('.boot-star-one')).toHaveCSS('animation-name', 'boot-star-twinkle')
  await expect(page.locator('.boot-cloud-curl-left')).toHaveCSS('animation-name', 'boot-cloud-roll')
  await page.screenshot({ path: join(artifactDirectory, 'boot-loader-desktop.png') })
  await expect(loader).toBeHidden({ timeout: 6_000 })
})

test('手机端启动加载层保持居中且没有横向溢出', async ({ page }) => {
  mkdirSync(artifactDirectory, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.locator('.lumora-boot')).toBeVisible()
  await page.screenshot({ path: join(artifactDirectory, 'boot-loader-mobile.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
})
