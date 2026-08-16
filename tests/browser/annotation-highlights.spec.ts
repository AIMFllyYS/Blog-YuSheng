import { expect, test, type Page } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'
const golden = '只包含合法内容的黄金文章'

async function waitForReader(page: Page) {
  await expect(async () => {
    const response = await page.goto(articlePath)
    expect(response?.ok() ?? false).toBe(true)
    await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, { timeout: 3_000 })
    await expect(page.locator('[data-reader-article]')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('[data-annotation-highlights="ready"]')).toBeVisible({
      timeout: 8_000,
    })
  }).toPass({ timeout: 30_000 })
}

test('同一选区只画一个高亮且角标为 2，失锚不画 mark', async ({ page }) => {
  await waitForReader(page)
  const marks = page.locator('mark.anno')
  await expect(marks).toHaveCount(1)
  await expect(marks).toHaveAttribute('data-count', '2')
  await expect(marks).toContainText(golden)
  await expect(page.locator('mark.anno[data-anno*="ghost-block"]')).toHaveCount(0)
  await expect(page.getByText('原文位置已变化')).toBeVisible()
  await expect(page.locator('[data-anchor-state="orphaned"]')).toContainText('失锚')
})

test('点击高亮切到注释页签并闪动对应卡片', async ({ page }) => {
  await waitForReader(page)
  const mark = page.locator('mark.anno')
  const locusId = await mark.getAttribute('data-anno')
  expect(locusId).toBeTruthy()
  await mark.click()
  const workspace = page.locator('[data-reader-workspace]')
  await expect(workspace.getByRole('tab', { name: '注释', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const cards = page.locator(`[data-annotation-thread][data-anno="${locusId}"]`)
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toHaveClass(/flash/)
})

test('点击卡片 data-jump 让正文高亮闪动', async ({ page }) => {
  await waitForReader(page)
  await page.locator('[data-jump]').first().click()
  await expect(page.locator('mark.anno')).toHaveClass(/flash/)
})
