import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 900 }, contextOptions: { reducedMotion: 'reduce' } })

for (const slug of ['ai-coding-core-practice', 'when-we-talk-about-ai-coding', 'hui-lao-zhi-zhi-practice']) {
  test(`${slug} keeps long source text and interactives inside the mobile reader`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto(`/blog/${slug}/`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toHaveAttribute('data-reader-hydrated', 'true')
    const article = page.locator('[data-reader-article]')
    await expect(article).toBeVisible()
    const dimensions = await article.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }))
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1)
    const embeds = article.locator('[data-html-embed]')
    for (let index = 0; index < await embeds.count(); index += 1) {
      const embed = embeds.nth(index)
      await embed.scrollIntoViewIfNeeded()
      await expect(embed).toHaveAttribute('data-embed-ready', 'true')
      const handle = await embed.locator('iframe').elementHandle()
      const frame = await handle!.contentFrame()
      const size = await frame!.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
      expect(size.scroll).toBeLessThanOrEqual(size.client + 1)
    }
  })
}
