import { expect, test, type Page } from '@playwright/test'

const KITCHEN_SINK_HREF = '/blog/p0-kitchen-sink/'
const CATALOG_SURFACE = '[data-catalog-shelf], [data-blog-tree]'

async function waitForCatalog(page: Page) {
  await expect(page.locator('[data-blog-index]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '博客', level: 1 })).toBeVisible()
  await expect(page.getByText('7 个方向 · 31 卷在架', { exact: true })).toBeVisible()
  await expect(page.locator('[data-book-volume]')).toHaveCount(0)
  await expect(page.locator(CATALOG_SURFACE).first()).toBeVisible()
}

async function openKitchenSinkFromCatalog(page: Page) {
  const articleLink = page.locator(`a[href="${KITCHEN_SINK_HREF}"]`)
  const shelf = page.locator('[data-catalog-shelf]')
  const tree = page.locator('[data-blog-tree]')

  if (await shelf.isVisible()) {
    await expect(page.locator('[data-book-slug]').first()).toBeVisible()
    await page.getByRole('button', { name: '目录' }).click()
  }

  await expect(tree).toBeVisible()
  const looseGroup = page.locator('#uncategorized')
  await looseGroup.getByRole('button').click()
  await expect(looseGroup.getByRole('button')).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(articleLink).toBeVisible()
  await expect(articleLink.locator('[data-chapter-tags]')).toContainText('P0')
  await expect(articleLink.locator('[data-chapter-tags]')).toContainText(
    '内容引擎',
  )
  await expect(articleLink.locator('[data-chapter-tags]')).toContainText(
    '中文验收',
  )
  return articleLink
}

test('博客列表链接到构建期文章页面', async ({ page }) => {
  await page.goto('/blog/')
  await waitForCatalog(page)

  await expect(page.getByText(/预计阅读 \d+ 分钟/).first()).toBeVisible()
  await expect(page.getByRole('navigation', { name: '绳挂主导航' })).toContainText('羽升')
  await expect(page.getByRole('navigation', { name: '绳挂主导航' })).toContainText('博客')
  await expect(page.getByRole('navigation', { name: '绳挂主导航' })).toContainText('随笔')
  await expect(page.getByRole('navigation', { name: '绳挂主导航' })).toContainText('作品集')
  await expect(page.getByRole('link', { name: '回到首页' })).toHaveAttribute('href', '/')
  await expect(page.getByRole('button', { name: /切换主题/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /音效偏好/ })).toBeVisible()
  await expect(page.getByRole('button', { name: '打开设置' })).toBeVisible()
  await expect(page.getByText('导出', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('分享本文')).toHaveCount(0)

  const articleLink = await openKitchenSinkFromCatalog(page)
  await expect(articleLink).toHaveAttribute('href', KITCHEN_SINK_HREF)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  await articleLink.click()

  await expect(page).toHaveURL(/\/blog\/p0-kitchen-sink\/$/, {
    timeout: 15_000,
  })
  await expect(page).toHaveTitle('P0 中文综合验收文章')
  await expect(
    page.getByRole('heading', { name: 'P0 中文综合验收文章' }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.locator('meta[property="og:description"]'),
  ).toHaveAttribute(
    'content',
    '覆盖博客 P0 内容协议、内置语法与首批自定义组件的唯一黄金文章',
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0)
})

test('博客书架在窄屏走目录树且不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/blog/')
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  await waitForCatalog(page)

  await expect(page.locator('[data-blog-tree]')).toBeVisible()
  await expect(page.locator('[data-catalog-shelf]')).toHaveCount(0)
  await expect(page.locator('[data-book-volume]')).toHaveCount(0)

  const navigation = page.getByRole('navigation', { name: '绳挂主导航' })
  await expect(navigation.getByText('羽升')).toBeVisible()
  await expect(navigation.getByRole('link', { name: '博客' })).toBeHidden()
  await expect(navigation.getByRole('link', { name: '随笔' })).toBeHidden()
  await expect(navigation.getByRole('link', { name: '作品集' })).toBeHidden()
  await expect(navigation.getByRole('button', { name: /切换主题/ })).toBeVisible()
  await expect(navigation.getByRole('button', { name: /音效偏好/ })).toBeVisible()
  await expect(navigation.getByRole('button', { name: '打开设置' })).toBeVisible()

  const geometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)

  const looseGroup = page.locator('#uncategorized')
  await looseGroup.getByRole('button').click()
  await expect(looseGroup.locator('[data-chapter-tags]')).toContainText('P0')
})

test('书库悬停小书脊时书签旁显示标签', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/blog/')
  await waitForCatalog(page)

  const shelf = page.locator('[data-catalog-shelf]')
  if (!(await shelf.isVisible())) {
    test.skip(true, '当前视口走目录树，不渲染书库')
  }

  const tome = page.locator('[data-book-slug="uncategorized"]')
  await tome.click()
  const spine = tome.locator(`a[href="${KITCHEN_SINK_HREF}"]`)
  await expect(spine).toBeVisible()
  await spine.dispatchEvent('mouseover')
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip.locator('[data-bookmark-tags]')).toContainText('P0')
  await expect(tooltip.locator('[data-bookmark-tags]')).toContainText('内容引擎')

  await spine.evaluate((element) => {
    if (element instanceof HTMLAnchorElement) element.click()
  })
  await expect(page).toHaveURL(/\/blog\/p0-kitchen-sink\/$/)
})

test('标题归档后的文章路由仍可直接打开', async ({ page }) => {
  test.setTimeout(90_000)
  const renamedRoutes = [
    ['ai-deep-learning-plan', '25-12-9 AI 深度学习计划'],
    ['agent-principles-and-trends', 'Agent的简单理解'],
    ['med-student-coding-and-health', '26-2-19 复盘 · 医学生转码血泪史｜注意身体'],
  ] as const

  for (const [slug, title] of renamedRoutes) {
    await page.goto(`/blog/${slug}/`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toHaveAttribute(
      'data-reader-hydrated',
      'true',
    )
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  }
})
