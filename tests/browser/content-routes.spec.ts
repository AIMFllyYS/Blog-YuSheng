import { expect, test } from '@playwright/test'

test('博客列表链接到构建期文章页面', async ({ page }) => {
  await page.goto('/blog/')

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
