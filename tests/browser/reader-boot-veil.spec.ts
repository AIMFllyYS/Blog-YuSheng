import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'
const authoritativePagePath =
  'M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1192881 72.8807119,57 71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1192881 72.8807119,33 71.5,33 Z'

test('书册遮罩严格保留六页、四段翻页动画与主题令牌', async ({ page }, testInfo) => {
  await page.goto(articlePath, { waitUntil: 'domcontentloaded' })

  const veil = page.locator('[data-reader-boot-veil]')
  const loader = page.locator('[data-reader-book-loader]')
  const pages = loader.locator('li')
  await expect(veil).toBeVisible()
  await expect(pages).toHaveCount(6)
  expect(await pages.locator('path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')))).toEqual(
    Array.from({ length: 6 }, () => authoritativePagePath),
  )
  const animationNames = await pages.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).animationName),
  )
  expect(animationNames[0]).toBe('none')
  expect(animationNames[1]).toMatch(/page-2$/)
  expect(animationNames[2]).toMatch(/page-3$/)
  expect(animationNames[3]).toMatch(/page-4$/)
  expect(animationNames[4]).toMatch(/page-5$/)
  expect(animationNames[5]).toBe('none')
  await page.screenshot({ path: testInfo.outputPath('reader-boot-veil.png') })

  for (const [accent, ink, paper, muted] of [
    ['#a9762f', '#2b2620', '#f6eddb', '#6e6257'],
    ['#2f7d95', '#26353b', '#eef5f7', '#5c6d74'],
    ['#3a6ea5', '#20242a', '#ffffff', '#5e6670'],
    ['#d9a94a', '#ece7df', '#27231f', '#b9aea1'],
  ] as const) {
    const tokenProjection = await loader.evaluate(
      (element, tokens) => {
        const root = document.documentElement
        root.style.setProperty('--accent', tokens.accent)
        root.style.setProperty('--ink', tokens.ink)
        root.style.setProperty('--scroll-paper', tokens.paper)
        root.style.setProperty('--ink-muted', tokens.muted)
        const style = getComputedStyle(element)
        return {
          background: style.getPropertyValue('--background').trim(),
          page: style.getPropertyValue('--page').trim(),
          pageFold: style.getPropertyValue('--page-fold').trim(),
          shadow: style.getPropertyValue('--shadow').trim(),
          text: style.getPropertyValue('--text').trim(),
          zIndex: getComputedStyle(element.closest('[data-reader-boot-veil]')!)
            .zIndex,
        }
      },
      { accent, ink, muted, paper },
    )
    expect(tokenProjection.background).toContain(accent)
    expect(tokenProjection.background).toContain('58%')
    expect(tokenProjection.shadow).toContain('28%')
    expect(tokenProjection.page).toContain('36%')
    expect(tokenProjection.pageFold).toContain('52%')
    expect(tokenProjection.text).toBe(muted)
    expect(tokenProjection.zIndex).toBe('60')
  }

  await expect(page.locator('[data-reader-boot-stamp]')).toHaveAttribute(
    'data-stamp-mode',
    'pretext',
  )
  await expect(veil).toHaveCount(0, { timeout: 3_000 })
  await expect(page.locator('body')).not.toHaveClass(/reader-is-booting/)
})

test('主题或抽屉状态改变不会重播已移除的进页遮罩', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 })
  await page.goto(articlePath)
  const veil = page.locator('[data-reader-boot-veil]')
  await expect(veil).toHaveCount(0, { timeout: 3_000 })

  await page.evaluate(() => {
    document.documentElement.style.setProperty('--accent', '#2f7d95')
  })
  await page.getByRole('button', { name: '打开文章目录' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-reader-column="left"]')).toHaveCSS(
    'transform',
    'none',
  )
  await expect(veil).toHaveCount(0)
})

test('无 Intl.Segmenter 时使用纯 Canvas 印章后正常揭页', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Intl, 'Segmenter', {
      configurable: true,
      value: undefined,
    })
  })
  await page.goto('/blog/', { waitUntil: 'domcontentloaded' })

  const stamp = page.locator('[data-reader-boot-stamp]')
  await expect(stamp).toHaveAttribute('data-stamp-mode', 'fallback')
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
  await expect(page.getByRole('heading', { name: '博客' })).toBeVisible()
})

test('reduced motion 禁用翻页动画并近乎立即移除遮罩', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(articlePath, { waitUntil: 'domcontentloaded' })

  const veil = page.locator('[data-reader-boot-veil]')
  const dismissalStartedAt = Date.now()
  if ((await veil.count()) > 0) {
    const names = await veil.locator('li').evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).animationName),
    )
    expect(names).toEqual(['none', 'none', 'none', 'none', 'none', 'none'])
  }
  await expect(veil).toHaveCount(0, { timeout: 700 })
  expect(Date.now() - dismissalStartedAt).toBeLessThan(700)
})
