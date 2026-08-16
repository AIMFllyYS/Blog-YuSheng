import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  assertDocumentBuildCanContinue,
  createDocumentDiagnostic,
  createDocumentFingerprint,
  createStableBlockId,
  DOCUMENT_DIAGNOSTIC_DEFINITIONS,
  DOCUMENT_PROTOCOL_VERSION,
  DOCUMENT_SCHEMA_VERSION,
  hasBlockingDocumentErrors,
  normalizeBlockCanonicalText,
  normalizeDocumentSource,
  normalizeHeadingSlug,
  StableIdAllocator,
  type BlockNode,
  type CompiledDocument,
  type RegisteredComponentNode,
  type RootNode,
  type SourceRange,
} from '../../src/features/doc-engine'

const SOURCE_RANGE: SourceRange = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 5, offset: 4 },
}

describe('Canonical Document IR protocol', () => {
  it('locks component children and component source positions at the type boundary', () => {
    expectTypeOf<RegisteredComponentNode['children'][number]>().toMatchTypeOf<BlockNode>()
    expectTypeOf<RegisteredComponentNode['children'][number]>().not.toMatchTypeOf<RootNode>()
    expectTypeOf<Parameters<StableIdAllocator['allocateComponent']>[1]>().toEqualTypeOf<SourceRange>()
  })

  it('accepts the locked schema as a strict discriminated document tree', () => {
    const document: CompiledDocument = {
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      protocolVersion: DOCUMENT_PROTOCOL_VERSION,
      articleSlug: 'golden-post',
      documentFingerprint: 'sha256',
      frontmatter: { title: '黄金样例' },
      originalSource: '---\ntitle: 黄金样例\n---\n\n# 标题\n',
      assetManifest: [],
      sourceMap: {},
      root: {
        type: 'root',
        nodeId: 'root',
        sourceRange: SOURCE_RANGE,
        children: [
          {
            type: 'heading',
            nodeId: '标题',
            blockId: '标题',
            canonicalText: '标题',
            slug: '标题',
            depth: 1,
            sourceRange: SOURCE_RANGE,
            children: [
              {
                type: 'text',
                nodeId: 'text-1',
                sourceRange: SOURCE_RANGE,
                value: '标题',
                canonicalText: '标题',
              },
            ],
          },
          {
            type: 'paragraph',
            nodeId: 'paragraph-1',
            blockId: 'paragraph-1',
            canonicalText: '文字 E=mc² 和图继续',
            sourceRange: SOURCE_RANGE,
            children: [
              {
                type: 'text',
                nodeId: 'text-2',
                sourceRange: SOURCE_RANGE,
                value: '文字 ',
                canonicalText: '文字 ',
              },
              {
                type: 'math',
                nodeId: 'math-inline-1',
                sourceRange: SOURCE_RANGE,
                display: false,
                value: 'E=mc^2',
                canonicalText: 'E=mc²',
              },
              {
                type: 'image',
                nodeId: 'image-inline-1',
                sourceRange: SOURCE_RANGE,
                placement: 'inline',
                src: './image.png',
                alt: '图',
              },
              {
                type: 'text',
                nodeId: 'text-3',
                sourceRange: SOURCE_RANGE,
                value: '继续',
                canonicalText: '继续',
              },
            ],
          },
        ],
      },
    }

    expect(document.root.children[0]).toMatchObject({
      type: 'heading',
      blockId: '标题',
    })
    expect(document.originalSource.startsWith('---')).toBe(true)
  })

  it('generates the versioned SHA-256 golden fingerprint', async () => {
    const source = '\uFEFF---\r\ntitle: 羽升\r\n---\r\n\r\n# Cafe\u0301\r\n'
    await expect(createDocumentFingerprint(source)).resolves.toBe(
      'a35767499c69f5280ce9e2218c4a812ff54e8da284dd74cb4277abe0cc8b8d3b',
    )
  })

  it('normalizes BOM, line endings, and Unicode without changing original input', async () => {
    const decomposed = '\uFEFF# Cafe\u0301\r\n正文\r'
    const composed = '# Café\n正文\n'

    expect(normalizeDocumentSource(decomposed)).toBe(composed)
    expect(decomposed.startsWith('\uFEFF')).toBe(true)
    await expect(createDocumentFingerprint(decomposed)).resolves.toBe(
      await createDocumentFingerprint(composed),
    )
    await expect(createDocumentFingerprint(`${composed}变化`)).resolves.not.toBe(
      await createDocumentFingerprint(composed),
    )
  })
})

describe('stable node identifiers', () => {
  it('creates Unicode heading slugs and deterministic duplicate suffixes', () => {
    const allocator = new StableIdAllocator('golden-post')

    expect(normalizeHeadingSlug('  羽升：关于我  ')).toBe('羽升-关于我')
    expect(allocator.allocateHeading('重复 标题')).toBe('重复-标题')
    expect(allocator.allocateHeading('重复　标题')).toBe('重复-标题-2')
    expect(allocator.allocateHeading('!!!')).toBe('section')
    expect(allocator.allocateHeading('...')).toBe('section-2')
  })

  it('keeps heading IDs unique when natural numeric suffixes collide', () => {
    const allocator = new StableIdAllocator('golden-post')

    expect(allocator.allocateHeading('A-2')).toBe('a-2')
    expect(allocator.allocateHeading('A')).toBe('a')
    expect(allocator.allocateHeading('A')).toBe('a-3')
    expect(allocator.allocateHeading('A-2')).toBe('a-2-2')
  })

  it('generates the stable block ID golden fixture', async () => {
    await expect(
      createStableBlockId({
        headingPath: ['介绍'],
        blockType: 'paragraph',
        siblingIndex: 0,
        canonicalText: '第一段\r\n文本',
      }),
    ).resolves.toBe('block-paragraph-af71ff54203a4b83')
  })

  it('changes block identity when structural context changes', async () => {
    const base = {
      headingPath: ['介绍'],
      blockType: 'paragraph' as const,
      siblingIndex: 0,
      canonicalText: '同一段正文',
    }
    const ids = await Promise.all([
      createStableBlockId(base),
      createStableBlockId({ ...base, headingPath: ['其他章节'] }),
      createStableBlockId({ ...base, siblingIndex: 1 }),
      createStableBlockId({ ...base, canonicalText: '另一段正文' }),
    ])

    expect(new Set(ids).size).toBe(ids.length)
    await expect(createStableBlockId(base)).resolves.toBe(ids[0])
    await expect(
      createStableBlockId({ ...base, siblingIndex: -1 }),
    ).rejects.toThrow('同级块序号必须是非负安全整数')
  })

  it('keeps the first component author ID and diagnoses deterministic duplicates', () => {
    const allocator = new StableIdAllocator('golden-post')

    expect(allocator.allocateComponent('chart-main', SOURCE_RANGE)).toEqual({
      nodeId: 'chart-main',
    })
    expect(allocator.allocateComponent('chart-main', SOURCE_RANGE)).toEqual({
      nodeId: 'chart-main--duplicate-2',
      diagnostic: expect.objectContaining({
        code: 'DOC-REGISTRY-003',
        severity: 'error',
        articleSlug: 'golden-post',
        nodeId: 'chart-main',
        sourceRange: SOURCE_RANGE,
      }),
    })
    expect(allocator.allocateComponent('chart-main', SOURCE_RANGE).nodeId).toBe(
      'chart-main--duplicate-3',
    )
  })

  it('avoids collisions with natural component IDs and heading IDs', () => {
    const allocator = new StableIdAllocator('golden-post')

    expect(allocator.allocateComponent('x', SOURCE_RANGE).nodeId).toBe('x')
    expect(allocator.allocateComponent('x--duplicate-2', SOURCE_RANGE).nodeId).toBe(
      'x--duplicate-2',
    )
    expect(allocator.allocateComponent('x', SOURCE_RANGE).nodeId).toBe(
      'x--duplicate-3',
    )
    expect(allocator.allocateHeading('x')).toBe('x')
    expect(allocator.allocateComponent('x', SOURCE_RANGE).nodeId).toBe(
      'x--duplicate-4',
    )
  })

  it('preserves code characters while normalizing text blocks to NFC', async () => {
    expect(normalizeBlockCanonicalText('code', '\uFEFFCafe\u0301\r\n')).toBe(
      '\uFEFFCafe\u0301\n',
    )
    expect(normalizeBlockCanonicalText('paragraph', '\uFEFFCafe\u0301\r\n')).toBe(
      '\uFEFFCafé\n',
    )
    await expect(
      createStableBlockId({
        headingPath: [],
        blockType: 'code',
        siblingIndex: 0,
        canonicalText: 'Cafe\u0301',
      }),
    ).resolves.not.toBe(
      await createStableBlockId({
        headingPath: [],
        blockType: 'code',
        siblingIndex: 0,
        canonicalText: 'Café',
      }),
    )
  })
})

describe('document diagnostics', () => {
  it('centrally locks every specification scenario severity', () => {
    expect(DOCUMENT_DIAGNOSTIC_DEFINITIONS).toMatchObject({
      'DOC-REGISTRY-001': { severity: 'error' },
      'DOC-REGISTRY-002': { severity: 'error' },
      'DOC-REGISTRY-003': { severity: 'error' },
      'DOC-ASSET-001': { severity: 'error' },
      'DOC-ASSET-002': { severity: 'error' },
      'DOC-META-001': { severity: 'warning' },
      'DOC-ASSET-003': { severity: 'warning' },
      'DOC-SECURITY-001': { severity: 'error' },
      'DOC-SECURITY-002': { severity: 'error' },
      'DOC-SECURITY-003': { severity: 'error' },
      'DOC-SECURITY-004': { severity: 'error' },
      'DOC-ASSET-004': { severity: 'warning' },
      'DOC-RENDER-001': { severity: 'error' },
    })
    expect(DOCUMENT_DIAGNOSTIC_DEFINITIONS).toMatchObject({
      'DOC-REGISTRY-001': {
        phase: 'article-build',
        disposition: 'block-build',
      },
      'DOC-META-001': {
        phase: 'article-build',
        disposition: 'continue-with-fallback',
      },
      'DOC-SECURITY-001': {
        phase: 'discussion-write',
        disposition: 'reject-entry',
      },
      'DOC-SECURITY-004': {
        phase: 'discussion-read',
        disposition: 'safe-fallback',
      },
      'DOC-RENDER-001': {
        phase: 'runtime',
        disposition: 'safe-fallback',
      },
    })
  })

  it('uses registered Chinese messages and blocks formal builds on errors', () => {
    const warning = createDocumentDiagnostic('DOC-META-001', {
      articleSlug: 'golden-post',
    })
    const error = createDocumentDiagnostic('DOC-ASSET-002', {
      articleSlug: 'golden-post',
      nodeId: 'image-1',
      sourceRange: SOURCE_RANGE,
    })

    expect(warning).toMatchObject({ severity: 'warning', message: expect.any(String) })
    expect(hasBlockingDocumentErrors([warning])).toBe(false)
    expect(() => assertDocumentBuildCanContinue([warning])).not.toThrow()
    expect(hasBlockingDocumentErrors([warning, error])).toBe(true)
    expect(() => assertDocumentBuildCanContinue([warning, error])).toThrowError(
      expect.objectContaining({ diagnostics: [warning, error] }),
    )
  })

  it('does not let discussion or runtime errors block an article build', () => {
    const discussionWrite = createDocumentDiagnostic('DOC-SECURITY-001', {
      articleSlug: 'discussion',
    })
    const discussionRead = createDocumentDiagnostic('DOC-SECURITY-004', {
      articleSlug: 'discussion',
    })
    const runtime = createDocumentDiagnostic('DOC-RENDER-001', {
      articleSlug: 'golden-post',
    })

    expect(discussionWrite).toMatchObject({
      buildBlocking: false,
      disposition: 'reject-entry',
    })
    expect(discussionRead).toMatchObject({
      buildBlocking: false,
      disposition: 'safe-fallback',
    })
    expect(runtime).toMatchObject({
      buildBlocking: false,
      disposition: 'safe-fallback',
    })
    expect(() =>
      assertDocumentBuildCanContinue([discussionWrite, discussionRead, runtime]),
    ).not.toThrow()
  })
})
