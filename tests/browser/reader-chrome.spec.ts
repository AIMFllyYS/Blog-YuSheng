import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'

async function waitForReader(page: import('@playwright/test').Page) {
  await page.goto(articlePath)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
}

test('首页保持常显 absolute 导航，阅读页只由中栏顶部唤出', async ({ page }, testInfo) => {
  await page.goto('/')
  const homeNav = page.locator('[data-rope-navigation]')
  await expect(homeNav).toHaveCSS('position', 'absolute')
  await expect(homeNav).toHaveCSS('opacity', '1')
  const skip = page.getByRole('button', { name: /跳过/ })
  if (await skip.isVisible()) await skip.click()
  const homeSettings = page.locator('[data-rope-hanger="settings"] button')
  await expect(homeSettings).toBeVisible()
  await homeSettings.click()
  const homePanel = page.getByRole('dialog', { name: '显示与声音设置' })
  await expect(homePanel).toBeVisible()
  const [homeTriggerBox, homePanelBox] = await Promise.all([
    homeSettings.evaluate((element) => element.getBoundingClientRect()),
    homePanel.evaluate((element) => element.getBoundingClientRect()),
  ])
  expect(
    Math.abs(
      homeTriggerBox.left + homeTriggerBox.width / 2 -
        (homePanelBox.left + homePanelBox.width / 2),
    ),
  ).toBeLessThan(24)

  await waitForReader(page)
  const readerNav = page.locator('[data-rope-navigation]')
  const center = page.locator('[data-reader-center]')
  const left = page.locator('[data-reader-column="left"]')
  await expect(readerNav).toHaveCSS('position', 'fixed')
  await expect(readerNav).toHaveCSS('pointer-events', 'none')
  await expect(readerNav).toHaveAttribute('data-nav-visible', 'false')

  const leftBox = await left.boundingBox()
  expect(leftBox).not.toBeNull()
  await page.mouse.move(leftBox!.x + 30, 24)
  await expect(readerNav).toHaveAttribute('data-nav-visible', 'false')

  const centerBox = await center.boundingBox()
  expect(centerBox).not.toBeNull()
  await page.mouse.move(centerBox!.x + centerBox!.width / 2, 24)
  await expect(readerNav).toHaveAttribute('data-nav-visible', 'true')
  await expect(readerNav).toHaveCSS('opacity', '1')
  await expect(page.getByRole('button', { name: '分享本文' })).toHaveCSS(
    'pointer-events',
    'auto',
  )
  await center.evaluate((element) => {
    element.scrollTop = 300
    element.dispatchEvent(new Event('scroll'))
  })
  await expect(readerNav).toHaveAttribute('data-nav-visible', 'false')
  await page.mouse.move(centerBox!.x + centerBox!.width / 2, 120)
  await page.mouse.move(centerBox!.x + centerBox!.width / 2, 24)
  await expect(readerNav).toHaveAttribute('data-nav-visible', 'true')
  await page.screenshot({ path: testInfo.outputPath('reader-navigation.png') })
  await expect(
    page.locator('[data-rope-navigation], [data-sel-bar]').getByRole('button', { name: /编辑|询问/ }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: '导出' }).click()
  const exportDialog = page.getByRole('dialog', { name: '导出' })
  await expect(exportDialog).toContainText('开始导出')
  await expect(exportDialog.getByRole('button', { name: 'DOCX' })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await page.keyboard.press('Escape')

  const hitTarget = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y)
    return {
      insideNav: Boolean(target?.closest('[data-rope-navigation]')),
      tag: target?.tagName,
    }
  }, { x: leftBox!.x + 30, y: 70 })
  expect(hitTarget.insideNav).toBe(false)
  expect(hitTarget.tag).toBeTruthy()
})

test('设置对准挂件、切换四主题，分享触发统一下落通知', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await waitForReader(page)
  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)

  const settings = page.getByRole('button', { exact: true, name: '设置' })
  await settings.click()
  const panel = page.getByRole('dialog', { name: '显示与声音设置' })
  await expect(panel).toBeVisible()
  const alignment = await Promise.all([
    settings.evaluate((element) => element.getBoundingClientRect()),
    panel.evaluate((element) => element.getBoundingClientRect()),
  ])
  const triggerCenter = alignment[0].left + alignment[0].width / 2
  const panelCenter = alignment[1].left + alignment[1].width / 2
  expect(Math.abs(triggerCenter - panelCenter)).toBeLessThan(2)

  for (const [label, theme] of [
    ['浅蓝', 'mist'],
    ['米白', 'snow'],
    ['纯黑', 'night'],
    ['宣纸黄', 'paper'],
  ] as const) {
    await panel.getByRole('button', { name: new RegExp(label) }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  }
  await page.keyboard.press('Escape')
  await expect(settings).toBeFocused()

  const share = page.getByRole('button', { name: '分享本文' })
  await share.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: '已复制文章链接' })).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-falling-toast]')).toHaveCount(1)
  await page.waitForTimeout(1_050)
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-falling-toast]')).toHaveCount(2)

  const newest = page.locator('[data-falling-toast]').last()
  const newestId = await newest.getAttribute('data-falling-toast')
  const newestToast = page.locator(`[data-falling-toast="${newestId}"]`)
  await newest.dispatchEvent('mouseover')
  const heldTop = await newest.evaluate((element) => element.getBoundingClientRect().top)
  await page.waitForTimeout(300)
  expect(await newest.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(heldTop, 0)
  await newest.dispatchEvent('click')
  await expect(newest.locator('[data-toast-shard]')).toHaveCount(7)
  await expect(newestToast).toHaveCount(0, { timeout: 1_000 })
})

test('粗指针走 Web Share 并通知已打开系统分享', async ({ page }) => {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = ((query: string) => {
      if (query === '(pointer: coarse)') {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false
          },
        }
      }
      return originalMatchMedia(query)
    }) as typeof window.matchMedia

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as unknown as { __shared?: ShareData }).__shared = data
      },
    })
  })

  await waitForReader(page)
  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  await page.getByRole('button', { name: '分享本文' }).click()
  await expect(page.getByRole('status').filter({ hasText: '已打开系统分享' })).toHaveCount(1)
  const shared = await page.evaluate(() => (window as unknown as { __shared?: ShareData }).__shared)
  expect(shared?.title).toBe('P0 中文综合验收文章')
  expect(shared?.url).toContain('/blog/p0-kitchen-sink/')
})

test('滚动条与 reduced-motion 通知遵守外壳契约', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await waitForReader(page)
  const scrollbarWidths = await page.evaluate(() => ({
    body: getComputedStyle(document.body).scrollbarWidth,
    center: getComputedStyle(document.querySelector('[data-reader-center]')!).scrollbarWidth,
    right: getComputedStyle(document.querySelector('[data-reader-column="right"]')!).scrollbarWidth,
  }))
  expect(scrollbarWidths.body).toBe('none')
  expect(scrollbarWidths.center).toBe('thin')
  expect(scrollbarWidths.right).toBe('none')

  const center = page.locator('[data-reader-center]')
  const box = await center.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, 24)
  await page.getByRole('button', { name: '分享本文' }).click()
  const toast = page.locator('[data-falling-toast]')
  await expect(toast).toHaveCount(1)
  const top = await toast.evaluate((element) => element.getBoundingClientRect().top)
  await page.waitForTimeout(250)
  expect(await toast.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(top, 0)
  await toast.click()
  await expect(toast).toHaveCount(0)
})

test('矮视口设置面板不出屏，320px 阅读挂件互不重叠', async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 300 })
  await waitForReader(page)
  await page.mouse.move(250, 24)
  await page.getByRole('button', { exact: true, name: '设置' }).click()
  const panel = page.getByRole('dialog', { name: '显示与声音设置' })
  const panelBox = await panel.boundingBox()
  expect(panelBox).not.toBeNull()
  expect(panelBox!.y).toBeGreaterThanOrEqual(11)
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(300 - 11)
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 320, height: 568 })
  await page.mouse.move(160, 24)
  const visibleControls = page.locator('[data-rope-navigation] [data-rope-hanger]')
  const boxes = await visibleControls.evaluateAll((elements) =>
    elements
      .filter((element) => getComputedStyle(element).display !== 'none')
      .map((element) => element.getBoundingClientRect())
      .sort((a, b) => a.left - b.left),
  )
  expect(boxes).toHaveLength(5)
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].left).toBeGreaterThanOrEqual(boxes[index - 1].right)
  }
})
