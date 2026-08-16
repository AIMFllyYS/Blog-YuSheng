import { expect, test } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'

async function waitForWorkspace(page: import('@playwright/test').Page) {
  await page.goto(articlePath)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, { timeout: 3_000 })
  await expect(page.locator('[data-reader-workspace]')).toBeVisible()
}

test('三页签使用目标同构骨架、记忆选择且 Agent 外壳不发请求', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.removeItem('reader-workspace:expanded')
    const originalFetch = window.fetch.bind(window)
    Object.defineProperty(window, '__workspaceFetches', { value: 0, writable: true })
    window.fetch = (...args) => {
      const scope = window as typeof window & { __workspaceFetches: number }
      scope.__workspaceFetches += 1
      return originalFetch(...args)
    }
  })
  await waitForWorkspace(page)

  const workspace = page.locator('[data-reader-workspace]')
  await expect(workspace.getByRole('tab', { name: '注释', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(workspace.getByText('划词后，注释会出现在这里')).toBeVisible()
  const annotationTab = workspace.getByRole('tab', { name: '注释', exact: true })
  await annotationTab.focus()
  await page.keyboard.press('ArrowRight')
  const agentTab = workspace.getByRole('tab', { name: 'Agent', exact: true })
  await page.keyboard.press('ArrowRight')
  await expect(agentTab).toBeFocused()
  await expect(agentTab).toHaveAttribute('aria-selected', 'true')
  await expect(agentTab).toHaveAttribute('tabindex', '0')
  await expect(annotationTab).toHaveAttribute('tabindex', '-1')
  await expect(workspace.getByText('本轮上下文')).toBeVisible({ timeout: 1_000 })
  await page.keyboard.press('ArrowLeft')
  await expect(annotationTab).toBeFocused()
  await expect(workspace.getByText('划词后，注释会出现在这里')).toBeVisible({ timeout: 1_000 })
  await page.evaluate(() => {
    const annotation = document.querySelector<HTMLButtonElement>('[data-workspace-tab="annotations"]')
    const comments = document.querySelector<HTMLButtonElement>('[data-workspace-tab="comments"]')
    annotation?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
    comments?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    comments?.click()
  })
  await expect(agentTab).toBeFocused()
  await expect(agentTab).toHaveAttribute('aria-selected', 'true')
  await expect(workspace.getByText('本轮上下文')).toBeVisible({ timeout: 1_000 })
  await page.keyboard.press('ArrowLeft')
  await expect(workspace.getByText('划词后，注释会出现在这里')).toBeVisible({ timeout: 1_000 })

  const tabSwitchStartedAt = Date.now()
  await workspace.getByRole('tab', { name: '评论 0', exact: true }).click()
  const skeleton = workspace.locator('[data-workspace-skeleton]')
  await expect(skeleton).toBeVisible()
  await expect(workspace).toHaveAttribute('aria-busy', 'true')
  await expect(skeleton).toHaveAttribute('data-skeleton-pane', 'comments')
  await expect(workspace.getByText('评论功能即将开放')).toBeVisible({ timeout: 1_000 })
  await expect(workspace).toHaveAttribute('aria-busy', 'false')
  const tabSwitchElapsed = Date.now() - tabSwitchStartedAt
  expect(tabSwitchElapsed).toBeGreaterThanOrEqual(350)
  expect(tabSwitchElapsed).toBeLessThan(750)
  await expect(workspace.getByPlaceholder('写下评论')).toHaveCount(0)

  await workspace.getByRole('tab', { name: 'Agent', exact: true }).click()
  await expect(skeleton).toHaveAttribute('data-skeleton-pane', 'agent')
  await expect(workspace.getByText('本轮上下文')).toBeVisible({ timeout: 1_000 })
  await expect(workspace.getByText(/文章《P0 中文综合验收文章》/)).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('reader-workspace-agent.png') })
  await workspace.getByRole('button', { name: '解释这一段' }).click()
  await expect(workspace.getByLabel('向电子分身提问')).toHaveValue('解释这一段')
  const agentInput = workspace.getByLabel('向电子分身提问')
  await agentInput.fill('测试')
  await page.keyboard.press('Shift+Enter')
  await expect(agentInput).toHaveValue('测试\n')
  const focusedBorderColor = await agentInput.evaluate((element) =>
    getComputedStyle(element.parentElement!).borderColor,
  )
  const accentColor = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--accent)'
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  })
  expect(focusedBorderColor).toBe(accentColor)
  await page.keyboard.press('Enter')
  await expect(workspace.getByText(/示意模式未发送/)).toBeVisible()
  await expect(agentInput).toHaveValue('测试\n')
  expect(
    await page.evaluate(() => (window as typeof window & { __workspaceFetches: number }).__workspaceFetches),
  ).toBe(0)

  await page.reload()
  await expect(page.locator('[data-reader-workspace]').getByRole('tab', { name: 'Agent' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('桌面收展释放栏宽、忽略动画连点，并持久化悬浮笔动效', async ({ page }) => {
  await waitForWorkspace(page)
  const center = page.locator('[data-reader-center]')
  const right = page.locator('[data-reader-column="right"]')
  const beforeWidth = await center.evaluate((element) => element.getBoundingClientRect().width)

  await page.getByRole('button', { name: '收起工作区' }).click()
  await expect(page.locator('[data-workspace-skeleton]')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('reader:workspace-toggle')))
  await page.waitForTimeout(500)
  await expect(page.locator('[data-workspace-skeleton]')).toBeVisible()
  await page.waitForTimeout(400)
  await expect(page.locator('body')).toHaveClass(/reader-right-collapsed/)
  await expect.poll(() => right.evaluate((element) => element.getBoundingClientRect().width)).toBe(0)
  expect(await center.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(
    beforeWidth + 250,
  )

  const pen = page.locator('[data-reader-workspace-pen]')
  await expect(pen).toBeVisible()
  await expect(pen).toBeFocused()
  const penBox = await pen.boundingBox()
  expect(penBox).not.toBeNull()
  expect(page.viewportSize()!.width - penBox!.x - penBox!.width).toBeLessThan(35)
  await page.keyboard.press('Shift+F10')
  const menu = page.locator('[data-reader-pen-menu]')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitemradio', { name: '运动' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitemradio', { name: '静止' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(pen).toBeFocused()
  await pen.click({ button: 'right' })
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitemradio', { name: '静止' }).click()
  await expect(menu).toHaveCount(0)
  await expect(page.locator('[data-reader-pen-icon]')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('[data-reader-pen-number] path')).toHaveCSS('stroke-dashoffset', '0px')

  await page.reload()
  await expect(page.locator('[data-reader-workspace-pen]')).toBeVisible()
  await expect(page.locator('[data-reader-pen-icon]')).toHaveCSS('animation-name', 'none')
  await page.locator('[data-reader-workspace-pen]').click()
  await expect(page.locator('[data-workspace-skeleton]')).toBeVisible()
  await page.waitForTimeout(900)
  await expect(page.locator('body')).not.toHaveClass(/reader-right-collapsed/)
  await expect(right).toBeVisible()
  await expect(page.locator('[data-reader-workspace] [role="tab"][aria-selected="true"]')).toBeFocused()
})

test('移动端裸笔打开右抽屉并复用遮罩、焦点与缓出骨架', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 })
  await waitForWorkspace(page)
  const pen = page.locator('[data-reader-workspace-pen]')
  const right = page.locator('[data-reader-column="right"]')
  const overlay = page.locator('[data-reader-drawer-overlay]')
  await expect(pen).toBeVisible()
  await pen.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-workspace-skeleton]')).toBeVisible()
  await expect.poll(() => right.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  await expect(right).toBeFocused()
  await expect(overlay).toHaveCSS('pointer-events', 'auto')
  await page.waitForTimeout(900)
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(page.locator('body')).not.toHaveClass(/reader-drawer-right/)
  await expect(right).not.toHaveAttribute('aria-hidden', 'true')
  await page.setViewportSize({ width: 820, height: 900 })
  await expect(page.locator('body')).not.toHaveClass(/reader-drawer-right/)
  await expect(pen).toHaveAttribute('aria-expanded', 'false')
  await pen.click()
  await page.waitForTimeout(900)
  await right.getByRole('button', { name: '收起工作区' }).click()
  await expect(page.locator('[data-workspace-skeleton]')).toBeVisible()
  await page.waitForTimeout(900)
  await expect(right).toHaveAttribute('aria-hidden', 'true')
  await expect(pen).toBeFocused()
})

test('reduced motion 让悬浮笔从静止终态开始', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('reader-workspace:expanded', '0')
    localStorage.setItem('reader-workspace:pen-motion', '1')
  })
  await page.goto(articlePath)
  await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, { timeout: 3_000 })
  await expect(page.locator('[data-reader-workspace-pen]')).toBeVisible()
  await expect(page.locator('[data-reader-pen-icon]')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('[data-reader-pen-number] path')).toHaveCSS('stroke-dashoffset', '0px')
})
