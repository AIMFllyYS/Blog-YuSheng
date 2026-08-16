import { expect, test, type Page } from '@playwright/test'

const articlePath = '/blog/p0-kitchen-sink/'

const paragraphAcrossStrong = {
  blockId: 'block-paragraph-b9a4cffa8f0fcabe',
  startOffset: 4,
  endOffset: 16,
  exact: '只包含合法内容的黄金文章',
} as const

const heading2Full = {
  blockId: 'markdown-与-gfm',
  startOffset: 0,
  endOffset: 14,
} as const

const crossParagraph = {
  fromBlockId: 'block-paragraph-b9a4cffa8f0fcabe',
  toBlockId: 'block-paragraph-5e0a552dd14f4050',
} as const

async function waitForReader(page: Page) {
  await expect(async () => {
    const response = await page.goto(articlePath)
    expect(response?.ok() ?? false).toBe(true)
    await expect(page.locator('[data-reader-boot-veil]')).toHaveCount(0, { timeout: 3_000 })
    await expect(page.locator('[data-reader-article]')).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 30_000 })
}

async function selectTextRange(
  page: Page,
  blockId: string,
  startOffset: number,
  endOffset: number,
) {
  await page.evaluate(
    ({ blockId, startOffset, endOffset }: { blockId: string; startOffset: number; endOffset: number }) => {
      const block = document.querySelector(`[data-block-id="${blockId}"]`)
      if (!block) throw new Error(`块 ${blockId} 不存在`)
      const texts: Text[] = []
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node as Text
        const chrome = text.parentElement?.closest(
          'button, figcaption, [aria-hidden="true"]',
        )
        if (!chrome) texts.push(text)
      }
      const locate = (target: number) => {
        let seen = 0
        for (const text of texts) {
          if (target <= seen + text.data.length) {
            return { node: text, offset: target - seen }
          }
          seen += text.data.length
        }
        const last = texts.at(-1)
        if (!last) throw new Error('块内没有文本节点')
        return { node: last, offset: last.data.length }
      }
      const selection = document.getSelection()
      const range = document.createRange()
      range.setStart(locate(startOffset).node, locate(startOffset).offset)
      range.setEnd(locate(endOffset).node, locate(endOffset).offset)
      selection?.removeAllRanges()
      selection?.addRange(range)
    },
    { blockId, startOffset, endOffset },
  )
}

async function selectCrossBlocks(page: Page, fromBlockId: string, toBlockId: string) {
  await page.evaluate(
    ({ fromBlockId, toBlockId }: { fromBlockId: string; toBlockId: string }) => {
      const lastText = (blockId: string) => {
        const block = document.querySelector(`[data-block-id="${blockId}"]`)
        if (!block) throw new Error(`块 ${blockId} 不存在`)
        const texts: Text[] = []
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          texts.push(node as Text)
        }
        return texts
      }
      const from = lastText(fromBlockId).at(-1)!
      const to = lastText(toBlockId)[0]!
      const selection = document.getSelection()
      selection?.removeAllRanges()
      selection?.setBaseAndExtent(from, from.data.length, to, 0)
    },
    { fromBlockId, toBlockId },
  )
}

async function revealToolbar(page: Page) {
  await page.evaluate(() => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await expect(page.locator('[data-sel-bar]')).toHaveClass(/is-on/)
}

test('划词后只出现复制和注释，没有询问或评论', async ({ page }) => {
  await waitForReader(page)
  await expect(page.getByText('划词后，注释会出现在这里')).toBeVisible()
  await selectTextRange(
    page,
    paragraphAcrossStrong.blockId,
    paragraphAcrossStrong.startOffset,
    paragraphAcrossStrong.endOffset,
  )
  await revealToolbar(page)

  const toolbar = page.getByRole('toolbar', { name: '划词操作' })
  await expect(toolbar).toBeVisible()
  await expect(toolbar.getByRole('button', { name: '复制' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: '注释' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: '询问' })).toHaveCount(0)
  await expect(toolbar.getByRole('button', { name: '评论' })).toHaveCount(0)
})

test('复制选区后落下「已复制」通知', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await waitForReader(page)
  await selectTextRange(
    page,
    paragraphAcrossStrong.blockId,
    paragraphAcrossStrong.startOffset,
    paragraphAcrossStrong.endOffset,
  )
  await revealToolbar(page)
  await page.getByRole('toolbar', { name: '划词操作' }).getByRole('button', { name: '复制' }).click()
  await expect(page.locator('[data-toast-layer]')).toContainText('已复制')
  await expect(page.getByRole('status').filter({ hasText: '已复制' })).toHaveCount(1)
})

test('注释把选区带到右栏并聚焦输入框', async ({ page }) => {
  await waitForReader(page)
  await selectTextRange(
    page,
    paragraphAcrossStrong.blockId,
    paragraphAcrossStrong.startOffset,
    paragraphAcrossStrong.endOffset,
  )
  await revealToolbar(page)
  await page.getByRole('toolbar', { name: '划词操作' }).getByRole('button', { name: '注释' }).click()

  const workspace = page.locator('[data-reader-workspace]')
  await expect(workspace.getByRole('tab', { name: '注释', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('[data-quote-chip]')).toContainText(paragraphAcrossStrong.exact)
  await expect(page.locator('[data-annotation-composer]')).toBeFocused()
})

test('跨段落选区点注释会提示不可跨块', async ({ page }) => {
  await waitForReader(page)
  await selectCrossBlocks(page, crossParagraph.fromBlockId, crossParagraph.toBlockId)
  await revealToolbar(page)
  await page.getByRole('toolbar', { name: '划词操作' }).getByRole('button', { name: '注释' }).click()
  await expect(page.locator('[data-toast-layer]')).toContainText('不可跨段落/块注释')
})

test('中栏顶部选区的工具条按钮能点到', async ({ page }) => {
  await waitForReader(page)
  const heading = page.locator(`[data-block-id="${heading2Full.blockId}"]`)
  await heading.scrollIntoViewIfNeeded()
  await selectTextRange(page, heading2Full.blockId, heading2Full.startOffset, heading2Full.endOffset)
  await revealToolbar(page)

  const annotate = page.getByRole('toolbar', { name: '划词操作' }).getByRole('button', { name: '注释' })
  await expect(annotate).toBeVisible()
  const box = await annotate.boundingBox()
  expect(box).not.toBeNull()
  const hit = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y)
    return Boolean(target?.closest('[data-sel-bar]'))
  }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 })
  expect(hit).toBe(true)
  await annotate.click()
  await expect(page.locator('[data-quote-chip]')).toContainText('Markdown 与 GFM')
  await expect(page.locator('[data-annotation-composer]')).toBeFocused()
})
