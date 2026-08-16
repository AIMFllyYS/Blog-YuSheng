import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  compileArticleDocumentWithDiagnostics,
  compileDocument,
  renderKatexMarkdown,
  renderKatexText,
  type MathNode,
} from '../../src/features/doc-engine'
import { renderKatexToHtml } from '../../src/features/doc-engine/renderers/katex/render-katex.server'

describe('KaTeX renderer', () => {
  it('renders trusted local HTML and MathML with locked options', () => {
    const result = renderKatexToHtml('E = mc^2', false)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.html).toContain('class="katex"')
    expect(result.html).toContain('<math')
    expect(result.html).not.toContain('<script')
  })

  it.each([
    ['invalid TeX', '\\frac{'],
    ['user macro recursion', '\\def\\loop{\\loop}\\loop'],
    ['untrusted URL command', '\\href{javascript:alert(1)}{x}'],
  ])('fails closed for %s', (_name, source) => {
    const result = renderKatexToHtml(source, false)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message.length).toBeGreaterThan(0)
  })

  it('escapes source text instead of treating it as HTML', () => {
    const result = renderKatexToHtml('\\text{<script>alert(1)</script>}', false)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;')
  })

  it('projects inline and display nodes from original TeX', async () => {
    const inline = await mathNode('inline $E = mc^2$', false)
    const display = await mathNode('$$\n\\frac{1}{3}\n$$', true)

    expect(renderKatexMarkdown(inline)).toBe('$E = mc^2$')
    expect(renderKatexText(inline)).toBe('E = mc^2')
    expect(renderKatexMarkdown(display)).toBe('$$\n\\frac{1}{3}\n$$')
    expect(renderKatexText(display)).toBe('\\frac{1}{3}')
  })

  it('registers a server projection consumed by DocumentRenderer', async () => {
    const node = await mathNode('$x^2$', false)
    const definition = BUILTIN_RENDERER_REGISTRY.get('katex')

    expect(definition?.renderScreen(node, { profile: 'article' })).toEqual({
      kind: 'server-screen-projection',
      rendererName: 'katex',
      nodeId: node.nodeId,
    })
    expect(definition?.renderScreen(node, { profile: 'discussion' })).toEqual({
      kind: 'browser-screen-projection',
      rendererName: 'katex',
      nodeId: node.nodeId,
    })
    expect(definition?.security).toMatchObject({
      trustLevel: 'native',
      allowsScript: false,
      allowsExternalResource: false,
      maxSourceLength: 2_000,
    })
  })

  it('adds a localized non-blocking diagnostic for invalid TeX syntax', async () => {
    const source = [
      '---',
      'title: Invalid KaTeX',
      '---',
      '',
      '公式前。$\\frac{$ 公式后。',
    ].join('\n')
    const result = await compileArticleDocumentWithDiagnostics({
      articleSlug: 'invalid-katex',
      source,
      frontmatter: { title: 'Invalid KaTeX' },
    })

    const diagnostic = result.diagnostics.find(
      (candidate) => candidate.code === 'DOC-RENDER-003',
    )
    expect(diagnostic).toMatchObject({
      code: 'DOC-RENDER-003',
      buildBlocking: false,
      articleSlug: 'invalid-katex',
      nodeId: expect.any(String),
      sourceRange: {
        start: expect.objectContaining({ offset: expect.any(Number) }),
        end: expect.objectContaining({ offset: expect.any(Number) }),
      },
    })
    expect(diagnostic?.sourceRange?.start.offset).toBeLessThan(
      diagnostic?.sourceRange?.end.offset ?? 0,
    )
    expect(diagnostic?.sourceRange).toBeDefined()
    if (diagnostic?.sourceRange) {
      expect(
        source.slice(
          diagnostic.sourceRange.start.offset,
          diagnostic.sourceRange.end.offset,
        ),
      ).toBe('$\\frac{$')
    }
    expect(result.document.originalSource).toBe(source)
  })
})

async function mathNode(source: string, display: boolean): Promise<MathNode> {
  const { document, diagnostics } = await compileDocument({
    articleSlug: 'katex-renderer-unit',
    source,
    frontmatter: {},
  })
  expect(diagnostics).toEqual([])
  const candidates = flatten(document.root.children)
  const node = candidates.find(
    (candidate): candidate is MathNode =>
      candidate.type === 'math' && candidate.display === display,
  )
  if (!node) throw new Error('fixture 未编译为预期 math node')
  return node
}

function flatten(nodes: readonly import('../../src/features/doc-engine').DocumentNode[]) {
  const result: import('../../src/features/doc-engine').DocumentNode[] = []
  for (const node of nodes) {
    result.push(node)
    if ('children' in node) result.push(...flatten(node.children))
  }
  return result
}
