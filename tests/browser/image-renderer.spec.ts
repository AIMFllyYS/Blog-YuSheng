import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test('responsive article image reserves its final browser layout before loading', async ({
  page,
}) => {
  const cover = await readFile(
    path.join(
      process.cwd(),
      'content',
      'posts',
      'p0-kitchen-sink',
      'media',
      'images',
      'cover.png',
    ),
  )
  let releaseImage = (): void => undefined
  const imageGate = new Promise<void>((resolve) => {
    releaseImage = resolve
  })
  await page.route(/\/cover(?:-\d+)?\.(?:avif|webp|png)$/, async (route) => {
    await imageGate
    await route.fulfill({
      body: cover,
      contentType: 'image/png',
    })
  })

  await page.goto('/blog/p0-kitchen-sink/', {
    waitUntil: 'domcontentloaded',
  })
  const figure = page.locator('figure[data-image-renderer="responsive"]')
  await figure.scrollIntoViewIfNeeded()
  const image = figure.getByRole('img', {
    name: '蓝紫渐变的 P0 验收封面',
  })
  const before = await figure.boundingBox()

  await expect(image).toHaveAttribute('width', '1200')
  await expect(image).toHaveAttribute('height', '630')
  await expect(figure.locator('source[type="image/avif"]')).toHaveAttribute(
    'srcset',
    /cover-480\.avif 480w, .*cover-960\.avif 960w/,
  )
  await expect(figure.locator('source[type="image/webp"]')).toHaveAttribute(
    'srcset',
    /cover-480\.webp 480w, .*cover-960\.webp 960w/,
  )
  await expect(figure.getByText('P0 验收封面')).toBeVisible()

  releaseImage()
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0)
  const after = await figure.boundingBox()

  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  expect(Math.abs(after!.width - before!.width)).toBeLessThan(0.1)
  expect(Math.abs(after!.height - before!.height)).toBeLessThan(0.1)
})
