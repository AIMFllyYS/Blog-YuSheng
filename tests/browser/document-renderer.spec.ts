import { expect, test } from '@playwright/test'

test('DocumentRenderer 在真实浏览器隔离未知标签与 renderer 崩溃', async ({ page }) => {
  await page.route('**/blog/document-renderer-fixture/media/missing.png', (route) => route.abort())
  await page.goto('/_dev/document-renderer/')

  await expect(page.getByRole('heading', { name: 'DocumentRenderer 验收页' })).toBeVisible()
  await expect(page.locator('[data-document-fallback="DOC-REGISTRY-001"]')).toBeVisible()
  await expect(page.getByText('未知标签后的内容仍然可见。')).toBeVisible()
  const missingScreenRenderer = page.locator('[data-document-fallback="DOC-RENDER-002"]')
  await expect(missingScreenRenderer).toBeVisible()
  await expect(missingScreenRenderer).toContainText('组件的 Markdown 替代内容。')
  const pendingImage = page.getByAltText('丢失图片')
  if (await pendingImage.count()) {
    await pendingImage.evaluate((image) => image.scrollIntoView())
  }
  const missingAsset = page
    .locator('[data-document-fallback="DOC-ASSET-004"]')
    .filter({ hasText: '丢失图片' })
  await expect(missingAsset).toBeVisible()
  await expect(missingAsset).toContainText('丢失图片')

  const crashFallback = page.locator('[data-document-fallback="DOC-RENDER-001"]')
  await expect(crashFallback).toBeVisible()
  await expect(crashFallback).toContainText('fixture-crash-node')
  await expect(crashFallback).toContainText('用于验证节点级错误隔离的预期异常')
  await expect(page.getByText('崩溃节点前的内容。')).toBeVisible()
  await expect(page.getByText('崩溃节点后的内容仍然正常显示。')).toBeVisible()

  const blockedWeb = page.locator('[data-document-fallback="DOC-SECURITY-006"]')
  await expect(blockedWeb).toBeVisible()
  await expect(blockedWeb).toContainText('未获准网页的安全替代内容。')
  await expect(blockedWeb).toHaveAttribute('data-node-id', 'blocked-web')

  const ordered = await page.locator('[data-document-renderer="canonical"] > *').evaluateAll(
    (elements) => elements.map((element) => element.textContent ?? ''),
  )
  expect(ordered.findIndex((text) => text.includes('未知标签前的内容仍然可见。')))
    .toBeLessThan(ordered.findIndex((text) => text.includes('DOC-REGISTRY-001')))
  expect(ordered.findIndex((text) => text.includes('DOC-REGISTRY-001')))
    .toBeLessThan(ordered.findIndex((text) => text.includes('未知标签后的内容仍然可见。')))

  const recovery = page.getByRole('region', { name: '图片恢复 fixture' })
  const recoveryFallback = recovery.locator(
    '[data-document-fallback="DOC-ASSET-004"]',
  )
  await expect(recoveryFallback).toBeVisible()
  await expect(recoveryFallback).toHaveAttribute(
    'data-block-id',
    'block-image-recovery-fixture',
  )
  await expect(recoveryFallback).toHaveAttribute('data-selectable', 'none')
  await recovery.getByRole('button', { name: '切换有效图片' }).click()
  await expect(recoveryFallback).toHaveCount(0)
  const recoveredImage = recovery.getByAltText('恢复图片')
  await expect(recoveredImage).toBeVisible()
  const recoveredFigure = recovery.locator(
    'figure[data-block-id="block-image-recovery-fixture"]',
  )
  await expect(recoveredFigure).toHaveAttribute('data-selectable', 'none')
  await expect.poll(() => recoveredImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
})
