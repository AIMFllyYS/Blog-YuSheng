import { expect, test } from '@playwright/test'

test('slow article navigation keeps the book veil instead of a blank main', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.route('**/*from-ten-to-hundred-ai-video*', async (route) => {
    const url = route.request().url()
    const isRouteData =
      url.includes('_rsc') ||
      url.includes('index.txt') ||
      url.includes('__PAGE__')
    if (isRouteData) {
      await new Promise((resolve) => {
        setTimeout(resolve, 5_000)
      })
    }
    await route.continue()
  })

  await page.goto('/blog/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 8_000,
  })
  await page.locator('a[href="/blog/from-ten-to-hundred-ai-video/"]').evaluate(
    (element) => {
      if (element instanceof HTMLAnchorElement) element.click()
    },
  )
  await page.waitForURL('**/from-ten-to-hundred-ai-video/**', {
    timeout: 10_000,
  })

  const persistVeil = page.locator('[data-boot-persist="true"]')
  const article = page.locator('[data-reader-article]')
  const index = page.locator('[data-blog-index]')
  const deadline = Date.now() + 8_000
  while (Date.now() < deadline) {
    const visible =
      (await persistVeil.count()) +
      (await article.count()) +
      (await index.count()) +
      (await page.locator('[data-reader-boot-veil]').count())
    expect(visible).toBeGreaterThan(0)
    if ((await persistVeil.count()) > 0 || (await article.count()) > 0) break
    await page.waitForTimeout(200)
  }
  await expect(article).toBeVisible({ timeout: 30_000 })
})
