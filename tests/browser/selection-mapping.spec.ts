import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { selectTextRange } from './helpers/select-text-range'

const FIXTURE_URL = '/_dev/selection-mapping/'
const MATRIX_PATH = path.join(
  process.cwd(),
  'src/features/annotations/anchors/__fixtures__/selection-matrix.json',
)

type MatrixRow = {
  readonly id: string
  readonly expectation: 'ok' | 'rejected'
  readonly how: 'text-range' | 'atomic-node' | 'cross-blocks' | 'block-contents'
  readonly blockId?: string
  readonly fromBlockId?: string
  readonly toBlockId?: string
  readonly startOffset?: number
  readonly endOffset?: number
  readonly exact?: string
  readonly reason?: string
}

async function readMapping(
  page: Page,
  previousRevision: number,
): Promise<Record<string, unknown>> {
  const locator = page.locator('[data-selection-mapping-result]')
  await expect
    .poll(async () => Number(await locator.getAttribute('data-selection-revision')))
    .toBeGreaterThan(previousRevision)
  return JSON.parse((await locator.textContent()) ?? '')
}


async function selectAtomicNode(page: Page, blockId: string) {
  await page.evaluate((blockId) => {
    const block = document.querySelector(`[data-block-id="${blockId}"]`)
    if (!block) throw new Error(`块 ${blockId} 不存在`)
    const target = (block as HTMLElement).matches('[data-selectable="none"]')
      ? block
      : block.querySelector('[data-selectable="none"]')
    if (!target) throw new Error(`块 ${blockId} 内没有 none-selectable 元素`)
    const selection = document.getSelection()
    const range = document.createRange()
    range.selectNodeContents(target)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, blockId)
}

async function selectCrossBlocks(
  page: Page,
  fromBlockId: string,
  toBlockId: string,
) {
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

async function selectBlockContents(page: Page, blockId: string) {
  await page.evaluate((blockId) => {
    const block = document.querySelector(`[data-block-id="${blockId}"]`)
    if (!block) throw new Error(`块 ${blockId} 不存在`)
    const selection = document.getSelection()
    const range = document.createRange()
    range.selectNodeContents(block)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, blockId)
}

test('选择矩阵在真实浏览器中映射到 canonical 坐标', async ({ page }) => {
  const raw = JSON.parse(await readFile(MATRIX_PATH, 'utf8')) as {
    readonly rows: readonly MatrixRow[]
  }
  await page.goto(FIXTURE_URL)
  await expect(page.locator('[data-selection-scope]')).toBeVisible()
  let revision = 0

  for (const row of raw.rows) {
    if (row.expectation === 'ok') {
      if (row.how === 'text-range') {
        await selectTextRange(page, row.blockId!, row.startOffset!, row.endOffset!)
      } else {
        await selectAtomicNode(page, row.blockId!)
      }
      const mapping = await readMapping(page, revision)
      revision = await page
        .locator('[data-selection-mapping-result]')
        .getAttribute('data-selection-revision')
        .then((value) => Number(value))
      expect(mapping, row.id).toEqual({
        status: 'ok',
        blockId: row.blockId,
        startOffset: row.startOffset,
        endOffset: row.endOffset,
        exact: row.exact,
        headingPath: expect.any(Array),
      })
      continue
    }
    if (row.how === 'cross-blocks') {
      await selectCrossBlocks(page, row.fromBlockId!, row.toBlockId!)
    } else {
      await selectBlockContents(page, row.blockId!)
    }
    const mapping = await readMapping(page, revision)
    revision = await page
      .locator('[data-selection-mapping-result]')
      .getAttribute('data-selection-revision')
      .then((value) => Number(value))
    expect(mapping, row.id).toEqual({
      status: 'rejected',
      reason: row.reason,
    })
  }
})
