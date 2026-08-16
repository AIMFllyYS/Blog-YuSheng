import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  compileDocument,
  renderMermaidMarkdown,
  renderMermaidText,
  validateMermaidSource,
  type MermaidNode,
} from '../../src/features/doc-engine'

describe('Mermaid renderer', () => {
  it('registers a browser projection with centralized strict limits', async () => {
    const node = await mermaidNode('flowchart LR\n  A --> B')
    const definition = BUILTIN_RENDERER_REGISTRY.get('mermaid')

    expect(definition?.renderScreen(node, { profile: 'article' })).toEqual({
      kind: 'browser-screen-projection',
      rendererName: 'mermaid',
      nodeId: node.nodeId,
    })
    expect(definition?.renderScreen(node, { profile: 'discussion' })).toEqual({
      kind: 'browser-screen-projection',
      rendererName: 'mermaid',
      nodeId: node.nodeId,
    })
    expect(definition?.security).toMatchObject({
      trustLevel: 'native',
      allowsScript: false,
      allowsExternalResource: false,
      maxSourceLength: 5_000,
      maxInstancesPerDocument: 3,
    })
    expect(definition?.selectable).toBe('none')
  })

  it('round-trips fenced Markdown and explains source in TXT', async () => {
    const node = await mermaidNode('flowchart TD\n  A[```] --> B')
    const markdown = renderMermaidMarkdown(node)
    const reparsed = await mermaidNode(markdown)

    expect(markdown.startsWith('````mermaid\n')).toBe(true)
    expect(reparsed.value).toBe(node.value)
    expect(renderMermaidText(node)).toBe(
      `【Mermaid 图表源码】\n${node.value}`,
    )
  })

  it.each([
    ['click directive', 'flowchart TD\nclick A href "https://evil.example"'],
    ['configuration override', '%%{init: {"securityLevel": "loose"}}%%\nflowchart TD'],
    ['external URL', 'flowchart TD\nA[https://evil.example]'],
    ['CSS URL', 'flowchart TD\nstyle A fill:url(//evil.example/x)'],
    ['protocol-relative URL', 'flowchart TD\nA[//evil.example/x]'],
    ['oversized source', 'A'.repeat(5_001)],
  ])('rejects %s before browser execution', (_name, source) => {
    expect(validateMermaidSource(source)).toBeDefined()
  })
})

async function mermaidNode(sourceOrFence: string): Promise<MermaidNode> {
  const source = sourceOrFence.startsWith('`')
    ? sourceOrFence
    : '```mermaid\n' + sourceOrFence + '\n```'
  const { document, diagnostics } = await compileDocument({
    articleSlug: 'mermaid-renderer-unit',
    source,
    frontmatter: {},
  })
  expect(diagnostics).toEqual([])
  const node = document.root.children[0]
  if (node?.type !== 'mermaid') throw new Error('fixture 未编译为 Mermaid node')
  return node
}
