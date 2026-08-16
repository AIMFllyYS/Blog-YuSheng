import { expect, test } from '@playwright/test'

test('字体 CDN 失败时正文立即使用系统衬线降级且代码仍为等宽体', async ({
  page,
}) => {
  await page.route(/https:\/\/[^/]*zeoseven\.com\//u, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000))
    await route.abort()
  })

  const startedAt = Date.now()
  await page.goto('/blog/p0-kitchen-sink/', { waitUntil: 'commit' })
  const heading = page.getByRole('heading', { name: 'P0 中文综合验收文章', level: 1 })
  await expect(heading).toBeVisible({ timeout: 2_000 })
  expect(Date.now() - startedAt).toBeLessThan(2_500)

  await page.waitForTimeout(4_500)

  const families = await page.evaluate(() => {
    const article = document.querySelector<HTMLElement>('[data-reader-article]')
    const code = document.querySelector<HTMLElement>('[data-code-renderer="shiki-server"] code')
    if (!article || !code) throw new Error('字体验收节点缺失')
    return {
      article: getComputedStyle(article).fontFamily,
      code: getComputedStyle(code).fontFamily,
    }
  })

  expect(families.article).toContain('Noto Serif CJK')
  expect(families.article).toContain('Source Han Serif SC')
  expect(families.article).toContain('Noto Serif SC')
  expect(families.code).toContain('JetBrains Mono')
  expect(families.code).not.toContain('Noto Serif CJK')
})
