import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'

async function openExportMenu(page: import('@playwright/test').Page) {
  await page.goto(articlePath)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  await page.getByRole('button', { name: '导出' }).click()
  await expect(page.getByRole('dialog', { name: '导出' })).toBeVisible()
}

test('exports markdown and txt from the reader menu without printing', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.print = () => {
      Object.assign(window, { __printCalled: true })
    }
  })
  await openExportMenu(page)

  const dialog = page.getByRole('dialog', { name: '导出' })
  await expect(dialog).toContainText('随后续版本开放')
  await expect(dialog).toContainText('未开放')
  await expect(dialog.getByRole('button', { name: /DOCX/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /PDF/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /正文\+注释/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /正文\+评论/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^全部/ })).toBeVisible()

  const [markdown] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: '开始导出' }).click(),
  ])
  expect(markdown.suggestedFilename()).toBe('p0-kitchen-sink.md')
  await expect(page.getByRole('status').filter({ hasText: '已导出 Markdown' })).toHaveCount(
    1,
  )

  await dialog.getByRole('button', { name: /^TXT$/ }).click()
  await page.waitForTimeout(1_050)
  const [text] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: '开始导出' }).click(),
  ])
  expect(text.suggestedFilename()).toBe('p0-kitchen-sink.txt')

  await dialog.getByRole('button', { name: /DOCX/ }).click()
  await expect(dialog).toContainText('DOCX 导出随后续版本开放')
  await dialog.getByRole('button', { name: /正文\+注释/ }).click()
  await expect(dialog).toContainText('该内容范围随后续版本开放')

  const printed = await page.evaluate(
    () => (window as unknown as { __printCalled?: boolean }).__printCalled,
  )
  expect(printed).toBeFalsy()
})
