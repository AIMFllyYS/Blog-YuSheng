import { expect, test } from '@playwright/test'

const TARGET_SLUGS = [
  'september-ninth-new-self',
  'october-busy-and-growth',
  'career-planning-course-report',
  'education-in-the-ai-era',
  'when-energy-runs-low',
  'open-models-and-watermarks',
  'med-student-coding-and-health',
  'on-love-a-first-pass',
  'ai-deep-learning-plan',
  'personal-finance-and-ai-dev',
  'agent-principles-and-trends',
  'july-28-ai-frontier-review',
  'ai-coding-engineering-mindset',
  'ai-coding-core-practice',
  'from-ten-to-hundred-ai-video',
  'hui-lao-zhi-zhi-practice',
  'when-we-talk-about-ai-coding',
  'from-using-ai-to-understanding-ai',
]

for (const slug of TARGET_SLUGS) {
  test(`${slug} uses Chinese paragraph indents and keeps semantic list content intact`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto(`/blog/${slug}/`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toHaveAttribute('data-reader-hydrated', 'true')
    const article = page.locator('[data-reader-article]')
    await expect(article).toBeVisible()
    const indent = await article.evaluate((root) => {
      const paragraphs = [...root.querySelectorAll(':scope > h1 + p, :scope > h2 + p, :scope > h3 + p, :scope > h4 + p')]
      return paragraphs.map((element) => {
        const style = getComputedStyle(element)
        return { text: element.textContent?.trim().slice(0, 36) ?? '', indent: parseFloat(style.textIndent), fontSize: parseFloat(style.fontSize) }
      })
    })
    expect(indent.every((item) => item.indent >= item.fontSize * 1.8), JSON.stringify(indent)).toBe(true)
    expect(await article.evaluate((root) => root.scrollWidth <= root.clientWidth + 1)).toBe(true)

    if (slug === 'ai-coding-core-practice') {
      const chapterFive = article.locator('[data-aside-note]').filter({ hasText: '这一章先看四个切面' })
      await expect(chapterFive).toHaveCount(1)
      await expect(chapterFive.locator('li')).toHaveCount(3)
      const deploymentCard = article.locator('[data-inset-card]').filter({ hasText: '部署前要搞懂的几个词' })
      await expect(deploymentCard.locator('ul li')).toHaveCount(4)
      await expect(article.getByRole('heading', { name: '如何绑定', exact: true })).toHaveCount(0)
      await expect(article.getByRole('heading', { name: '：为什么网站需要它', exact: true })).toHaveCount(0)
    }
  })
}
