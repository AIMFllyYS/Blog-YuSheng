import { expect, test } from '@playwright/test'

test('博客列表链接到构建期文章页面', async ({ page }) => {
  await page.goto('/blog/')

  await expect(page.locator('[data-blog-index]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '博客', level: 1 })).toBeVisible()
  await expect(page.getByText('1 卷在架')).toBeVisible()
  await expect(page.locator('[data-book-volume]')).toHaveCount(1)
  await expect(page.getByText(/预计阅读 \d+ 分钟/)).toBeVisible()
  await expect(page.getByText('2026年8月16日')).toBeVisible()
  await expect(page.getByRole('list', { name: '文章标签' })).toContainText('内容引擎')
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

  const articleLink = page.getByRole('link', {
    name: /P0 中文综合验收文章/,
  })
  await expect(articleLink).toHaveAttribute(
    'href',
    '/blog/p0-kitchen-sink/',
  )
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
  ).toBeVisible()
  await expect(
    page.locator('meta[property="og:description"]'),
  ).toHaveAttribute(
    'content',
    '覆盖博客 P0 内容协议、内置语法与首批自定义组件的唯一黄金文章',
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0)
})

test('博客书架在窄屏不挂三个板块且不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/blog/')
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })

  const navigation = page.getByRole('navigation', { name: '绳挂主导航' })
  await expect(navigation.getByText('羽升')).toBeVisible()
  await expect(navigation.getByRole('link', { name: '博客' })).toBeHidden()
  await expect(navigation.getByRole('link', { name: '随笔' })).toBeHidden()
  await expect(navigation.getByRole('link', { name: '作品集' })).toBeHidden()
  await expect(navigation.getByRole('button', { name: /切换主题/ })).toBeVisible()
  await expect(navigation.getByRole('button', { name: /音效偏好/ })).toBeVisible()
  await expect(navigation.getByRole('button', { name: '打开设置' })).toBeVisible()
  await expect(page.locator('[data-book-volume]')).toBeVisible()

  const geometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
})
