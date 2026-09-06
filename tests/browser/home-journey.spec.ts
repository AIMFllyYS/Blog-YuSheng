import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

test.beforeEach(async ({ page }) => {
  // Verify supported system-font fallback deterministically; do not depend on
  // external font-CDN timing to decide whether WebGL/interactions are correct.
  await page.route('https://fontsapi.zeoseven.com/**', (route) => route.abort())
})

async function ready(page: Page, progress: number) {
  await page.goto(`/?qa=1&progress=${progress}`)
  await expect(page.locator('[data-testid="home-journey"]')).toHaveAttribute('data-journey-ready', 'true')
  await expect(page.locator('canvas')).toHaveAttribute('data-journey-frameloop', 'demand')
  await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.journeyRenderCount) > 0)
}

test('star discovery is keyboard accessible and leaves the main navigation available', async ({ page }) => {
  await ready(page, 0)
  const star = page.getByRole('button', { name: '发现星签：北辰' })
  await star.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-easter-card]')).toContainText('北辰')
  await expect(page.locator('[data-star-echo]')).toHaveCount(1)
  await expect(star).toHaveAttribute('data-found', 'true')
  await page.getByRole('button', { name: '收起星签' }).click()
  await expect(page.locator('[data-easter-card]')).toHaveCount(0)
  await page.getByRole('button', { name: '跳过 ⤍ 直接入门' }).click()
  await expect(page.locator('[data-testid="home-shell"]')).toBeVisible()
  const blog = page.locator('[data-home-destination="blog"]')
  await blog.click({ trial: true })
  await expect(blog).toHaveAttribute('href', '/blog/')
})

test('all book details have semantic controls and star hit targets disappear during the book scene', async ({ page }) => {
  await ready(page, 0.62)
  await expect(page.locator('[data-easter-egg]')).toHaveCount(0)
  for (const detail of ['seal', 'binding', 'pages']) {
    await page.locator(`[data-inspect-book="${detail}"]`).click()
    await expect(page.locator('[data-book-insight]')).toBeVisible()
    await expect(page.locator(`[data-inspect-book="${detail}"]`)).toHaveAttribute('aria-pressed', 'true')
  }
  await page.getByRole('button', { name: '关闭书中细节' }).click()
  await expect(page.locator('[data-book-insight]')).toHaveCount(0)
})

test('chapter controls seek forward and backward without remounting the scene', async ({ page }) => {
  await ready(page, 0)
  await page.getByRole('button', { name: '第3章：开卷有光' }).click()
  await expect(page.locator('[data-testid="home-journey"]')).toHaveAttribute('data-journey-scene', 'open')
  await expect(page.locator('[data-inspect-book="pages"]')).toBeVisible()
  await page.getByRole('button', { name: '第1章：文字入星' }).click()
  await expect(page.locator('[data-testid="home-journey"]')).toHaveAttribute('data-journey-scene', 'scatter-end')
  await expect(page.locator('[data-easter-egg]')).toHaveCount(4)
  await expect(page.locator('[data-testid="home-journey"]')).toHaveAttribute('data-journey-duration', '10.0000')
})

test('QA frame remains deterministic on reload', async ({ page }) => {
  await ready(page, 0.47)
  const first = await page.locator('canvas').screenshot()
  await page.reload()
  await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.journeyRenderCount) > 0)
  const second = await page.locator('canvas').screenshot()
  expect(second.equals(first)).toBe(true)
})

test('mobile and reduced-motion visitors do not download the cinematic runtime', async ({ browser }) => {
  for (const mode of ['mobile', 'reduced'] as const) {
    const context = await browser.newContext({ viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' })
    const page = await context.newPage()
    const resources: string[] = []
    page.on('request', (request) => resources.push(request.url()))
    await page.goto('/')
    await expect(page.locator(`[data-journey-mode="${mode}"]`).first()).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(resources.some((url) => /desktop-journey|three_core|react-three/i.test(url))).toBe(false)
    await context.close()
  }
})

test('unsupported WebGL falls back to usable reading entrances', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = new Proxy(original, {
      apply(target, receiver, args) {
        if (String(args[0]).startsWith('webgl')) return null
        return Reflect.apply(target, receiver, args)
      },
    })
  })
  await page.goto('/')
  await expect(page.locator('[data-testid="home-journey"]')).toHaveAttribute('data-journey-mode', 'reduced')
  await expect(page.locator('[data-home-destination="blog"]')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('live rendering idles after skip and resumes on reverse scroll', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas')
  await expect(canvas).toHaveAttribute('data-journey-frameloop', 'always')
  await canvas.evaluate((element) => { element.dataset.journeyObserveRender = 'true' })
  await page.getByRole('button', { name: '跳过 ⤍ 直接入门' }).click()
  await expect(canvas).toHaveAttribute('data-journey-frameloop', 'demand')
  await page.waitForTimeout(400)
  const before = Number(await canvas.getAttribute('data-journey-render-count'))
  await page.waitForTimeout(400)
  expect(Number(await canvas.getAttribute('data-journey-render-count')) - before).toBeLessThanOrEqual(1)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(canvas).toHaveAttribute('data-journey-frameloop', 'always')
})

test('live chapter selection stays at the chosen gate pose after snapping settles', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-testid="home-journey"]')).toHaveAttribute('data-journey-ready', 'true')
  await page.getByRole('button', { name: '第4章：众妙之门' }).click()
  await page.waitForTimeout(2200)
  await expect(page.locator('[data-testid="home-journey"]')).toHaveAttribute('data-journey-scene', 'gate')
  const progress = Number(await page.locator('[data-testid="home-journey"]').getAttribute('data-journey-progress'))
  expect(Math.abs(progress - 0.875)).toBeLessThan(0.005)
})

test('short desktop epilogue keeps discovery stars below link cards', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 800 }, { width: 980, height: 700 }]) {
    await page.setViewportSize(viewport)
    await ready(page, 1)
    const slot = await page.locator('[data-home-star-slot]').boundingBox()
    const cards = await page.locator('[data-home-destination]').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().bottom))
    expect(slot?.y).toBeGreaterThan(Math.max(...cards))
    await page.locator('[data-home-destination="blog"]').click({ trial: true })
  }
})

test('switching or closing a star discovery restores interrupted pulse styles', async ({ page }) => {
  await ready(page, 0)
  const first = page.getByRole('button', { name: '发现星签：北辰' })
  const second = page.getByRole('button', { name: '发现星签：墨彗' })
  const readPulse = (element: HTMLElement) => {
    const style = getComputedStyle(element)
    const matrix = style.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform)
    return { scale: matrix.a, filter: style.filter }
  }
  await first.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => first.evaluate(readPulse).then((state) => state.scale)).toBeGreaterThan(1.1)
  await second.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => first.evaluate(readPulse)).toEqual({ scale: 1, filter: 'none' })
  await expect.poll(() => second.evaluate(readPulse).then((state) => state.scale)).toBeGreaterThan(1.1)
  await page.getByRole('button', { name: '收起星签' }).focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => second.evaluate(readPulse)).toEqual({ scale: 1, filter: 'none' })
})
