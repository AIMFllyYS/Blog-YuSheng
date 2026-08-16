import { expect, test } from '@playwright/test'

test('KaTeX is server-rendered, scoped, and fails per node', async ({ browser }) => {
  const plainPage = await browser.newPage()
  await plainPage.goto('/_dev/code-renderer/')
  await expect(katexStylesheet(plainPage)).toHaveCount(0)
  await plainPage.close()

  const page = await browser.newPage()
  await page.goto('/_dev/katex-renderer/')
  await expect(katexStylesheet(page)).toHaveCount(1)

  const formulas = page.locator('[data-katex-renderer="server"]')
  await expect(formulas).toHaveCount(2)
  await expect(formulas.first()).toHaveAttribute('data-selectable', 'none')
  await expect(formulas.first().locator('.katex')).toBeVisible()
  await expect
    .poll(() =>
      katexStylesheet(page).evaluate((element) => {
        const sheet = (element as HTMLLinkElement).sheet
        return sheet
          ? Array.from(sheet.cssRules).some((rule) =>
              rule.cssText.includes('.katex'),
            )
          : false
      }),
    )
    .toBe(true)
  await expect(page.locator('.katex-display')).toBeVisible()
  const formulaFallback = page.locator(
    'p [data-document-fallback="DOC-RENDER-003"]',
  )
  await expect(formulaFallback).toBeVisible()
  await expect(formulaFallback).toHaveAttribute('role', 'status')
  await expect(formulaFallback).toHaveAttribute('data-selectable', 'none')
  await expect(page.locator('[data-document-fallback="DOC-SECURITY-005"]')).toBeVisible()
  await expect(page.getByText('非法公式后仍可阅读。')).toBeVisible()
  await expect(page.getByText('宏策略后仍可阅读。')).toBeVisible()
  await expect(articlePageLoadsKatexRuntime(page)).resolves.toBe(false)
  await page.close()

  const discussionPage = await browser.newPage()
  await discussionPage.goto('/_dev/katex-discussion/')
  const discussionFormula = discussionPage.locator(
    '[data-katex-renderer="browser"]',
  )
  await expect(discussionFormula).toHaveCount(2)
  await expect(discussionFormula.first()).toHaveAttribute(
    'data-selectable',
    'none',
  )
  await expect(
    discussionPage.locator(
      'div[data-katex-renderer="browser"][data-block-id][data-selectable="none"]',
    ),
  ).toBeVisible()
  await expect(
    discussionPage.locator(
      'aside[data-document-fallback="DOC-RENDER-003"][data-selectable="none"]',
    ),
  ).toBeVisible()
  await expect(katexStylesheet(discussionPage)).toHaveCount(1)
  const runtimeUrl = await findKatexRuntimeScript(discussionPage)
  expect(runtimeUrl).toBeDefined()
  await discussionPage.close()

  const failedRuntimePage = await browser.newPage()
  let releaseRuntime: (() => void) | undefined
  await failedRuntimePage.route('**/*', async (route) => {
    if (
      runtimeUrl &&
      new URL(route.request().url()).pathname === new URL(runtimeUrl).pathname
    ) {
      await new Promise<void>((resolve) => {
        releaseRuntime = resolve
      })
      await route.continue()
      return
    }
    await route.continue()
  })
  await failedRuntimePage.goto('/_dev/katex-discussion/', {
    waitUntil: 'commit',
  })
  await expect(
    failedRuntimePage.locator(
      'div[aria-busy="true"][data-block-id][data-selectable="none"]',
    ),
  ).toHaveCount(2)
  await expect.poll(() => releaseRuntime !== undefined).toBe(true)
  await expect(
    failedRuntimePage.locator(
      'aside[data-document-fallback="DOC-RENDER-003"][data-selectable="none"]',
    ),
  ).toHaveCount(2)
  await expect(
    failedRuntimePage.locator(
      'p span[data-document-fallback="DOC-RENDER-003"][data-selectable="none"]',
    ),
  ).toHaveCount(1)
  releaseRuntime?.()
  await failedRuntimePage.waitForTimeout(1_000)
  await expect(
    failedRuntimePage.locator(
      'aside[data-document-fallback="DOC-RENDER-003"][data-selectable="none"]',
    ),
  ).toHaveCount(2)
  await expect(
    failedRuntimePage.locator('[data-katex-renderer="browser"]'),
  ).toHaveCount(0)
  await failedRuntimePage.close()
})

function katexStylesheet(page: import('@playwright/test').Page) {
  return page.locator(
    'link[rel="stylesheet"][href="/vendor/katex/katex.min.css"]',
  )
}

async function articlePageLoadsKatexRuntime(
  page: import('@playwright/test').Page,
): Promise<boolean> {
  const scriptUrls = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter(
        (entry): entry is PerformanceResourceTiming =>
          entry instanceof PerformanceResourceTiming &&
          entry.initiatorType === 'script',
      )
      .map((entry) => entry.name),
  )
  for (const url of scriptUrls) {
    const response = await page.request.get(url)
    const source = await response.text()
    if (
      source.includes('KaTeX parse error') ||
      source.includes('renderToString') ||
      source.includes('defineFunction')
    ) {
      return true
    }
  }
  return false
}

async function findKatexRuntimeScript(
  page: import('@playwright/test').Page,
): Promise<string | undefined> {
  const scriptUrls = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter(
        (entry): entry is PerformanceResourceTiming =>
          entry instanceof PerformanceResourceTiming &&
          entry.initiatorType === 'script',
      )
      .map((entry) => entry.name),
  )
  for (const url of scriptUrls) {
    const response = await page.request.get(url)
    const source = await response.text()
    if (source.includes('KaTeX parse error')) {
      return url
    }
  }
  return undefined
}
