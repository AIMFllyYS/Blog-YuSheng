import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'
const mistAccent = '#2f7d95'

async function waitForReader(page: import('@playwright/test').Page) {
  await page.goto(articlePath)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
}

test('所选纸色与音效刷新、换路由后仍保持', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('blog-yusheng:theme:v1', 'mist')
    window.localStorage.setItem('blog-yusheng:audio-enabled:v1', '1')
  })

  await page.goto(articlePath, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  expect(
    await page.locator('html').evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--accent').trim()
    }),
  ).toBe(mistAccent)

  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  expect(
    await page.locator('html').evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--accent').trim()
    }),
  ).toBe(mistAccent)

  await page.goto('/blog/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')

  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  const skip = page.getByRole('button', { name: /跳过/ })
  if (await skip.isVisible()) await skip.click()

  await waitForReader(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  await expect(
    page.getByRole('button', { name: '开启音效偏好' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: '关闭音效偏好' }),
  ).toHaveAttribute('aria-pressed', 'true')
})
