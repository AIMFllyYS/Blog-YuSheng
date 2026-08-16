import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'

import { revealSelectionToolbar, selectTextRange } from './helpers/select-text-range'

const articlePath = '/blog/p0-kitchen-sink/'
const draftSource = '跨刷新仍在的改稿草稿'
const paragraphAcrossStrong = {
  blockId: 'block-paragraph-b9a4cffa8f0fcabe',
  startOffset: 4,
  endOffset: 16,
} as const

async function waitForReader(page: Page) {
  await expect(async () => {
    const response = await page.goto(articlePath)
    expect(response?.ok() ?? false).toBe(true)
    await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
      timeout: 3_000,
    })
    await expect(page.locator('[data-annotation-panel]')).toBeVisible({
      timeout: 8_000,
    })
  }).toPass({ timeout: 30_000 })
}

async function clearLocalDrafts(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem('blog-yusheng:local-author-mode:v1')
    for (const key of [...Object.keys(window.localStorage)]) {
      if (key.startsWith('blog-yusheng:local-drafts:v1:')) {
        window.localStorage.removeItem(key)
      }
    }
  })
}

async function enableLocalAuthorMode(page: Page) {
  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  await page.getByRole('button', { exact: true, name: '设置' }).click()
  const panel = page.getByRole('dialog', { name: '显示与声音设置' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('导出的 .md 才是持久产物')
  const toggle = panel.getByRole('button', { name: /本地作者模式/ })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
}

async function writeDraft(page: Page) {
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
  await composer.fill(draftSource)
  await page.getByRole('button', { name: '发布' }).click()
  await expect(page.locator('[data-toast-layer]')).toContainText('注释写下')
  await expect(
    page.locator('[data-annotation-thread]').filter({ hasText: draftSource }),
  ).toBeVisible()
}

test('local author drafts survive reload and export into the review appendix', async ({
  page,
}) => {
  await waitForReader(page)
  await clearLocalDrafts(page)
  await page.reload()
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  await expect(page.locator('[data-annotation-panel]')).toBeVisible({
    timeout: 8_000,
  })
  await expect(
    page.locator('[data-annotation-thread]').filter({
      hasText: '这里同时验证中文与协议正文',
    }),
  ).toBeVisible({ timeout: 8_000 })

  await enableLocalAuthorMode(page)
  await writeDraft(page)

  await page.reload()
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  await expect(
    page.locator('[data-annotation-thread]').filter({ hasText: draftSource }),
  ).toBeVisible({ timeout: 8_000 })

  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  await page.getByRole('button', { name: '导出' }).click()
  const dialog = page.getByRole('dialog', { name: '导出' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '正文+注释' }).evaluate((button) => {
    if (button instanceof HTMLButtonElement) button.click()
  })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: '开始导出' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('p0-kitchen-sink.review.md')
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const content = await readFile(downloadPath!, 'utf8')
  expect(content).toContain('<!-- blog-review-appendix:v1 -->')
  expect(content).toContain(draftSource)
})
