import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'

test('阅读页首屏、双层滚动与阻尼页尾遵守原型契约', async ({ page }, testInfo) => {
  await page.goto(articlePath)
  await expect(page.locator('body')).toHaveAttribute('data-reader-hydrated', 'true')

  const shell = page.locator('[data-reader-shell]')
  const center = page.locator('[data-reader-center]')
  const footer = page.locator('[data-reader-footer]')
  await expect(shell).toBeVisible()
  await expect(center).toBeVisible()
  await expect(center.locator('article')).toHaveCount(1)
  const articleGeometry = await page.locator('[data-reader-article]').evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      width: element.getBoundingClientRect().width,
      maxWidth: style.maxWidth,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      viewportHeight: window.innerHeight,
    }
  })
  const centerWidth = await center.evaluate((element) => element.getBoundingClientRect().width)
  expect(articleGeometry.width).toBe(Math.min(704, centerWidth))
  expect(articleGeometry.maxWidth).toBe('704px')
  expect(articleGeometry.paddingTop).toBe('104px')
  expect(Number.parseFloat(articleGeometry.paddingBottom)).toBeCloseTo(articleGeometry.viewportHeight * 0.08, 0)

  const firstViewport = await footer.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    viewport: window.innerHeight,
    windowScroll: window.scrollY,
  }))
  expect(firstViewport.windowScroll).toBe(0)
  expect(firstViewport.top).toBeGreaterThanOrEqual(firstViewport.viewport - 1)

  await center.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('reader-is-article-end'))).toBe(true)

  await center.hover()
  await page.mouse.wheel(0, 900)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('reader-in-footer'))).toBe(true)
  await expect
    .poll(() => footer.evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--reveal'))))
    .toBeGreaterThan(0.62)
  await expect(page.locator('[data-reader-floating-controls]')).toHaveCSS('pointer-events', 'none')

  await page.screenshot({ path: testInfo.outputPath('reader-footer.png') })
})

test('分栏可拖动、键盘调整并双击恢复默认宽度', async ({ page }) => {
  await page.goto(articlePath)
  await expect(page.locator('body')).toHaveAttribute('data-reader-hydrated', 'true')
  const shell = page.locator('[data-reader-shell]')
  const divider = page.locator('[data-reader-divider="left"]')

  const initialWidth = await shell.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--w-left').trim(),
  )
  expect(initialWidth).toBe('248px')

  await divider.focus()
  await divider.press('ArrowRight')
  await expect(divider).toHaveAttribute('aria-valuenow', '260')
  await expect.poll(() => shell.evaluate((element) => element.style.getPropertyValue('--w-left'))).toBe('260px')

  await divider.dblclick({ position: { x: 3, y: 120 } })
  await expect(divider).toHaveAttribute('aria-valuenow', '248')
  await expect.poll(() => shell.evaluate((element) => element.style.getPropertyValue('--w-left'))).toBe('')

  const box = await divider.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 180)
  await page.mouse.down()
  await page.mouse.move(300, box!.y + 180, { steps: 4 })
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('reader-is-dragging'))).toBe(true)
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('reader-is-dragging'))).toBe(false)
})

test('1025px 桌面边界在初始与键盘调整后都优先保障正文 520px', async ({ page }) => {
  await page.setViewportSize({ width: 1025, height: 800 })
  await page.goto(articlePath)
  await expect(page.locator('body')).toHaveAttribute('data-reader-hydrated', 'true')

  const shell = page.locator('[data-reader-shell]')
  const center = page.locator('[data-reader-center]')
  const leftDivider = page.locator('[data-reader-divider="left"]')
  await expect.poll(() => center.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(520)
  await expect.poll(() => shell.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)

  await leftDivider.focus()
  await leftDivider.press('End')
  await expect.poll(() => center.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(520)
  await expect.poll(() => shell.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await expect(leftDivider).not.toHaveAttribute('aria-valuenow', '400')
})

test('reduced motion 让页尾 reveal 直接到终态', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(articlePath)
  await expect(page.locator('body')).toHaveAttribute('data-reader-hydrated', 'true')

  const footer = page.locator('[data-reader-footer]')
  await expect
    .poll(() => footer.evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--reveal'))))
    .toBe(1)
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('reader-in-footer'))).toBe(false)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('reader-in-footer'))).toBe(true)
})

test('窄屏将左右栏降级为带遮罩的抽屉', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 })
  await page.goto(articlePath)
  await expect(page.locator('body')).toHaveAttribute('data-reader-hydrated', 'true')

  const left = page.locator('[data-reader-column="left"]')
  const right = page.locator('[data-reader-column="right"]')
  const center = page.locator('[data-reader-center]')
  const overlay = page.locator('[data-reader-drawer-overlay]')

  await expect(left).toHaveCSS('position', 'fixed')
  await expect(left).toHaveAttribute('aria-hidden', 'true')
  await expect(right).toHaveAttribute('aria-hidden', 'true')
  await page.getByRole('button', { name: '打开文章目录' }).focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => left.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  await expect(left).toBeFocused()
  await expect.poll(() => left.evaluate((element) => (element as HTMLElement).inert)).toBe(false)
  await expect.poll(() => center.evaluate((element) => (element as HTMLElement).inert)).toBe(true)
  await expect.poll(() => right.evaluate((element) => (element as HTMLElement).inert)).toBe(true)
  await expect(overlay).toHaveCSS('pointer-events', 'auto')
  await page.keyboard.press('Tab')
  await expect(overlay).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(left).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '打开文章目录' })).toBeFocused()
  await expect.poll(() => center.evaluate((element) => (element as HTMLElement).inert)).toBe(false)
  await expect.poll(() => left.evaluate((element) => (element as HTMLElement).inert)).toBe(true)
  await expect(overlay).toHaveAttribute('tabindex', '-1')
  await expect(overlay).toHaveAttribute('aria-hidden', 'true')

  await page.getByRole('button', { name: '打开阅读工作区' }).focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => right.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  await expect(right).toBeFocused()
  await expect(overlay).toHaveCSS('pointer-events', 'auto')
  await overlay.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '打开阅读工作区' })).toBeFocused()
})
