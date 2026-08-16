import { expect, test, type Page } from '@playwright/test'

import { revealSelectionToolbar, selectTextRange } from './helpers/select-text-range'

const articlePath = '/blog/p0-kitchen-sink/'
const paragraphAcrossStrong = {
  blockId: 'block-paragraph-b9a4cffa8f0fcabe',
  startOffset: 4,
  endOffset: 16,
} as const

async function waitForReader(page: Page) {
  await expect(async () => {
    const response = await page.goto(articlePath)
    expect(response?.ok() ?? false).toBe(true)
    await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, { timeout: 3_000 })
    await expect(page.locator('[data-annotation-panel]')).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 30_000 })
}

test('开发期划词发布出现新卡片并落下「注释写下」', async ({ page }) => {
  await waitForReader(page)
  await selectTextRange(
    page,
    paragraphAcrossStrong.blockId,
    paragraphAcrossStrong.startOffset,
    paragraphAcrossStrong.endOffset,
  )
  await revealSelectionToolbar(page)
  await page.getByRole('toolbar', { name: '划词操作' }).getByRole('button', { name: '注释' }).click()
  const composer = page.locator('[data-annotation-composer]')
  await expect(composer).toBeFocused()
  await composer.fill('浏览器新写下的注释')
  await page.getByRole('button', { name: '发布' }).click()
  await expect(page.locator('[data-toast-layer]')).toContainText('注释写下')
  await expect(page.locator('[data-annotation-thread]').filter({ hasText: '浏览器新写下的注释' })).toBeVisible()
})

test('访客不能写入，作者可删除成员的种子卡片', async ({ page }) => {
  await page.goto('/_dev/auth-port/')
  await page.getByRole('button', { name: '访客' }).click()
  await waitForReader(page)
  await expect(page.locator('[data-annotation-composer]')).toBeDisabled()
  await expect(page.getByRole('button', { name: '发布' })).toBeDisabled()

  await page.goto('/_dev/auth-port/')
  await page.getByRole('button', { name: '作者' }).click()
  await waitForReader(page)
  const memberCard = page.locator('[data-annotation-thread]').filter({
    hasText: '这里同时验证中文与协议正文',
  })
  await expect(memberCard).toBeVisible()
  await memberCard.getByRole('button', { name: '删除' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('将删除这条注释及其全部回复')
  await dialog.getByRole('button', { name: '删除' }).click()
  await expect(memberCard).toHaveCount(0)
})

test('恶意脚本源码被拒绝且不会执行', async ({ page }) => {
  let alerted = false
  page.on('dialog', (dialog) => {
    alerted = true
    void dialog.dismiss()
  })
  await waitForReader(page)
  await selectTextRange(
    page,
    paragraphAcrossStrong.blockId,
    paragraphAcrossStrong.startOffset,
    paragraphAcrossStrong.endOffset,
  )
  await revealSelectionToolbar(page)
  await page.getByRole('toolbar', { name: '划词操作' }).getByRole('button', { name: '注释' }).click()
  await page.locator('[data-annotation-composer]').fill('<script>alert(1)</script>')
  await page.getByRole('button', { name: '发布' }).click()
  await expect(page.locator('[data-annotation-error]')).toBeVisible()
  await expect(page.locator('[data-annotation-error]')).not.toHaveText('')
  expect(alerted).toBe(false)
  await expect(page.locator('[data-annotation-thread]').filter({ hasText: 'alert(1)' })).toHaveCount(0)
})
