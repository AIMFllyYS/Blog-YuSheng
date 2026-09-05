import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { compileArticleDocument } from '../../src/features/doc-engine'
import {
  buildSelectionIndex,
  findSelectionEntry,
  mapDomSelection,
  type SelectionBlockEntry,
  type SelectionDocumentIndex,
  type SelectionDomTextChunk,
  type SelectionEndpointRef,
} from '../../src/features/doc-engine/selection'
import {
  createAssetManifest,
  readPost,
  transformContentImages,
} from '../../src/server/content'

let index: SelectionDocumentIndex

beforeAll(async () => {
  const post = await readPost('p0-kitchen-sink')
  const manifest = await transformContentImages(
    (await createAssetManifest()).filter((entry) => entry.articleSlug === 'p0-kitchen-sink'),
    path.join(process.cwd(), '.tmp', 'compiler-image-cache'),
  )
  const document = await compileArticleDocument({
    articleSlug: post.slug,
    source: post.source,
    frontmatter: post.frontmatter,
    assetManifest: manifest,
  })
  index = buildSelectionIndex(document)
})

function mapping(
  entry: SelectionBlockEntry,
  chunks: readonly SelectionDomTextChunk[],
  start: SelectionEndpointRef,
  end: SelectionEndpointRef,
) {
  return mapDomSelection({
    index,
    startBlockId: entry.blockId,
    endBlockId: entry.blockId,
    entry,
    chunks,
    start,
    end,
  })
}

describe('selection index over the kitchen-sink article', () => {
  it('freezes the block inventory with modes and heading paths', () => {
    const summary = index.blocks.map(
      (block) =>
        `${block.type}/${block.mode}/${block.blockId} path=${block.headingPath.join('>')}`,
    )
    expect(summary).toMatchInlineSnapshot(`
      [
        "heading/text/p0-中文综合验收文章 path=p0-中文综合验收文章",
        "paragraph/text/block-paragraph-b9a4cffa8f0fcabe path=p0-中文综合验收文章",
        "heading/text/markdown-与-gfm path=p0-中文综合验收文章>markdown-与-gfm",
        "list/container/block-list-9ef5d5aec89b38da path=p0-中文综合验收文章>markdown-与-gfm",
        "listItem/container/block-listItem-40fcba8a88cb6609 path=p0-中文综合验收文章>markdown-与-gfm",
        "paragraph/text/block-paragraph-5e0a552dd14f4050 path=p0-中文综合验收文章>markdown-与-gfm",
        "listItem/container/block-listItem-3152963e303fb317 path=p0-中文综合验收文章>markdown-与-gfm",
        "paragraph/text/block-paragraph-52907b6b22890763 path=p0-中文综合验收文章>markdown-与-gfm",
        "listItem/container/block-listItem-5a0534a13f9ed71e path=p0-中文综合验收文章>markdown-与-gfm",
        "paragraph/text/block-paragraph-bddeb776d6b184c4 path=p0-中文综合验收文章>markdown-与-gfm",
        "table/container/block-table-4c3eff7b38b35e66 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-c2109a01615c0163 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-564dd233e19525e6 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-02620ecf5aea48b2 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-1de6b0dd1a746a6d path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-3edd64cd4dc046d5 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-3bbb57f761c87db8 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-9b6d372599b6d5c8 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-72abbcd103df5710 path=p0-中文综合验收文章>markdown-与-gfm",
        "tableCell/text/block-tableCell-ee31b688e6fa185f path=p0-中文综合验收文章>markdown-与-gfm",
        "quote/container/block-quote-2cf9ad7b9f908bd7 path=p0-中文综合验收文章>markdown-与-gfm",
        "paragraph/text/block-paragraph-c5ac56abfec9f968 path=p0-中文综合验收文章>markdown-与-gfm",
        "footnoteDefinition/container/block-footnoteDefinition-6576ac811af4c024 path=p0-中文综合验收文章>markdown-与-gfm",
        "paragraph/text/block-paragraph-52d8b609e1e2c6dd path=p0-中文综合验收文章>markdown-与-gfm",
        "heading/text/代码 path=p0-中文综合验收文章>代码",
        "code/text/block-code-3f7909558b38890c path=p0-中文综合验收文章>代码",
        "heading/text/katex path=p0-中文综合验收文章>katex",
        "paragraph/text/block-paragraph-1670b15a5de67558 path=p0-中文综合验收文章>katex",
        "math/whole-block/block-math-782bb8d222867f01 path=p0-中文综合验收文章>katex",
        "heading/text/mermaid path=p0-中文综合验收文章>mermaid",
        "mermaid/none/block-mermaid-738e6342424188f5 path=p0-中文综合验收文章>mermaid",
        "heading/text/图片 path=p0-中文综合验收文章>图片",
        "image/none/block-image-e8e34c46935d0db6 path=p0-中文综合验收文章>图片",
        "heading/text/媒体与安全组件 path=p0-中文综合验收文章>媒体与安全组件",
        "registeredComponent/none/block-registeredComponent-a897b6d78bac5407 path=p0-中文综合验收文章>媒体与安全组件",
        "registeredComponent/none/block-registeredComponent-e738cf2a44c5334e path=p0-中文综合验收文章>媒体与安全组件",
        "registeredComponent/none/block-registeredComponent-af57baa95bcd156c path=p0-中文综合验收文章>媒体与安全组件",
        "registeredComponent/none/block-registeredComponent-8fc4cd96c5fe763c path=p0-中文综合验收文章>媒体与安全组件",
        "registeredComponent/none/block-registeredComponent-096387d1ef959917 path=p0-中文综合验收文章>媒体与安全组件",
        "registeredComponent/none/block-registeredComponent-7d3e2a48462f7c36 path=p0-中文综合验收文章>媒体与安全组件",
        "heading/text/轻量问答 path=p0-中文综合验收文章>轻量问答",
        "registeredComponent/none/block-registeredComponent-6abb66f838fe8b4b path=p0-中文综合验收文章>轻量问答",
        "registeredComponent/none/block-registeredComponent-525d8845834a984e path=p0-中文综合验收文章>轻量问答",
        "registeredComponent/none/block-registeredComponent-839a9cd151ed2adc path=p0-中文综合验收文章>轻量问答",
        "heading/text/结束 path=p0-中文综合验收文章>结束",
        "paragraph/text/block-paragraph-7a7c503f4875c3e4 path=p0-中文综合验收文章>结束",
      ]
    `)
  })

  it('marks headings, paragraphs, cells and code as character anchorable', () => {
    const heading = index.blocks.find(
      (block) => block.mode === 'text' && block.type === 'heading' && block.canonicalText.includes('Markdown'),
    )
    const cell = index.blocks.find((block) => block.canonicalText === 'CommonMark')
    const code = index.blocks.find((block) =>
      block.canonicalText.includes('export function greet'),
    )
    expect(heading?.headingPath.filter((slug) => slug !== '').length).toBeGreaterThan(0)
    expect(cell?.mode).toBe('text')
    expect(cell?.type).toBe('tableCell')
    expect(code?.mode).toBe('text')
    expect(code?.type).toBe('code')
  })

  it('records the inline formula as an atomic range inside its paragraph', () => {
    const paragraph = index.blocks.find((block) =>
      block.canonicalText.includes('行内公式'),
    )
    expect(paragraph?.mode).toBe('text')
    const atomic = paragraph?.inlineAtomics.find((kind) => kind.kind === 'math')
    expect(atomic).toBeDefined()
    expect(paragraph?.canonicalText.slice(atomic!.canonicalStart, atomic!.canonicalEnd)).toBe(
      'E = mc^2',
    )
  })

  it('exposes the display formula as a whole-block anchor', () => {
    const formula = index.blocks.find(
      (block) => block.mode === 'whole-block' && block.canonicalText.includes('x^2'),
    )
    expect(formula?.inlineAtomics).toHaveLength(1)
    expect(formula?.inlineAtomics[0]?.canonicalStart).toBe(0)
    expect(formula?.inlineAtomics[0]?.canonicalEnd).toBe(formula?.canonicalText.length)
  })

  it('rejects Mermaid, media and interactive components as anchor targets', () => {
    const mermaid = index.blocks.find((block) => block.type === 'mermaid')
    const video = index.blocks.find(
      (block) => block.type === 'registeredComponent' && block.canonicalText.includes('一秒钟验收视频'),
    )
    expect(mermaid?.mode).toBe('none')
    expect(video?.mode).toBe('none')
  })
})

describe('pure DOM selection mapping', () => {
  const textEntry = (canonicalText: string, atomics: SelectionBlockEntry['inlineAtomics'] = []): SelectionBlockEntry => ({
    blockId: 'test-block',
    nodeId: 'test-node',
    type: 'paragraph',
    mode: 'text',
    canonicalText,
    headingPath: ['h1', 'h2'],
    inlineAtomics: atomics,
  })

  it('maps across inline-style chunk boundaries (bold, links, Chinese)', () => {
    const entry = textEntry('支持 删除线 与 粗体、斜体')
    const chunks: SelectionDomTextChunk[] = [
      { text: '支持 ', atomicNodeId: null },
      { text: '删除线', atomicNodeId: null },
      { text: ' 与 ', atomicNodeId: null },
      { text: '粗体', atomicNodeId: null },
      { text: '、斜体', atomicNodeId: null },
    ]
    const result = mapping(entry, chunks, { kind: 'text', chunkIndex: 0, offset: 3 }, { kind: 'text', chunkIndex: 4, offset: 3 })
    expect(result).toEqual({
      status: 'ok',
      blockId: 'test-block',
      headingPath: ['h1', 'h2'],
      startOffset: 3,
      endOffset: 14,
      exact: '删除线 与 粗体、斜体',
    })
  })

  it('keeps soft-break and NFC entity characters addressable', () => {
    const entry = textEntry('第一行\n第二行©')
    const chunks: SelectionDomTextChunk[] = [
      { text: '第一行', atomicNodeId: null },
      { text: '\n', atomicNodeId: null },
      { text: '第二行©', atomicNodeId: null },
    ]
    const result = mapping(entry, chunks, { kind: 'text', chunkIndex: 0, offset: 0 }, { kind: 'text', chunkIndex: 2, offset: 4 })
    expect(result).toEqual({
      status: 'ok',
      blockId: 'test-block',
      headingPath: ['h1', 'h2'],
      startOffset: 0,
      endOffset: 8,
      exact: '第一行\n第二行©',
    })
  })

  it('skips inline images whose alt has no DOM text presence', () => {
    const entry = textEntry('前文图片说明后文', [
      { nodeId: 'img-1', kind: 'image', canonicalStart: 2, canonicalEnd: 6 },
    ])
    const chunks: SelectionDomTextChunk[] = [
      { text: '前文', atomicNodeId: null },
      { text: '后文', atomicNodeId: null },
    ]
    const result = mapping(entry, chunks, { kind: 'text', chunkIndex: 0, offset: 0 }, { kind: 'text', chunkIndex: 1, offset: 2 })
    expect(result).toMatchObject({ status: 'ok', startOffset: 0, endOffset: 8, exact: '前文图片说明后文' })
  })

  it('normalizes any visual part of an inline formula to the full formula range', () => {
    const entry = textEntry('公式 E = mc^2 成立', [
      { nodeId: 'math-1', kind: 'math', canonicalStart: 3, canonicalEnd: 11 },
    ])
    const chunks: SelectionDomTextChunk[] = [
      { text: '公式 ', atomicNodeId: null },
      { text: 'E', atomicNodeId: 'math-1' },
      { text: ' = mc', atomicNodeId: 'math-1' },
      { text: '^2', atomicNodeId: 'math-1' },
      { text: ' 成立', atomicNodeId: null },
    ]
    const inside = mapping(entry, chunks, { kind: 'atomic', nodeId: 'math-1' }, { kind: 'atomic', nodeId: 'math-1' })
    expect(inside).toMatchObject({ status: 'ok', startOffset: 3, endOffset: 11, exact: 'E = mc^2' })

    const mixed = mapping(entry, chunks, { kind: 'text', chunkIndex: 0, offset: 0 }, { kind: 'atomic', nodeId: 'math-1' })
    expect(mixed).toMatchObject({ status: 'ok', startOffset: 0, endOffset: 11, exact: '公式 E = mc^2' })
  })

  it('maps a whole-block formula from any inner endpoint', () => {
    const canonical = '\\int_{0}^{1} x^2\\,dx = \\frac{1}{3}'
    const entry: SelectionBlockEntry = {
      blockId: 'formula-block',
      nodeId: 'formula-node',
      type: 'math',
      mode: 'whole-block',
      canonicalText: canonical,
      headingPath: [],
      inlineAtomics: [{ nodeId: 'formula-node', kind: 'math', canonicalStart: 0, canonicalEnd: canonical.length }],
    }
    const result = mapping(entry, [{ text: canonical, atomicNodeId: 'formula-node' }], { kind: 'atomic', nodeId: 'formula-node' }, { kind: 'atomic', nodeId: 'formula-node' })
    expect(result).toMatchObject({ status: 'ok', startOffset: 0, endOffset: canonical.length, exact: canonical })
  })

  it('rejects collapsed selections', () => {
    const entry = textEntry('abcdef')
    const result = mapping(entry, [{ text: 'abcdef', atomicNodeId: null }], { kind: 'text', chunkIndex: 0, offset: 2 }, { kind: 'text', chunkIndex: 0, offset: 2 })
    expect(result).toEqual({ status: 'rejected', reason: 'collapsed' })
  })

  it('rejects unknown atomic chunks instead of guessing offsets', () => {
    const entry = textEntry('abc')
    const result = mapping(entry, [{ text: 'x', atomicNodeId: 'ghost' }], { kind: 'text', chunkIndex: 0, offset: 0 }, { kind: 'text', chunkIndex: 0, offset: 1 })
    expect(result).toEqual({ status: 'rejected', reason: 'not-annotatable' })
  })

  it('rejects chunk text that diverges from the canonical line', () => {
    const entry = textEntry('abc')
    const result = mapping(entry, [{ text: 'xyz', atomicNodeId: null }], { kind: 'text', chunkIndex: 0, offset: 0 }, { kind: 'text', chunkIndex: 0, offset: 1 })
    expect(result).toEqual({ status: 'rejected', reason: 'not-annotatable' })
  })

  it('rejects cross-block and non-annotatable entries at the request level', () => {
    const entry = textEntry('abc')
    const cross = mapDomSelection({
      index,
      startBlockId: 'a',
      endBlockId: 'b',
      entry,
      chunks: [{ text: 'abc', atomicNodeId: null }],
      start: { kind: 'text', chunkIndex: 0, offset: 0 },
      end: { kind: 'text', chunkIndex: 0, offset: 2 },
    })
    expect(cross).toEqual({ status: 'rejected', reason: 'cross-block' })

    const componentEntry: SelectionBlockEntry = { ...entry, mode: 'none' }
    const component = mapDomSelection({
      index,
      startBlockId: 'test-block',
      endBlockId: 'test-block',
      entry: componentEntry,
      chunks: [],
      start: { kind: 'atomic', nodeId: 'n' },
      end: { kind: 'atomic', nodeId: 'n' },
    })
    expect(component).toEqual({ status: 'rejected', reason: 'not-annotatable' })
  })

  it('finds entries by block id', () => {
    const first = index.blocks[0]!
    expect(findSelectionEntry(index, first.blockId)).toBe(first)
    expect(findSelectionEntry(index, 'missing')).toBeUndefined()
  })
})

describe('selection matrix fixture parity', () => {
  it('keeps every matrix row resolvable against the compiled article', async () => {
    const raw = await readFile(
      path.join(
        process.cwd(),
        'src/features/annotations/anchors/__fixtures__/selection-matrix.json',
      ),
      'utf8',
    )
    const parsed = JSON.parse(raw) as {
      readonly rows: readonly {
        readonly id: string
        readonly expectation: 'ok' | 'rejected'
        readonly blockId?: string
        readonly nodeId?: string
        readonly startOffset?: number
        readonly endOffset?: number
        readonly exact?: string
        readonly reason?: string
      }[]
    }
    const matrix = parsed.rows
    expect(matrix.length).toBeGreaterThanOrEqual(10)
    for (const row of matrix) {
      if (row.expectation !== 'ok' || !row.blockId) continue
      const entry = findSelectionEntry(index, row.blockId)
      expect(entry, row.id).toBeDefined()
      if (row.exact !== undefined) {
        expect(
          entry!.canonicalText.slice(row.startOffset, row.endOffset),
          row.id,
        ).toBe(row.exact)
        expect(row.endOffset!, row.id).toBeLessThanOrEqual(entry!.canonicalText.length)
      }
    }
  })
})
