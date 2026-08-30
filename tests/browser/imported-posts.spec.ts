import { expect, test } from '@playwright/test'
import path from 'node:path'

const SHOT_DIR = path.join(process.cwd(), '.tmp/import-shots')

test('catalog lists imported 大方向 chapters', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/blog/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 8_000,
  })
  await expect(page.locator('[data-blog-index]')).toBeVisible()
  await expect(page.getByText('7 个方向 · 31 卷在架', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '全栈小白学习记' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI-MFlly散记' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '羽の参学' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '羽の思索' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '羽の复盘' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '羽の随笔' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '其他' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '散页' })).toBeVisible()
  await expect(
    page.locator('a[href="/blog/from-ten-to-hundred-ai-video/"]'),
  ).toBeVisible()
  await expect(
    page.locator('a[href="/blog/july-28-ai-frontier-review/"]'),
  ).toBeVisible()
  await page.screenshot({
    path: path.join(SHOT_DIR, 'shot-catalog.png'),
    fullPage: true,
  })
})

test('legacy yu-reflections hash opens the renamed 羽の思索 book', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/blog/#yu-reflections', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 8_000,
  })
  await expect(page.locator('[data-blog-index]')).toBeVisible()
  const reflections = page.locator('[data-book-slug="yu-reflections"]')
  await expect(reflections).toBeVisible()
  await expect(reflections).toHaveAttribute('aria-expanded', 'true')
  await expect(
    page.getByRole('heading', { name: '羽の思索' }),
  ).toBeVisible()
})

test('imported HTML visual post shows date and filled article', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/blog/from-ten-to-hundred-ai-video/', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('body')).toHaveAttribute(
    'data-reader-hydrated',
    'true',
  )
  const published = page.locator('[data-reader-published-at]')
  await expect(published).toBeVisible()
  await expect(published).toHaveText('2026年7月13日')
  await expect(published).not.toHaveText(/T|\+08:00/)
  await expect(
    page.getByRole('heading', { name: '从十到一百 · AI 视频影视语言注入指南' }),
  ).toBeVisible()
  const article = page.locator('[data-reader-article]')
  await expect(article).toBeVisible()
  const text = (await article.innerText()).trim()
  expect(text.length).toBeGreaterThan(80)
  const embed = page.locator('[data-html-embed]').first()
  await embed.scrollIntoViewIfNeeded()
  await expect(embed).toBeVisible()
  expect(errors).toEqual([])
  await page.screenshot({
    path: path.join(SHOT_DIR, 'shot-from-ten-to-hundred-ai-video.png'),
    fullPage: true,
  })
})

test('imported transcript post shows date and filled article', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/blog/july-28-ai-frontier-review/', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('body')).toHaveAttribute(
    'data-reader-hydrated',
    'true',
  )
  const published = page.locator('[data-reader-published-at]')
  await expect(published).toBeVisible()
  await expect(published).toHaveText('2026年7月28日')
  await expect(
    page.getByRole('heading', { name: '26-7-28 复盘 · AI方向如是状态' }),
  ).toBeVisible()
  const article = page.locator('[data-reader-article]')
  const text = (await article.innerText()).trim()
  expect(text.length).toBeGreaterThan(80)
  expect(text).not.toContain('说话人')
  expect(errors).toEqual([])
  await page.screenshot({
    path: path.join(SHOT_DIR, 'shot-july-28-ai-frontier-review.png'),
    fullPage: true,
  })
})

test('title archive keeps the first subtitle and the personal-finance date', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/blog/when-we-talk-about-ai-coding/', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('body')).toHaveAttribute(
    'data-reader-hydrated',
    'true',
  )
  await expect(
    page.getByRole('heading', { name: 'AI编程范式笔记·羽升手记01-v0.3' }),
  ).toBeVisible()
  await expect(
    page.locator('[data-reader-article]').getByText(
      '当我们在聊 AI 编程的时候，我们到底在聊什么',
      { exact: true },
    ),
  ).toBeVisible()

  await page.goto('/blog/personal-finance-and-ai-dev/', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('body')).toHaveAttribute(
    'data-reader-hydrated',
    'true',
  )
  await expect(page.locator('[data-reader-published-at]')).toHaveText(
    '2026年8月26日',
  )
  await expect(
    page.getByRole('heading', { name: '26-8-26 个人财务复盘' }),
  ).toBeVisible()
})

test('reclassified imported posts appear in their target books', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/blog/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 8_000,
  })
  await expect(page.locator('[data-blog-index]')).toBeVisible()
  const tree = page.locator('[data-blog-tree]')
  if (!(await tree.isVisible())) {
    await page.getByRole('button', { name: '目录' }).click()
  }
  await expect(tree).toBeVisible()

  const expectedByBook = new Map([
    [
      'fullstack-learning',
      ['agent-principles-and-trends'],
    ],
    ['yu-reviews', ['ai-deep-learning-plan', 'personal-finance-and-ai-dev', 'med-student-coding-and-health']],
  ])
  for (const [bookSlug, postSlugs] of expectedByBook) {
    const book = page.locator(`[data-blog-tree] section#${bookSlug}`)
    await book.getByRole('button').click()
    for (const postSlug of postSlugs) {
      await expect(book.locator(`a[href="/blog/${postSlug}/"]`)).toBeVisible()
    }
  }
})
