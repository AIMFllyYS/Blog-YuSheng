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
  await expect(homeNav.getByRole('link', { name: '日报' })).toBeVisible()
  await expect(homeNav.getByRole('link', { name: '作品集' })).toBeVisible()
  await expect(homeNav.getByText('关于我')).toHaveCount(0)
  await expect(homeNav.locator('[data-tip]').first()).toBeVisible()

  const brand = await homeNav.locator('[data-rope-hanger="brand"]').boundingBox()
  const works = await homeNav.locator('[data-rope-hanger="works"]').boundingBox()
  const settings = await homeNav
    .locator('[data-rope-hanger="settings"]')
    .boundingBox()
  expect(brand).not.toBeNull()
  expect(works).not.toBeNull()
  expect(settings).not.toBeNull()
  expect(brand!.x).toBeLessThan(works!.x)
  expect(works!.x).toBeLessThan(settings!.x)
  expect(settings!.x - (works!.x + works!.width)).toBeGreaterThan(24)

  const blogTip = homeNav.getByRole('link', { name: '博客' })
  await blogTip.hover()
  await expect
    .poll(async () =>
      blogTip.evaluate((element) => getComputedStyle(element, ':after').opacity),
    )
    .toBe('1')
  expect(
    await blogTip.evaluate((element) =>
      getComputedStyle(element, ':after').content.includes('文章列表'),
    ),
  ).toBe(true)

  await page.goto('/blog/')
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  const blogNav = rope(page)
  await expect(blogNav.getByRole('link', { name: '博客' })).toBeVisible()
  await expect(blogNav.getByRole('link', { name: '日报' })).toBeVisible()
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
  await expect(navigation.getByRole('link', { name: '日报' })).toHaveCount(0)
  await expect(navigation.getByRole('link', { name: '作品集' })).toHaveCount(0)
})

test('日报进入台历目录，作品集是新标签外链', async ({ page }) => {
  await page.goto('/')
  await skipJourneyIfPresent(page)
  const works = rope(page).getByRole('link', { name: '作品集' })
  await expect(works).toHaveAttribute(
    'href',
    'https://artifact.yusheng.husteread.com/',
  )
  await expect(works).toHaveAttribute('target', '_blank')

  await rope(page).getByRole('link', { name: '日报' }).click()
  await expect(page).toHaveURL(/\/daily\/$/)
  await expect(page.getByRole('heading', { name: '小日报', level: 1 })).toBeVisible()
})

test('文章页隐藏日报和作品集，保留导出', async ({ page }) => {
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
  await expect(navigation.getByRole('link', { name: '日报' })).toHaveCount(0)
  await expect(navigation.getByRole('link', { name: '作品集' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导出' })).toBeVisible()
})

test('从首页点博客只出现翻书遮罩，没有转圈圈', async ({ page }) => {
  await page.goto('/')
  await skipJourneyIfPresent(page)
  await rope(page).getByRole('link', { name: '博客' }).click()
  await expect(page.locator('.animate-spin')).toHaveCount(0)
  const veil = page.locator('[data-reader-boot-veil]')
  const heading = page.getByRole('heading', { name: '博客', level: 1 })
  await expect(veil.or(heading).first()).toBeVisible({ timeout: 10_000 })
  if ((await veil.count()) > 0) {
    await expect(page.locator('[data-reader-book-loader]')).toBeVisible()
    await expect(page.locator('[data-reader-boot-stamp]')).toHaveCount(1)
  }
  await expect(heading).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.animate-spin')).toHaveCount(0)
})
