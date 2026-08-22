import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('local HTML uses the locked sandbox gate and unlisted web stays a preview', async ({
  page,
}) => {
  const fixture = await readFile(
    path.join(
      process.cwd(),
      'content/posts/p0-kitchen-sink/embeds/mini-card/index.html',
    ),
    'utf8',
  )
  let localRequests = 0
  await page.route('**/embeds/p0-kitchen-sink/mini-card/index.html', (route) => {
    localRequests += 1
    return route.fulfill({
      body: fixture,
      contentType: 'text/html; charset=utf-8',
      status: 200,
    })
  })
  await page.goto('/blog/p0-kitchen-sink/')

  const local = page.locator('[data-html-embed]')
  await expect(local).toHaveAttribute('data-html-embed', 'waiting')
  await page.waitForTimeout(4_500)
  expect(localRequests).toBe(0)
  await expect(page.locator('[data-html-embed="fallback"]')).toHaveCount(0)
  await local.scrollIntoViewIfNeeded()
  await expect(local).toHaveAttribute('data-html-embed', 'sandbox')
  const iframe = local.locator('iframe')
  await expect(iframe).toBeVisible()
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  await expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer')
  await expect(iframe).toHaveAttribute('allow', '')
  await expect(iframe).toHaveAttribute('loading', 'lazy')
  await expect(iframe).toHaveAttribute('title', '文章包内 HTML 小页')
  await expect(iframe).toHaveAttribute(
    'src',
    /\/embeds\/p0-kitchen-sink\/mini-card\/index\.html#nonce=[a-f0-9]{48}$/,
  )
  await expect(local).toHaveAttribute('data-embed-ready', 'true')
  await expect(local).toHaveAttribute('data-message-rejections', '1')
  await expect(iframe.contentFrame().getByText('HTML Embed 已隔离')).toBeVisible()
  expect(localRequests).toBe(1)

  const webFallback = page.locator('[data-web-embed="fallback"]')
  await expect(webFallback).toContainText('未进入白名单的网页')
  await expect(webFallback).toContainText('unlisted.invalid')
  await expect(webFallback).toContainText(
    '该 URL 不在 allowlist，P0 必须显示降级卡片而不是 iframe。',
  )
  await expect(webFallback.locator('iframe')).toHaveCount(0)
  await expect(webFallback.getByRole('link', { name: '打开链接' })).toHaveAttribute(
    'href',
    'https://unlisted.invalid/embed',
  )
})

test('an allowed web iframe that never loads becomes a terminal preview after four seconds', async ({
  page,
}) => {
  let releaseRequest: (() => void) | undefined
  const heldRequest = new Promise<void>((resolve) => {
    releaseRequest = resolve
  })
  await page.route('https://timeout.invalid/**', async (route) => {
    await heldRequest
    await route.abort()
  })
  await page.goto('/_dev/embed-renderer/', { waitUntil: 'domcontentloaded' })
  const pending = page.locator('[data-web-embed="pending"]')
  await expect(pending).toBeVisible()
  const pendingAt = Date.now()
  const fallback = page.locator('[data-web-embed="fallback"]')
  await expect(fallback).toBeVisible({ timeout: 12_000 })
  const elapsed = Date.now() - pendingAt
  expect(elapsed).toBeGreaterThanOrEqual(3_500)
  expect(elapsed).toBeLessThan(7_000)
  await expect(fallback).toContainText('超时网页')
  await expect(fallback).toContainText('远端网页加载超时后的安全说明。')
  await expect(page.locator('[data-web-embed="loaded"]')).toHaveCount(0)
  releaseRequest?.()
  await page.waitForTimeout(300)
  await expect(fallback).toBeVisible()
})

test('a local HTML resource failure restores the author fallback and removes the iframe', async ({
  page,
}) => {
  await page.route('**/embeds/p0-kitchen-sink/mini-card/index.html', (route) =>
    route.abort(),
  )
  await page.goto('/blog/p0-kitchen-sink/')
  const embed = page.locator('[data-html-embed]')
  await embed.scrollIntoViewIfNeeded()
  await expect(page.locator('[data-html-embed="fallback"]')).toContainText(
    '无法加载交互小页时，显示这段安全降级说明。',
    { timeout: 12_000 },
  )
  await expect(page.locator('[data-html-embed="sandbox"]')).toHaveCount(0)
  await expect(page.locator('iframe[title="文章包内 HTML 小页"]')).toHaveCount(0)
})

test('a loaded local HTML page without an authenticated ready message times out near four seconds', async ({
  page,
}) => {
  await page.route('**/embeds/p0-kitchen-sink/mini-card/index.html', (route) =>
    route.fulfill({
      body: '<!doctype html><title>no ready message</title>',
      contentType: 'text/html; charset=utf-8',
      status: 200,
    }),
  )
  await page.goto('/blog/p0-kitchen-sink/')
  const embed = page.locator('[data-html-embed]')
  await embed.scrollIntoViewIfNeeded()
  await expect(page.locator('[data-html-embed="sandbox"]')).toBeVisible()
  const sandboxAt = Date.now()
  const fallback = page.locator('[data-html-embed="fallback"]')
  await expect(fallback).toContainText(
    '无法加载交互小页时，显示这段安全降级说明。',
    { timeout: 12_000 },
  )
  const elapsed = Date.now() - sandboxAt
  expect(elapsed).toBeGreaterThanOrEqual(3_500)
  expect(elapsed).toBeLessThan(7_000)
  await expect(page.locator('[data-html-embed="sandbox"]')).toHaveCount(0)
  await expect(page.locator('iframe[title="文章包内 HTML 小页"]')).toHaveCount(0)
})

test('offscreen web embed does not request or time out before entering the viewport', async ({
  page,
}) => {
  let requests = 0
  await page.route('https://below.invalid/**', (route) => {
    requests += 1
    return route.fulfill({
      body: '<!doctype html><title>loaded</title>',
      contentType: 'text/html',
      status: 200,
    })
  })
  await page.goto('/_dev/embed-renderer/', { waitUntil: 'domcontentloaded' })
  const fixture = page.locator('[data-embed-fixture="below-viewport"]')
  await expect(fixture.locator('[data-web-embed="waiting"]')).toBeAttached()
  await page.waitForTimeout(4_500)
  expect(requests).toBe(0)
  await expect(fixture.locator('[data-web-embed="fallback"]')).toHaveCount(0)
  await fixture.scrollIntoViewIfNeeded()
  await expect(fixture.locator('[data-web-embed="loaded"]')).toBeVisible()
  expect(requests).toBe(1)
})
