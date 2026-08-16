import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const SVG_PATH = path.join(
  process.cwd(),
  'content/posts/p0-kitchen-sink/media/svg/safe-diagram.svg',
)
const SVG_REQUEST = /\/media\/svg\/safe-diagram\.svg$/

test('sanitized SVG is displayed only through an isolated image resource', async ({
  page,
}) => {
  await page.route(SVG_REQUEST, async (route) => {
    await route.fulfill({
      body: await readFile(SVG_PATH),
      contentType: 'image/svg+xml',
    })
  })
  await page.goto('/blog/p0-kitchen-sink/')

  const card = page.locator('[data-svg-renderer="sanitized-image"]')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toBeVisible()
  await expect(card.getByRole('img', { name: '安全 SVG 示例' })).toBeVisible()
  await expect(card.getByText('安全 SVG 示例')).toBeVisible()
  await expect(card).toHaveAttribute('data-selectable', 'none')
  await expect(card.locator('svg')).toHaveCount(0)
  await expect(card.locator('img')).toHaveAttribute(
    'src',
    '/blog/p0-kitchen-sink/media/svg/safe-diagram.svg',
  )
})

test('failed SVG resource falls back only its own document node', async ({
  page,
}) => {
  await page.route(SVG_REQUEST, (route) => route.abort())
  await page.goto('/blog/p0-kitchen-sink/')

  await page
    .getByRole('heading', { name: '媒体与安全组件' })
    .scrollIntoViewIfNeeded()
  await expect(
    page.locator('[data-document-fallback="DOC-ASSET-004"]').filter({
      hasText: '这张 SVG 暂时无法加载',
    }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: '轻量问答' })).toBeVisible()
})
