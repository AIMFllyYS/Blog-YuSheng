import { expect, test, type Page } from '@playwright/test'

const LATEST = '2026-09-14'
const FLIP_LAYER = '[data-calendar-layer="flip"]'

async function waitForIndex(page: Page) {
  await expect(page.locator('[data-daily-index]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '小日报', level: 1 })).toBeVisible()
  await expect(page.locator('[data-daily-view]')).not.toHaveAttribute('data-daily-view', 'pending')
}

test('桌面目录显示报亭台历，头版是最新一期，可翻月与抽出整周', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/daily/')
  await waitForIndex(page)

  const calendar = page.locator('[data-catalog-calendar] [data-calendar-month]')
  await expect(calendar).toBeVisible()
  await expect(page.locator('[data-brief-hero]')).toBeVisible()
  await expect(page.locator('[data-brief-hero]').getByRole('link', { name: /展开阅读/ })).toHaveAttribute(
    'href',
    `/daily/${LATEST}/`,
  )
  await expect(calendar).toHaveAttribute('data-calendar-month', '2026-09')
  await expect(page).toHaveURL(/#2026-09$/)

  const flip = calendar.locator(FLIP_LAYER)
  const latestCard = flip.locator(`[data-day-cell="${LATEST}"]`)
  await expect(latestCard).toBeVisible()
  await expect(latestCard).toHaveAttribute('href', `/daily/${LATEST}/`)

  // 周轨抽出：该行 lifted，其余 dim；Esc 折回
  await flip.locator('[data-week-row="2026-W38"]').getByRole('button').click()
  await expect(flip.locator('[data-week-row="2026-W38"]')).toHaveAttribute('data-week-state', 'lifted')
  await expect(flip.locator('[data-week-row="2026-W37"]')).toHaveAttribute('data-week-state', 'dim')
  await page.keyboard.press('Escape')
  await expect(flip.locator('[data-week-row="2026-W38"]')).toHaveAttribute('data-week-state', 'rest')

  // 索引页签翻到八月
  await calendar.locator('[data-month-tab="2026-08"]').click()
  await expect(calendar.locator(FLIP_LAYER)).toHaveAttribute('data-flip-state', 'rest', {
    timeout: 5_000,
  })
  await expect(calendar).toHaveAttribute('data-calendar-month', '2026-08', { timeout: 5_000 })
  await expect(page).toHaveURL(/#2026-08$/)
  await expect(calendar.locator(`${FLIP_LAYER} [data-brief-date="2026-08-17"]`)).toBeVisible()

  // 箭头翻回九月
  await calendar.locator(FLIP_LAYER).getByRole('button', { name: '更近一月' }).click()
  await expect(calendar.locator(FLIP_LAYER)).toHaveAttribute('data-flip-state', 'rest', {
    timeout: 5_000,
  })
  await expect(calendar).toHaveAttribute('data-calendar-month', '2026-09', { timeout: 5_000 })
})

test('点台历某一天进入对应日报', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/daily/')
  await waitForIndex(page)

  const calendar = page.locator('[data-catalog-calendar] [data-calendar-month]')
  await calendar.locator('[data-month-tab="2026-08"]').click()
  await expect(calendar.locator(FLIP_LAYER)).toHaveAttribute('data-flip-state', 'rest', {
    timeout: 5_000,
  })
  await calendar.locator(`${FLIP_LAYER} [data-brief-date="2026-08-17"]`).click()
  await expect(page).toHaveURL(/\/daily\/2026-08-17\/$/, { timeout: 15_000 })
  await expect(page.locator('[data-brief-reader="2026-08-17"]')).toBeVisible()
})

test('从台历进入阅读台：沙箱 iframe、前后日与原件外链', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/daily/')
  await waitForIndex(page)
  await page.locator(`${FLIP_LAYER} [data-day-cell="${LATEST}"]`).click()

  await expect(page).toHaveURL(new RegExp(`/daily/${LATEST}/$`), { timeout: 15_000 })
  await expect(page.locator(`[data-brief-reader="${LATEST}"]`)).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveTitle(/折晓早报 2026-09-14/)

  const iframe = page.locator('[data-brief-frame] iframe')
  await expect(iframe).toHaveAttribute('src', `/briefs/${LATEST}.html`)
  await expect(iframe).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-popups allow-popups-to-escape-sandbox',
  )
  await expect(page.locator('[data-brief-frame]')).toHaveAttribute('data-state', 'ready', {
    timeout: 10_000,
  })
  await expect(page.locator('[data-brief-fallback]')).toHaveCount(0)

  const original = page.locator('[data-brief-original]')
  await expect(original).toHaveAttribute('href', `/briefs/${LATEST}.html`)
  await expect(original).toHaveAttribute('target', '_blank')

  // 最新一期没有「后一日」，「前一日」跳到 09-13
  await expect(page.locator('[data-brief-neighbour="next"]')).toHaveCount(0)
  await page.locator('[data-brief-neighbour="prev"]').click()
  await expect(page).toHaveURL(/\/daily\/2026-09-13\/$/, { timeout: 15_000 })
  await expect(page.locator('[data-brief-neighbour="next"]')).toHaveAttribute('href', `/daily/${LATEST}/`)
})

test('窄屏目录降级为月周日清单且不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 })
  await page.goto('/daily/')
  await waitForIndex(page)

  await expect(page.locator('[data-brief-list]')).toBeVisible()
  await expect(page.locator('[data-catalog-calendar]')).toHaveCount(0)
  await expect(page.getByText('立体台历需桌面端访问')).toBeVisible()

  const latest = page.locator(`[data-brief-list] [data-day-cell="${LATEST}"]`)
  await expect(latest).toBeVisible()
  await expect(latest).toHaveAttribute('href', `/daily/${LATEST}/`)

  const geometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
})
