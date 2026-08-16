import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'
const headingId = 'markdown-与-gfm'

async function waitForVeilGone(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
}

test('深链滚到双栏正文标题且窗口不滚动', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${articlePath}#${headingId}`, { waitUntil: 'domcontentloaded' })
  await waitForVeilGone(page)

  await expect.poll(async () =>
    page.evaluate((id) => {
      const heading = document.getElementById(id)
      const center = document.querySelector('[data-reader-center]')
      if (!heading || !center || center.scrollTop <= 0) return Number.POSITIVE_INFINITY
      return Math.abs(
        heading.getBoundingClientRect().top - center.getBoundingClientRect().top - 84,
      )
    }, headingId),
  ).toBeLessThan(6)

  const settled = await page.evaluate(() => ({
    windowY: window.scrollY,
    centerTop: document.querySelector('[data-reader-center]')?.scrollTop ?? -1,
  }))
  expect(settled.centerTop).toBeGreaterThan(0)
  expect(settled.windowY).toBe(0)
})

test('不存在的锚点不抛错也不滚动', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${articlePath}#不存在的锚点`, { waitUntil: 'domcontentloaded' })
  await waitForVeilGone(page)
  await expect(page.locator('[data-reader-article]')).toBeVisible()
  await expect
    .poll(() => page.locator('[data-reader-center]').evaluate((element) => element.scrollTop))
    .toBe(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('hashchange 复用同一套定位', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(articlePath, { waitUntil: 'domcontentloaded' })
  await waitForVeilGone(page)
  await page.evaluate((id) => {
    window.location.hash = id
  }, headingId)
  await expect.poll(async () =>
    page.evaluate((id) => {
      const heading = document.getElementById(id)
      const center = document.querySelector('[data-reader-center]')
      if (!heading || !center) return Number.POSITIVE_INFINITY
      return heading.getBoundingClientRect().top - center.getBoundingClientRect().top
    }, headingId),
  ).toBeGreaterThan(70)
  const offset = await page.evaluate((id) => {
    const heading = document.getElementById(id)
    const center = document.querySelector('[data-reader-center]')
    if (!heading || !center) return Number.POSITIVE_INFINITY
    return heading.getBoundingClientRect().top - center.getBoundingClientRect().top
  }, headingId)
  expect(Math.abs(offset - 84)).toBeLessThan(6)
})
