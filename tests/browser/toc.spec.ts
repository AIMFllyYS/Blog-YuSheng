import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'

async function waitForReader(page: import('@playwright/test').Page, path = articlePath) {
  await page.goto(path)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, {
    timeout: 3_000,
  })
}

test('常规目录与图形骨架共享 Canonical outline 并支持键盘跳转', async ({ page }, testInfo) => {
  await waitForReader(page)
  const toc = page.locator('[data-article-toc]')
  await expect(toc).toHaveAttribute('data-toc-mode', 'list')
  const listLinks = toc.locator('[data-toc-list] [data-toc-jump]')
  await expect(listLinks).toHaveCount(8)
  await expect(listLinks.first()).toHaveText('Markdown 与 GFM')

  await listLinks.first().focus()
  await page.keyboard.press('ArrowDown')
  await expect(listLinks.nth(1)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect.poll(() => page.locator('[data-reader-center]').evaluate((element) => element.scrollTop)).toBeGreaterThan(0)

  await page.getByRole('tab', { name: '图形' }).click()
  await expect(toc.locator('[data-toc-skeleton]')).toBeVisible()
  await expect(toc).toHaveAttribute('data-toc-mode', 'graph', { timeout: 1_000 })
  const graphNodes = toc.locator('[data-toc-graph] [data-toc-jump]')
  await expect(graphNodes).toHaveCount(8)
  const counts = await graphNodes.evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute('data-skeleton-bars'))),
  )
  expect(Math.min(...counts)).toBe(2)
  expect(Math.max(...counts)).toBe(8)
  await expect(toc.locator('[data-outline-markers]')).not.toHaveCount(0)
  await graphNodes.first().hover()
  await expect(page.locator('[data-graph-tooltip]')).toHaveText('Markdown 与 GFM')
  await expect(page.locator('[data-graph-viewport]')).toBeVisible()
  await expect(page.locator('[data-reader-column="left"]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const dividerLineOpacity = await page
    .getByRole('separator', { name: '拖动调整目录宽度' })
    .evaluate((element) => getComputedStyle(element, '::after').opacity)
  expect(dividerLineOpacity).toBe('0')

  await page.getByRole('button', { name: '图形图例' }).click()
  await expect(page.getByText('条数 = 篇幅')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('toc-graph.png') })
  await page.getByRole('tab', { name: '目录' }).click()
  await expect(toc).toHaveAttribute('data-toc-mode', 'list', { timeout: 1_000 })
  const legendButton = toc.locator('button[aria-label="图形图例"]')
  await expect(legendButton).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await page.getByRole('tab', { name: '图形' }).click()
  await expect(toc).toHaveAttribute('data-toc-mode', 'graph', { timeout: 1_000 })
  await expect(legendButton).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

async function clickThroughOverlay(locator: import('@playwright/test').Locator) {
  await locator.evaluate((element: HTMLElement) => element.click())
}

test('目录折叠和模式记忆，手动滚动期间暂停自动跟随', async ({ page }) => {
  await page.goto('/_dev/toc/')
  const toc = page.locator('[data-article-toc]')
  const fold = page.getByRole('button', { name: '折叠：可折叠章节' })
  await expect(fold).toBeVisible()
  await fold.evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.getByRole('button', { name: '子节 1', exact: true })).toHaveCount(0)
  const childSlug = await page
    .getByRole('heading', { name: '子节 6', exact: true })
    .getAttribute('id')
  expect(childSlug).not.toBeNull()
  await page.locator('[data-reader-center]').evaluate((element, slug) => {
    const target = document.getElementById(slug)
    if (!target) throw new Error(`没有找到正文标题：${slug}`)
    const centerTop = element.getBoundingClientRect().top
    element.scrollTop += target.getBoundingClientRect().top - centerTop - 84
    element.dispatchEvent(new Event('scroll'))
  }, childSlug!)
  await expect(
    toc.locator('[data-toc-list] [data-toc-slug="可折叠章节"]'),
  ).toHaveAttribute('data-toc-active', 'true')
  await page.reload()
  const expand = page.getByRole('button', { name: '展开：可折叠章节' })
  await expect(expand).toBeVisible()
  await expand.evaluate((button: HTMLButtonElement) => button.click())
  await page.locator('[data-reader-center]').evaluate((element, slug) => {
    const target = document.getElementById(slug)
    if (!target) throw new Error(`没有找到正文标题：${slug}`)
    const centerTop = element.getBoundingClientRect().top
    element.scrollTop += target.getBoundingClientRect().top - centerTop - 84
    element.dispatchEvent(new Event('scroll'))
  }, childSlug!)
  await expect(toc.locator('[data-toc-list] [data-toc-active="true"]')).toHaveCount(1)
  await expect(
    toc.locator(`[data-toc-list] [data-toc-slug="${childSlug}"]`),
  ).toHaveAttribute('data-toc-active', 'true')

  await clickThroughOverlay(page.getByRole('tab', { name: '图形' }))
  await expect(toc).toHaveAttribute('data-toc-mode', 'graph', { timeout: 1_000 })
  const firstGraphNode = toc.locator('[data-toc-graph] [data-toc-jump]').first()
  await firstGraphNode.focus()
  const tooltip = page.locator('[data-graph-tooltip]')
  const tooltipBeforeScroll = await tooltip.boundingBox()
  expect(tooltipBeforeScroll).not.toBeNull()
  const tocBody = page.locator('[data-toc-body]')
  await tocBody.evaluate((element) => {
    element.scrollTop += 80
    element.dispatchEvent(new Event('scroll'))
  })
  await expect
    .poll(async () => (await tooltip.boundingBox())?.y ?? Number.POSITIVE_INFINITY)
    .toBeLessThan(tooltipBeforeScroll!.y - 40)
  const markers = toc.locator('[data-toc-graph] [data-outline-markers]').first().locator('span')
  await expect(markers).toHaveCount(3)
  expect(await markers.evaluateAll((items) => items.map((item) => item.getAttribute('title')))).toEqual([
    '自定义组件',
    '图片',
    '思维导图',
  ])
  const markerColors = await markers.evaluateAll((items) =>
    items.map((item) => getComputedStyle(item).color),
  )
  const expectedColors = await page.evaluate(() => {
    const probe = document.createElement('span')
    document.body.append(probe)
    const colors = ['--accent', '--annotation', '--comment'].map((token) => {
      probe.style.color = `var(${token})`
      return getComputedStyle(probe).color
    })
    probe.remove()
    return colors
  })
  expect(markerColors).toEqual(expectedColors)
  await page.reload()
  await expect(toc).toHaveAttribute('data-toc-mode', 'graph')
  await clickThroughOverlay(page.getByRole('tab', { name: '目录' }))
  await expect(toc).toHaveAttribute('data-toc-mode', 'list', { timeout: 1_000 })

  const manualTop = await tocBody.evaluate((element) => {
    element.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 1_200 }))
    element.scrollTop = 1_200
    return element.scrollTop
  })
  expect(manualTop).toBeGreaterThan(100)
  await page.locator('[data-reader-center]').evaluate((element) => {
    element.scrollTop = 0
    element.dispatchEvent(new Event('scroll'))
  })
  await page.waitForTimeout(300)
  expect(await tocBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(manualTop - 30)
  await page.waitForTimeout(2_700)
  await page.locator('[data-reader-center]').evaluate((element) => {
    element.scrollTop = 1
    element.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => tocBody.evaluate((element) => element.scrollTop)).toBeLessThan(manualTop - 100)
})

test('从页尾跳转先返回三栏顶部，移动端目录球打开真实目录抽屉', async ({ page }) => {
  await waitForReader(page)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.getByRole('button', { name: '结束', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect.poll(() => page.locator('[data-reader-center]').evaluate((element) => element.scrollTop)).toBeGreaterThan(0)

  await page.setViewportSize({ width: 820, height: 900 })
  await page.getByRole('button', { name: '打开文章目录' }).focus()
  await page.keyboard.press('Enter')
  const left = page.locator('[data-reader-column="left"]')
  await expect.poll(() => left.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  await expect(left.locator('[data-article-toc]')).toBeVisible()
  await left.getByRole('button', { name: 'Markdown 与 GFM', exact: true }).click()
  await expect(left).toHaveAttribute('aria-hidden', 'true')
})
