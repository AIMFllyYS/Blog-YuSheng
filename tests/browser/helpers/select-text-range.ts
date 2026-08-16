import { expect, type Page } from '@playwright/test'

export async function selectTextRange(
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

export async function revealSelectionToolbar(page: Page) {
  await page.evaluate(() => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await expect(page.locator('[data-sel-bar]')).toHaveClass(/is-on/)
}
