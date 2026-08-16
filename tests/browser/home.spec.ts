import { expect, test } from '@playwright/test'

test('首页可由真实 Chromium 访问', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/羽升/)
  await expect(page.locator('body')).toBeVisible()
})
