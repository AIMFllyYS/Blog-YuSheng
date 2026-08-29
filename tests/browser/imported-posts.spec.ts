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
  await expect(page.getByText(/\d+ 个方向 · \d+ 卷在架/)).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '全栈小白学习记' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI-MFlly散记' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '羽の反思' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '羽の复盘' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '羽の随笔' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '其他' })).toBeVisible()
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
    page.getByRole('heading', { name: '7 月 28 日：把 AI 编程的信息差说清楚' }),
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
