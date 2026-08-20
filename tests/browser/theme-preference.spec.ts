import { expect, test, type Page } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'
const mistAccent = '#2f7d95'
const paperAccent = '#a9762f'

async function skipJourneyIfPresent(page: Page) {
  const skip = page.getByRole('button', { name: /跳过/ })
  try {
    await skip.waitFor({ state: 'visible', timeout: 8_000 })
    await skip.click()
  } catch {
    // reduced-motion or already in the revealed shell
  }
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
  await skipJourneyIfPresent(page)
  await expect(page.getByTestId('home-shell')).toBeVisible()

  await page.goto(articlePath)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  await expect(page.getByRole('button', { name: '开启音效偏好' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '关闭音效偏好' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('首页点主题后进书架和文章仍是刚选的纸色', async ({ page }) => {
  await page.goto('/')
  await skipJourneyIfPresent(page)
  await expect(page.getByTestId('home-shell')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper')

  await page.getByRole('button', { name: /切换主题/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  expect(
    await page.locator('html').evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--accent').trim()
    }),
  ).toBe(mistAccent)
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('blog-yusheng:theme:v1')))
    .toBe('mist')

  await page.getByRole('navigation', { name: '绳挂主导航' }).getByRole('link', { name: '博客' }).click()
  await expect(page).toHaveURL(/\/blog\/$/)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 4_000,
  })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  expect(
    await page.locator('html').evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--accent').trim()
    }),
  ).toBe(mistAccent)

  await page.getByRole('link', { name: /P0 中文综合验收文章/ }).click()
  await expect(page).toHaveURL(/\/blog\/p0-kitchen-sink\/$/)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 4_000,
  })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mist')
  expect(
    await page.locator('html').evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--accent').trim()
    }),
  ).not.toBe(paperAccent)
})
