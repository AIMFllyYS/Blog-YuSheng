import { expect, test } from '@playwright/test'

test('404 走书卷 token，不是脚手架灰页', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
  await expect(page.getByText('页面不存在')).toBeVisible()
  await expect(page.locator('.bg-gray-900, .text-gray-600, .bg-gray-800')).toHaveCount(
    0,
  )
  expect(
    await page.locator('html').evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--bg').trim()
    }),
  ).not.toBe('')
  await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible()
})
