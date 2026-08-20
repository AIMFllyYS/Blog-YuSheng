import { expect, test, type Page } from '@playwright/test'

async function skipJourneyIfPresent(page: Page) {
  const skip = page.getByRole('button', { name: /跳过/ })
  try {
    await skip.waitFor({ state: 'visible', timeout: 8_000 })
    await skip.click()
  } catch {
    // reduced-motion or already in the revealed shell
  }
  await expect(
    page.locator('[data-testid="home-shell"], [data-testid="mobile-home"]'),
  ).toBeVisible({ timeout: 15_000 })
}

function rope(page: Page) {
  return page.getByRole('navigation', { name: '绳挂主导航' })
}

test('桌面首页与书架绳上挂三个板块，没有关于我', async ({ page }) => {
  await page.goto('/')
  await skipJourneyIfPresent(page)
  const homeNav = rope(page)
  await expect(homeNav.getByRole('link', { name: '博客' })).toBeVisible()
  await expect(homeNav.getByRole('link', { name: '随笔' })).toBeVisible()
  await expect(homeNav.getByRole('link', { name: '作品集' })).toBeVisible()
  await expect(homeNav.getByText('关于我')).toHaveCount(0)
  await expect(homeNav.locator('[data-tip]').first()).toBeVisible()

  await page.goto('/blog/')
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  const blogNav = rope(page)
  await expect(blogNav.getByRole('link', { name: '博客' })).toBeVisible()
  await expect(blogNav.getByRole('link', { name: '随笔' })).toBeVisible()
  await expect(blogNav.getByRole('link', { name: '作品集' })).toBeVisible()
  await expect(blogNav.getByText('关于我')).toHaveCount(0)
})

test('移动端首页绳上不挂三个板块', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 })
  await page.goto('/')
  const navigation = rope(page)
  await expect(page.getByTestId('mobile-home')).toBeVisible()
  await expect(navigation.getByText('羽升')).toBeVisible()
  await expect(navigation.getByRole('link', { name: '博客' })).toHaveCount(0)
  await expect(navigation.getByRole('link', { name: '随笔' })).toHaveCount(0)
  await expect(navigation.getByRole('link', { name: '作品集' })).toHaveCount(0)
})

test('随笔和作品集进入建设中占位页', async ({ page }) => {
  await page.goto('/')
  await skipJourneyIfPresent(page)
  await rope(page).getByRole('link', { name: '随笔' }).click()
  await expect(page).toHaveURL(/\/notes\/$/)
  await expect(page.getByRole('heading', { name: '随笔' })).toBeVisible()
  await expect(page.getByText('建设中')).toBeVisible()

  await rope(page).getByRole('link', { name: '作品集' }).click()
  await expect(page).toHaveURL(/\/works\/$/)
  await expect(page.getByRole('heading', { name: '作品集' })).toBeVisible()
  await expect(page.getByText('建设中')).toBeVisible()
})

test('文章页隐藏随笔和作品集，保留导出', async ({ page }) => {
  await page.goto('/blog/p0-kitchen-sink/')
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  const navigation = rope(page)
  await expect(navigation).toHaveAttribute('data-nav-visible', 'true')
  await expect(navigation.getByRole('link', { name: '博客' })).toBeVisible()
  await expect(navigation.getByText('羽升')).toBeVisible()
  await expect(navigation.getByRole('link', { name: '随笔' })).toHaveCount(0)
  await expect(navigation.getByRole('link', { name: '作品集' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导出' })).toBeVisible()
})
