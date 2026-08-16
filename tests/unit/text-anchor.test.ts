import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { compileArticleDocument } from '../../src/features/doc-engine'
import { buildSelectionIndex, type SelectionDocumentIndex } from '../../src/features/doc-engine/selection'
import {
  createTextAnchor,
  reconnectTextAnchor,
  serializeTextAnchor,
  validateTextAnchor,
  type TextAnchor,
} from '../../src/features/annotations/anchors'
import {
  createAssetManifest,
  readPost,
  transformContentImages,
} from '../../src/server/content'

const FIXTURES_ROOT = path.join(
  process.cwd(),
  'src/features/annotations/anchors/__fixtures__',
)

let articleIndex: SelectionDocumentIndex
let indexV1: SelectionDocumentIndex
let indexV2: SelectionDocumentIndex
let matrix: {
  readonly rows: readonly {
    readonly id: string
    readonly expectation: string
    readonly blockId?: string
    readonly startOffset?: number
    readonly endOffset?: number
    readonly exact?: string
    readonly expectedAnchor?: Record<string, unknown>
  }[]
}

beforeAll(async () => {
  const post = await readPost('p0-kitchen-sink')
  const manifest = await transformContentImages(
    await createAssetManifest(),
    path.join(process.cwd(), '.tmp', 'compiler-image-cache'),
  )
  const compile = (source: string) =>
    compileArticleDocument({
      articleSlug: post.slug,
      source,
      frontmatter: post.frontmatter,
      assetManifest: manifest,
    })
  articleIndex = buildSelectionIndex(await compile(post.source))
  const v1Source = await readFile(
    path.join(FIXTURES_ROOT, 'kitchen-sink-v1.md'),
    'utf8',
  )
  const v2Source = await readFile(
    path.join(FIXTURES_ROOT, 'kitchen-sink-v2.md'),
    'utf8',
  )
  expect(v1Source).toBe(post.source)
  indexV1 = buildSelectionIndex(await compile(v1Source))
  indexV2 = buildSelectionIndex(await compile(v2Source))
  matrix = JSON.parse(
    await readFile(path.join(FIXTURES_ROOT, 'selection-matrix.json'), 'utf8'),
  )
})

function anchorOf(rowId: string): TextAnchor {
  const row = matrix.rows.find((candidate) => candidate.id === rowId)
  if (!row?.blockId || row.startOffset === undefined || row.endOffset === undefined) {
    throw new Error(`矩阵行 ${rowId} 缺少坐标`)
  }
  const created = createTextAnchor({
    articleSlug: indexV1.articleSlug,
    index: indexV1,
    blockId: row.blockId,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
  })
  if (!('anchor' in created)) {
    throw new Error(`矩阵行 ${rowId} 创建锚点失败：${JSON.stringify(created.diagnostics)}`)
  }
  return created.anchor
}

describe('TextAnchor creation', () => {
  it('produces byte-identical anchors for the same selection over the same document', () => {
    const first = anchorOf('paragraph-across-strong')
    const second = anchorOf('paragraph-across-strong')
    expect(serializeTextAnchor(first)).toBe(serializeTextAnchor(second))
  })

  it('matches the frozen expectedAnchor for every ok matrix row', () => {
    const okRows = matrix.rows.filter((row) => row.expectation === 'ok' && row.expectedAnchor)
    expect(okRows.length).toBeGreaterThanOrEqual(10)
    for (const row of okRows) {
      expect(JSON.parse(serializeTextAnchor(anchorOf(row.id))), row.id).toEqual(
        row.expectedAnchor,
      )
    }
  })

  it('keeps prefix and suffix within 32 UTF-16 code units', () => {
    const anchor = anchorOf('paragraph-across-code-link-footnote')
    expect(anchor.prefix.length).toBeLessThanOrEqual(32)
    expect(anchor.suffix.length).toBeLessThanOrEqual(32)
    const entry = indexV1.blocks.find((block) => block.blockId === anchor.startBlockId)
    const canonical = entry!.canonicalText
    expect(anchor.prefix).toBe(
      canonical.slice(Math.max(0, anchor.startOffset - 32), anchor.startOffset),
    )
    expect(anchor.suffix).toBe(
      canonical.slice(
        anchor.endOffset,
        Math.min(canonical.length, anchor.endOffset + 32),
      ),
    )
  })

  it('stores normalized heading slugs, not display text', () => {
    const anchor = anchorOf('quote-text')
    expect(anchor.headingPath).toEqual(['p0-中文综合验收文章', 'markdown-与-gfm'])
  })

  it('rejects invalid offsets, missing blocks and non-annotatable blocks', () => {
    const offsets = createTextAnchor({
      articleSlug: indexV1.articleSlug,
      index: indexV1,
      blockId: 'block-paragraph-b9a4cffa8f0fcabe',
      startOffset: 5,
      endOffset: 5,
    })
    expect('diagnostics' in offsets && offsets.diagnostics[0]?.code).toBe('ANCHOR-OFFSET-INVALID')

    const missing = createTextAnchor({
      articleSlug: indexV1.articleSlug,
      index: indexV1,
      blockId: 'ghost',
      startOffset: 0,
      endOffset: 2,
    })
    expect('diagnostics' in missing && missing.diagnostics[0]?.code).toBe('ANCHOR-BLOCK-MISSING')

    const mermaid = indexV1.blocks.find((block) => block.type === 'mermaid')!
    const rejected = createTextAnchor({
      articleSlug: indexV1.articleSlug,
      index: indexV1,
      blockId: mermaid.blockId,
      startOffset: 0,
      endOffset: 3,
    })
    expect('diagnostics' in rejected && rejected.diagnostics[0]?.code).toBe(
      'ANCHOR-BLOCK-NOT-ANNOTATABLE',
    )
  })
})

describe('TextAnchor validation', () => {
  it('accepts a freshly created anchor', () => {
    expect(validateTextAnchor(anchorOf('code-identifier'), indexV1)).toEqual([])
  })

  it('detects tampering in exact, context, protocol and block scope', () => {
    const anchor = anchorOf('table-cell')
    expect(
      validateTextAnchor({ ...anchor, exact: 'GFM' }, indexV1).map((item) => item.code),
    ).toContain('ANCHOR-EXACT-MISMATCH')
    expect(
      validateTextAnchor({ ...anchor, prefix: 'x'.repeat(33) }, indexV1).map((item) => item.code),
    ).toContain('ANCHOR-CONTEXT-TOO-LONG')
    expect(
      validateTextAnchor({ ...anchor, endBlockId: 'other' }, indexV1).map((item) => item.code),
    ).toContain('ANCHOR-OFFSET-INVALID')
    expect(
      validateTextAnchor(
        { ...anchor, protocolVersion: 2 as unknown as 1 },
        indexV1,
      ).map((item) => item.code),
    ).toContain('ANCHOR-PROTOCOL-INVALID')
  })
})

describe('reconnection across the v1 → v2 fixture pair', () => {
  it('keeps heading-slug anchors attached across ordinary-block edits', () => {
    // Headings use slug IDs (spec 5.2). Ordinary block IDs include siblingIndex,
    // so deleting ## 代码 or reordering quote/table cannot keep those IDs.
    const heading = reconnectTextAnchor(anchorOf('heading-2-full'), indexV2)
    expect(heading.status).toBe('attached')
    expect(heading.reconnected).toBeUndefined()
  })

  it('reattaches shifted text through exact search with the v2 fingerprint', () => {
    const movedQuote = reconnectTextAnchor(anchorOf('quote-text'), indexV2)
    expect(movedQuote.status).toBe('reattached')
    expect(movedQuote.reconnected).toBeDefined()
    expect(movedQuote.reconnected!.exact).toBe('内容协议必须可读')
    expect(movedQuote.reconnected!.startBlockId).not.toBe(anchorOf('quote-text').startBlockId)

    const original = anchorOf('paragraph-across-strong')
    const result = reconnectTextAnchor(original, indexV2)
    expect(result.status).toBe('reattached')
    expect(result.reconnected).toBeDefined()
    expect(result.reconnected!.startBlockId).not.toBe(original.startBlockId)
    expect(result.reconnected!.exact).toBe(original.exact)
    expect(result.reconnected!.documentFingerprint).toBe(indexV2.documentFingerprint)
    const entry = indexV2.blocks.find(
      (block) => block.blockId === result.reconnected!.startBlockId,
    )
    expect(
      entry!.canonicalText.slice(
        result.reconnected!.startOffset,
        result.reconnected!.endOffset,
      ),
    ).toBe(original.exact)

    const longSelection = reconnectTextAnchor(
      anchorOf('paragraph-across-code-link-footnote'),
      indexV2,
    )
    expect(longSelection.status).toBe('reattached')

    const formula = reconnectTextAnchor(anchorOf('display-formula'), indexV2)
    expect(formula.status).toBe('reattached')
    expect(formula.reconnected!.exact).toBe(anchorOf('display-formula').exact)

    const listItem = reconnectTextAnchor(anchorOf('list-item-inline-styles'), indexV2)
    expect(listItem.status).toBe('reattached')
    expect(listItem.reconnected!.exact).toBe(anchorOf('list-item-inline-styles').exact)
  })

  it('orphans anchors whose block and exact text are gone', () => {
    const result = reconnectTextAnchor(anchorOf('code-identifier'), indexV2)
    expect(result.status).toBe('orphaned')
    expect(result.anchor.exact).toBe('greet')
    expect(indexV2.blocks.some((block) => block.blockId === result.anchor.startBlockId)).toBe(
      false,
    )
  })

  it('prefers the heading-path-closest duplicate and document order on ties', () => {
    const base = anchorOf('table-cell')
    const duplicated: SelectionDocumentIndex = {
      articleSlug: indexV1.articleSlug,
      documentFingerprint: indexV1.documentFingerprint,
      blocks: [
        {
          blockId: 'dup-a',
          nodeId: 'n-a',
          type: 'paragraph',
          mode: 'text',
          canonicalText: `前缀${base.exact}后缀`,
          headingPath: base.headingPath,
          inlineAtomics: [],
        },
        {
          blockId: 'dup-b',
          nodeId: 'n-b',
          type: 'paragraph',
          mode: 'text',
          canonicalText: `${base.exact}另一种上下文`,
          headingPath: [...base.headingPath, 'other-section'],
          inlineAtomics: [],
        },
      ],
    }
    const result = reconnectTextAnchor(base, duplicated)
    expect(result.status).toBe('reattached')
    expect(result.reconnected!.startBlockId).toBe('dup-a')

    const tie: SelectionDocumentIndex = {
      ...duplicated,
      blocks: [
        { ...duplicated.blocks[1]!, blockId: 'tie-b', headingPath: base.headingPath },
        { ...duplicated.blocks[0]!, blockId: 'tie-a', headingPath: base.headingPath },
      ],
    }
    const tieResult = reconnectTextAnchor(base, tie)
    expect(tieResult.reconnected!.startBlockId).toBe('tie-b')
  })
})

describe('fixture pair integrity', () => {
  it('keeps v1 in lockstep with the real kitchen-sink article', () => {
    expect(indexV1.blocks.map((block) => block.blockId)).toEqual(
      articleIndex.blocks.map((block) => block.blockId),
    )
    expect(indexV1.documentFingerprint).toBe(articleIndex.documentFingerprint)
  })

  it('applies exactly the intended v2 edits (move, tweak, delete)', () => {
    const v2Ids = new Set(indexV2.blocks.map((block) => block.blockId))
    expect(v2Ids.has('代码')).toBe(false)
    const quoteBeforeTable = indexV2.blocks.findIndex((b) => b.type === 'quote')
      < indexV2.blocks.findIndex((b) => b.type === 'table')
    expect(quoteBeforeTable).toBe(true)
    const tweaked = indexV2.blocks.find((block) =>
      block.canonicalText.includes('（二版引言。）'),
    )
    expect(tweaked?.canonicalText).toContain(baseParagraphExact())
  })
})

function baseParagraphExact(): string {
  return '只包含合法内容的黄金文章'
}
