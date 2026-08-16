import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const DATA_URL = /\/blog\/p0-kitchen-sink\/data\/function-plot\.json$/

test('function plot lazy-loads in view and remains interactive', async ({ page }) => {
  const data = await readFile(
    path.join(
      process.cwd(),
      'content',
      'posts',
      'p0-kitchen-sink',
      'data',
      'function-plot.json',
    ),
  )
  let requests = 0
  await page.route(DATA_URL, async (route) => {
    requests += 1
    await route.fulfill({ body: data, contentType: 'application/json' })
  })
  await page.goto('/blog/p0-kitchen-sink/', { waitUntil: 'domcontentloaded' })
  expect(requests).toBe(0)

  const card = page.locator('[data-node-id="function-plot"]')
  await card.scrollIntoViewIfNeeded()
  const canvas = card.getByRole('img', { name: '可交互函数图像' })
  await expect(canvas).toHaveAttribute('data-canvas-drawn', 'true')
  await expect(card.getByText('交互', { exact: true })).toBeVisible()
  expect(requests).toBe(1)

  const before = await canvasChecksum(canvas)
  const zoom = card.getByRole('slider', { name: '缩放函数图像' })
  await zoom.fill('2')
  await expect(zoom).toHaveValue('2')
  await expect.poll(() => canvasChecksum(canvas)).not.toBe(before)
})

test('invalid function data falls back only the canvas node', async ({ page }) => {
  await page.route(DATA_URL, (route) =>
    route.fulfill({
      body: JSON.stringify({
        expression: 'alert(1)',
        domain: [0, 1],
        range: [0, 1],
        samples: 20,
      }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/blog/p0-kitchen-sink/', { waitUntil: 'domcontentloaded' })
  const card = page.locator('[data-node-id="function-plot"]')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveAttribute('data-document-fallback', 'DOC-RENDER-001')
  await expect(page.getByRole('heading', { name: '轻量问答' })).toBeVisible()
})

async function canvasChecksum(locator: import('@playwright/test').Locator) {
  return locator.evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const bytes = canvas
      .getContext('2d')!
      .getImageData(0, 0, canvas.width, canvas.height).data
    let sum = 0
    for (let index = 0; index < bytes.length; index += 97) {
      sum = (sum + bytes[index]!) % 1_000_000_007
    }
    return sum
  })
}
