import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  compileArticleDocument,
  compileDocument,
  createStableBlockId,
  type BlockNode,
} from '../../src/features/doc-engine'
import {
  createAssetManifest,
  readPost,
  transformContentImages,
} from '../../src/server/content'

describe('Markdown to Canonical IR compiler', () => {
  it('compiles the Chinese kitchen-sink article through one canonical pipeline', async () => {
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
    const nodes = flatten(document.root.children)

    expect(document.originalSource).toBe(post.source)
    expect(document.originalSource).toMatch(/^---\r?\n/)
    expect(document.documentFingerprint).toMatch(/^[a-f\d]{64}$/)
    expect(nodes.map((node) => node.type)).toEqual(
      expect.arrayContaining([
        'heading',
        'paragraph',
        'list',
        'table',
        'quote',
        'footnoteDefinition',
        'code',
        'math',
        'mermaid',
        'image',
        'registeredComponent',
      ]),
    )
    const registeredComponents = nodes.filter(
      (node) => node.type === 'registeredComponent',
    )
    expect(registeredComponents.length).toBeGreaterThanOrEqual(9)
    expect(
      new Set(registeredComponents.map((node) => node.name)).size,
    ).toBeGreaterThanOrEqual(8)
    expect(nodes.find((node) => node.type === 'image')).toMatchObject({
      placement: 'block',
      width: 1200,
      height: 630,
    })
    expect(
      nodes.find(
        (node) =>
          node.type === 'registeredComponent' && node.name === 'html-embed',
      ),
    ).toMatchObject({
      componentId: 'mini-card',
      selectable: 'none',
      canonicalText: '无法加载交互小页时，显示这段安全降级说明。',
    })
    expect(Object.keys(document.sourceMap).length).toBeGreaterThan(20)
  })

  it('maps entities, soft line breaks, and text split across inline styles', async () => {
    const source = '# 标题\n\n普通 **粗体 &amp;** 和 *斜体*\n软换行\n'
    const result = await compileDocument({
      articleSlug: 'source-map',
      source,
      frontmatter: {},
    })
    const paragraph = result.document.root.children[1]

    expect(result.diagnostics).toEqual([])
    expect(paragraph).toMatchObject({
      type: 'paragraph',
      canonicalText: '普通 粗体 & 和 斜体\n软换行',
    })
    const segments = result.document.sourceMap[paragraph!.blockId]
    const entity = segments?.find(
      (segment) => source.slice(segment.sourceStart, segment.sourceEnd) === '&amp;',
    )
    expect(entity).toMatchObject({ kind: 'text' })
    expect(
      segments?.some(
        (segment) =>
          segment.kind === 'soft-break' &&
          source.slice(segment.sourceStart, segment.sourceEnd) === '\n',
      ),
    ).toBe(true)
    expect(segments?.at(-1)?.canonicalEnd).toBe(paragraph?.canonicalText.length)
  })

  it('reports raw HTML, unknown tags, invalid attributes, and duplicate IDs with ranges', async () => {
    const source = [
      '<div>raw</div>',
      '',
      '<unknown-widget id="unknown" />',
      '',
      '<video-embed id="same" src="./demo.mp4" title="Demo" onclick="run" />',
      '',
      '<audio-embed id="same" src="./demo.mp3" title="Audio" />',
      '',
      '<svg-embed id="same" src="./demo.svg" title="SVG" />',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'invalid-fixture',
      source,
      frontmatter: {},
    })

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'DOC-PARSE-001',
      'DOC-REGISTRY-001',
      'DOC-REGISTRY-002',
      'DOC-REGISTRY-003',
    ])
    expect(
      result.diagnostics.every(
        (diagnostic) =>
          diagnostic.severity === 'error' &&
          diagnostic.sourceRange?.start.offset !== undefined,
      ),
    ).toBe(true)
    await expect(
      compileArticleDocument({
        articleSlug: 'invalid-fixture',
        source,
        frontmatter: {},
      }),
    ).rejects.toMatchObject({
      diagnostics: expect.arrayContaining([...result.diagnostics]),
    })
  })

  it('compiles CommonMark references, hard breaks, and thematic breaks', async () => {
    const source = [
      '[链接][target] 与 ![图片][asset]  ',
      '下一行',
      '',
      '---',
      '',
      '[target]: https://example.com "示例"',
      '[asset]: ./media/example.png',
      '[ASSET]: ../ignored-duplicate.png',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'references',
      source,
      frontmatter: {},
    })
    const paragraph = result.document.root.children[0]

    expect(result.diagnostics).toEqual([])
    expect(result.document.root.children[1]).toMatchObject({
      type: 'thematicBreak',
    })
    expect(paragraph).toMatchObject({
      type: 'paragraph',
      canonicalText: '链接 与 图片\n下一行',
      children: expect.arrayContaining([
        expect.objectContaining({ type: 'link', url: 'https://example.com' }),
        expect.objectContaining({
          type: 'image',
          src: './media/example.png',
        }),
      ]),
    })
  })

  it('keeps complete source immutable and compiles multiline component attributes', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'content/posts/p0-kitchen-sink/index.md'),
      'utf8',
    )
    const custom = `${source}\n<canvas-render\n  id="extra-plot"\n  renderer="function-plot"\n  width="640"\n  height="320"\n/>\n`
    const result = await compileDocument({
      articleSlug: 'multiline',
      source: custom,
      frontmatter: {},
    })
    const component = result.document.root.children.at(-1)

    expect(result.diagnostics).toEqual([])
    expect(result.document.originalSource).toBe(custom)
    expect(component).toMatchObject({
      type: 'registeredComponent',
      componentId: 'extra-plot',
      attributes: { width: 640, height: 320 },
    })
  })

  it('scopes nested block IDs and keeps every source map unique and bounded', async () => {
    const source = [
      '- same',
      '- same',
      '- one  ',
      '  two',
      '',
      '> quote',
      '',
      '> ![alt](./image.png)',
      '',
      '> quote',
      '',
      '- first paragraph',
      '',
      '  second paragraph',
      '',
      '| cell |',
      '| --- |',
      '| same |',
      '',
      '| cell |',
      '| --- |',
      '| same |',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'nested-identities',
      source,
      frontmatter: {},
    })
    const semantic = collectSemanticBlocks(result.document.root.children)
    const ids = semantic.map((node) => node.blockId)

    expect(result.diagnostics).toEqual([])
    expect(new Set(ids).size).toBe(ids.length)
    for (const node of semantic) {
      const segments = result.document.sourceMap[node.blockId] ?? []
      expect(
        segments.every(
          (segment) =>
            segment.canonicalStart >= 0 &&
            segment.canonicalEnd >= segment.canonicalStart &&
            segment.canonicalEnd <= node.canonicalText.length,
        ),
      ).toBe(true)
    }
  })

  it('isolates image dimensions by article slug and exact output path', async () => {
    const source = '![cover](./media/images/cover.png)\n'
    const assetManifest = [
      {
        articleSlug: 'other-post',
        outputPath: 'blog/other-post/media/images/cover.png',
        image: { width: 10, height: 20, derived: false },
      },
      {
        articleSlug: 'target-post',
        outputPath: 'blog/target-post/media/images/cover.png',
        image: { width: 800, height: 400, derived: false },
      },
    ]
    const result = await compileDocument({
      articleSlug: 'target-post',
      source,
      frontmatter: {},
      assetManifest,
    })

    expect(result.document.root.children[0]).toMatchObject({
      type: 'image',
      width: 800,
      height: 400,
    })
  })

  it('maps NFC grapheme clusters, combining marks, emoji, and entities precisely', async () => {
    const source = 'Cafe\u0301 a\u0301\u0327 👨‍👩‍👧 &amp; &NotEqualTilde; fin\n'
    const result = await compileDocument({
      articleSlug: 'graphemes',
      source,
      frontmatter: {},
    })
    const paragraph = result.document.root.children[0]!
    const segments = result.document.sourceMap[paragraph.blockId] ?? []
    const acute = segments.find(
      (segment) =>
        paragraph.canonicalText.slice(
          segment.canonicalStart,
          segment.canonicalEnd,
        ) === 'é',
    )

    expect(acute).toBeDefined()
    expect(source.slice(acute!.sourceStart, acute!.sourceEnd)).toBe('e\u0301')
    expect(
      segments.some(
        (segment) => source.slice(segment.sourceStart, segment.sourceEnd) === '👨‍👩‍👧',
      ),
    ).toBe(true)
    expect(
      segments.some(
        (segment) => source.slice(segment.sourceStart, segment.sourceEnd) === '&amp;',
      ),
    ).toBe(true)
    const multiCodePointEntity = segments.filter(
      (segment) =>
        source.slice(segment.sourceStart, segment.sourceEnd) ===
        '&NotEqualTilde;',
    )
    expect(multiCodePointEntity.length).toBeGreaterThan(0)
    expect(segments.length).toBeGreaterThan(5)
  })

  it('compresses skipped heading levels into a string-only ancestor path', async () => {
    const source = '# A\n\n### C\n\nparagraph\n'
    const result = await compileDocument({
      articleSlug: 'heading-path',
      source,
      frontmatter: {},
    })
    const paragraph = result.document.root.children[2]!
    const expected = await createStableBlockId({
      headingPath: ['a', 'c'],
      blockType: 'paragraph',
      siblingIndex: 2,
      canonicalText: 'paragraph',
    })

    expect(paragraph.blockId).toBe(expected)
  })

  it('classifies inline raw HTML and unknown custom tags with specific diagnostics', async () => {
    const result = await compileDocument({
      articleSlug: 'inline-html',
      source: 'before <span>raw</span> and <unknown-widget /> after\n',
      frontmatter: {},
    })

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'DOC-PARSE-001',
      'DOC-PARSE-001',
      'DOC-REGISTRY-001',
    ])
  })

  it('recursively compiles paired component fallback as Markdown blocks', async () => {
    const source = [
      '<html-embed id="markdown-fallback" src="./embeds/demo/index.html" title="Demo">',
      'Fallback **bold**.',
      '',
      'Second paragraph.',
      '</html-embed>',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'component-fallback',
      source,
      frontmatter: {},
    })
    const component = result.document.root.children[0]

    expect(result.diagnostics).toEqual([])
    expect(component).toMatchObject({
      type: 'registeredComponent',
      canonicalText: 'Fallback bold.\nSecond paragraph.',
      children: [
        {
          type: 'paragraph',
          children: expect.arrayContaining([
            expect.objectContaining({ type: 'strong' }),
          ]),
        },
        { type: 'paragraph', canonicalText: 'Second paragraph.' },
      ],
    })
  })

  it('keeps invalid ampersands and non-escapable backslashes locally mapped', async () => {
    const source = '前 &未闭合 &amp; 后 \\a \\中 \\*\n'
    const result = await compileDocument({
      articleSlug: 'tokenizer-boundaries',
      source,
      frontmatter: {},
    })
    const paragraph = result.document.root.children[0]!
    const segments = result.document.sourceMap[paragraph.blockId] ?? []
    const mappedPairs = segments.map((segment) => ({
      canonical: paragraph.canonicalText.slice(
        segment.canonicalStart,
        segment.canonicalEnd,
      ),
      source: source.slice(segment.sourceStart, segment.sourceEnd),
    }))

    expect(paragraph.canonicalText).toBe('前 &未闭合 & 后 \\a \\中 *')
    expect(mappedPairs).toEqual(
      expect.arrayContaining([
        { canonical: '未', source: '未' },
        { canonical: '&', source: '&amp;' },
        { canonical: '\\', source: '\\' },
        { canonical: '*', source: '\\*' },
      ]),
    )
    expect(segments.length).toBeGreaterThan(10)
  })

  it('combines paired Markdown fallback inside containers with flexible closing whitespace', async () => {
    const source = [
      '> <html-embed id="nested" src="./x" title="X">',
      '> Fallback **bold**.',
      '>',
      '> Second.',
      '> </html-embed >',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'nested-component',
      source,
      frontmatter: {},
    })
    const quote = result.document.root.children[0]!
    const segments = result.document.sourceMap[quote.blockId] ?? []

    expect(result.diagnostics).toEqual([])
    expect(quote).toMatchObject({
      type: 'quote',
      canonicalText: 'Fallback bold.\nSecond.',
      children: [
        {
          type: 'registeredComponent',
          canonicalText: 'Fallback bold.\nSecond.',
          children: [
            {
              type: 'paragraph',
              children: expect.arrayContaining([
                expect.objectContaining({ type: 'strong' }),
              ]),
            },
            { type: 'paragraph', canonicalText: 'Second.' },
          ],
        },
      ],
    })
    expect(
      segments.every(
        (segment) => segment.canonicalEnd <= quote.canonicalText.length,
      ),
    ).toBe(true)
    const component = quote.type === 'quote' ? quote.children[0] : undefined
    expect(component?.sourceText).toBe(
      source.slice(
        component?.sourceRange.start.offset,
        component?.sourceRange.end.offset,
      ),
    )
  })

  it('removes every outer quote prefix from nested paired fallback', async () => {
    const source = [
      '> > <html-embed id="deep" src="./x" title="X">',
      '> > First.',
      '> >',
      '> > Second.',
      '> > </html-embed>',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'deep-component',
      source,
      frontmatter: {},
    })
    const outer = result.document.root.children[0]
    const inner = outer?.type === 'quote' ? outer.children[0] : undefined
    const component = inner?.type === 'quote' ? inner.children[0] : undefined

    expect(result.diagnostics).toEqual([])
    expect(component).toMatchObject({
      type: 'registeredComponent',
      children: [
        { type: 'paragraph', canonicalText: 'First.' },
        { type: 'paragraph', canonicalText: 'Second.' },
      ],
    })
  })

  it('removes combined quote and list prefixes without losing child source ranges', async () => {
    const source = [
      '> - <html-embed id="mixed" src="./x" title="X">',
      '>   First **bold**.',
      '>  ',
      '>   Second.',
      '>   </html-embed>',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'mixed-component',
      source,
      frontmatter: {},
    })
    const quote = result.document.root.children[0]
    const list = quote?.type === 'quote' ? quote.children[0] : undefined
    const component =
      list?.type === 'list' ? list.children[0]?.children[0] : undefined
    const firstParagraph =
      component?.type === 'registeredComponent'
        ? component.children[0]
        : undefined
    const strong =
      firstParagraph?.type === 'paragraph'
        ? firstParagraph.children.find((node) => node.type === 'strong')
        : undefined

    expect(result.diagnostics).toEqual([])
    expect(component).toMatchObject({
      type: 'registeredComponent',
      children: [
        { type: 'paragraph', canonicalText: 'First bold.' },
        { type: 'paragraph', canonicalText: 'Second.' },
      ],
    })
    expect(
      source.slice(strong?.sourceRange.start.offset, strong?.sourceRange.end.offset),
    ).toBe('**bold**')
  })

  it('does not merge consecutive complete components when closing whitespace differs', async () => {
    const source = [
      '<html-embed id="one" src="./1" title="One">',
      'Fallback.',
      '</html-embed >',
      '',
      '<html-embed id="two" src="./2" title="Two">',
      'Second.',
      '</html-embed>',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'separate-components',
      source,
      frontmatter: {},
    })

    expect(result.diagnostics).toEqual([])
    expect(result.document.root.children).toMatchObject([
      {
        type: 'registeredComponent',
        componentId: 'one',
        canonicalText: 'Fallback.',
      },
      {
        type: 'registeredComponent',
        componentId: 'two',
        canonicalText: 'Second.',
      },
    ])
  })

  it('excludes reference definitions from container canonical text', async () => {
    const source = [
      '> Visible [link][x].',
      '>',
      '> [x]: https://example.com',
      '',
    ].join('\n')
    const result = await compileDocument({
      articleSlug: 'container-definition',
      source,
      frontmatter: {},
    })
    const quote = result.document.root.children[0]!

    expect(result.diagnostics).toEqual([])
    expect(quote).toMatchObject({
      type: 'quote',
      canonicalText: 'Visible link.',
      children: [{ type: 'paragraph', canonicalText: 'Visible link.' }],
    })
  })
})

function flatten(nodes: readonly BlockNode[]): BlockNode[] {
  const result: BlockNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (
      node.type === 'list' ||
      node.type === 'quote' ||
      node.type === 'footnoteDefinition' ||
      node.type === 'registeredComponent'
    ) {
      const children =
        node.type === 'list'
          ? node.children.flatMap((item) => item.children)
          : node.children
      result.push(...flatten(children))
    }
  }
  return result
}

type SemanticNode = { blockId: string; canonicalText: string }

function collectSemanticBlocks(nodes: readonly BlockNode[]): SemanticNode[] {
  const result: SemanticNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.type === 'list') {
      for (const item of node.children) {
        result.push(item)
        result.push(...collectSemanticBlocks(item.children))
      }
    } else if (
      node.type === 'quote' ||
      node.type === 'footnoteDefinition' ||
      node.type === 'registeredComponent'
    ) {
      result.push(...collectSemanticBlocks(node.children))
    } else if (node.type === 'table') {
      for (const row of node.children) result.push(...row.children)
    }
  }
  return result
}
