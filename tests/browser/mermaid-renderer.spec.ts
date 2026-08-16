import { expect, test } from '@playwright/test'

const FIXTURE_URL = '/_dev/mermaid-renderer/'
const SANDBOX_PATH = '/embeds/_runtime/mermaid/renderer.html'

test('Mermaid loads only in view and isolates unsafe or failed nodes', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))

  await page.goto(FIXTURE_URL)
  const documentDiagrams = page.locator(
    '[data-mermaid-document-fixture] [data-mermaid-state="waiting"]',
  )
  await expect(documentDiagrams).toHaveCount(2)
  expect(requested.some((url) => new URL(url).pathname === SANDBOX_PATH)).toBe(false)
  await expect(page.locator('[data-document-fallback="DOC-SECURITY-005"]')).toHaveCount(2)

  await documentDiagrams.first().scrollIntoViewIfNeeded()
  await expect(page.locator('img[data-mermaid-renderer="browser"]')).toBeVisible({
    timeout: 12_000,
  })
  await expect(page.locator('img[data-mermaid-renderer="browser"]')).toHaveAttribute(
    'src',
    /^blob:/,
  )
  expect(requested.some((url) => new URL(url).pathname === SANDBOX_PATH)).toBe(true)
  await expect(page.locator('[data-document-fallback="DOC-RENDER-003"]')).toBeVisible()
  await expect(page.getByText('恶意与超限节点后仍可阅读。')).toBeVisible()
  await context.close()

  const plainContext = await browser.newContext()
  const plainPage = await plainContext.newPage()
  const plainRequests: string[] = []
  plainPage.on('request', (request) => plainRequests.push(request.url()))
  await plainPage.goto('/_dev/code-renderer/')
  expect(plainRequests.some((url) => new URL(url).pathname === SANDBOX_PATH)).toBe(false)
  expect(await pageScriptsContainMermaidRuntime(plainPage)).toBe(false)
  await plainContext.close()
})

test('Mermaid Blob URLs are revoked on replacement and unmount', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const revoked: string[] = []
  await page.exposeFunction('recordMermaidRevoke', (url: string) => {
    revoked.push(url)
  })
  await page.addInitScript(() => {
    const original = URL.revokeObjectURL.bind(URL)
    URL.revokeObjectURL = (url: string): void => {
      void (window as unknown as {
        recordMermaidRevoke(value: string): Promise<void>
      }).recordMermaidRevoke(url)
      original(url)
    }
  })
  await page.goto(FIXTURE_URL)
  const harness = page.locator('[data-mermaid-revoke-harness]')
  await harness.scrollIntoViewIfNeeded()
  const image = harness.locator('img[data-mermaid-renderer="browser"]')
  await expect(image).toBeVisible({ timeout: 12_000 })
  const firstUrl = await image.getAttribute('src')
  expect(firstUrl).toMatch(/^blob:/)

  await harness.getByRole('button', { name: '替换图表' }).click()
  await expect(image).toBeVisible({ timeout: 12_000 })
  await expect.poll(() => image.getAttribute('src')).not.toBe(firstUrl)
  await expect.poll(() => revoked).toContain(firstUrl)
  const secondUrl = await image.getAttribute('src')

  await harness.getByRole('button', { name: '卸载图表' }).click()
  await expect(harness.getByText('图表已卸载。')).toBeVisible()
  await expect.poll(() => revoked).toContain(secondUrl)
  await context.close()
})

test('Mermaid timeout destroys the isolated renderer and remains terminal', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.route(`**${SANDBOX_PATH}`, async (route) => {
    await route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<script>
        parent.postMessage({type:'blog-yusheng:mermaid-ready'}, '*');
        addEventListener('message', () => { /* intentionally never completes */ });
      </script>`,
    })
  })

  await page.goto(FIXTURE_URL)
  await page
    .locator('[data-mermaid-document-fixture] [data-mermaid-state="waiting"]')
    .first()
    .scrollIntoViewIfNeeded()
  const runtimeFallback = page.locator(
    '[data-document-fallback="DOC-RENDER-003"]',
  ).filter({ hasText: 'flowchart LR' })
  await expect(runtimeFallback).toBeVisible({ timeout: 4_000 })
  await page.waitForTimeout(1_000)
  await expect(runtimeFallback).toBeVisible()
  await expect(page.locator('img[data-mermaid-renderer="browser"]')).toHaveCount(0)
  await context.close()
})

async function pageScriptsContainMermaidRuntime(
  page: import('@playwright/test').Page,
): Promise<boolean> {
  const scripts = await page.locator('script[src]').evaluateAll((elements) =>
    elements.map((element) => (element as HTMLScriptElement).src),
  )
  for (const url of scripts) {
    const response = await page.request.get(url)
    const source = await response.text()
    if (source.includes('mermaid version') || source.includes('suppressErrorRendering')) {
      return true
    }
  }
  return false
}
