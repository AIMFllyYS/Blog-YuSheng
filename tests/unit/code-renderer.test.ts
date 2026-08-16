import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  compileDocument,
  renderCodeMarkdown,
  renderCodeText,
  type CodeNode,
} from '../../src/features/doc-engine'
import { highlightCode } from '../../src/features/doc-engine/renderers/code/highlight-code.server'

describe('code renderer', () => {
  it('highlights a long TypeScript fixture on the server with token colors', async () => {
    const source = [
      '// 中文注释',
      'export const message: string = "这是一条很长的代码".repeat(20)',
    ].join('\n')
    const highlighted = await highlightCode(source, 'ts')

    expect(highlighted.knownLanguage).toBe(true)
    expect(highlighted.lines).toHaveLength(2)
    expect(highlighted.lines.flat().map((token) => token.content).join('')).toBe(
      source.replace('\n', ''),
    )
    expect(highlighted.lines.flat().every((token) => token.color.startsWith('var(--'))).toBe(true)
    expect(
      highlighted.lines.flat().some((token) => token.color === 'var(--ink-faint)'),
    ).toBe(true)
  })

  it('falls back to escaped plain tokens for an unknown language', async () => {
    const source = '<script>alert("不会执行")</script>'
    const highlighted = await highlightCode(source, 'not-a-runtime-language')

    expect(highlighted).toMatchObject({
      language: 'not-a-runtime-language',
      knownLanguage: false,
    })
    expect(highlighted.lines.flat().map((token) => token.content).join('')).toBe(source)
  })

  it('projects fenced Markdown and keeps the same fence in TXT', async () => {
    const node = await codeNode('const fence = ```value```', 'ts')

    expect(renderCodeMarkdown(node)).toBe(
      '````ts\nconst fence = ```value```\n````',
    )
    expect(renderCodeText(node)).toBe(
      '````ts\nconst fence = ```value```\n````',
    )
  })

  it('round-trips a legal tilde-fence language containing a backtick', async () => {
    const original = await codeNodeWithFence('x\n~~~\ny', 'js`evil', '~')
    const projected = renderCodeMarkdown(original)
    const { document, diagnostics } = await compileDocument({
      articleSlug: 'code-round-trip',
      source: projected,
      frontmatter: {},
    })
    const reparsed = document.root.children[0]

    expect(projected.startsWith('~~~~js`evil\n')).toBe(true)
    expect(diagnostics).toEqual([])
    expect(reparsed).toMatchObject({
      type: 'code',
      language: original.language,
      value: original.value,
    })
  })

  it('never writes CR/LF from an external language value into a fence line', async () => {
    const node = await codeNode('safe', 'ts')
    const projected = renderCodeMarkdown({
      ...node,
      language: 'ts\r\n# escaped heading',
    })

    expect(projected).toBe('```\nsafe\n```')
  })

  it('registers real screen and Markdown/TXT projection capabilities', async () => {
    const node = await codeNode('const answer = 42', 'ts')
    const definition = BUILTIN_RENDERER_REGISTRY.get('code')

    expect(definition?.renderScreen(node, { profile: 'article' })).toEqual({
      kind: 'server-screen-projection',
      nodeId: node.nodeId,
      rendererName: 'code',
    })
    expect(definition?.renderMarkdown?.(node, { profile: 'article', format: 'markdown' })).toBe(
      '```ts\nconst answer = 42\n```',
    )
    expect(definition?.renderText?.(node, { profile: 'article', format: 'text' })).toBe(
      '```ts\nconst answer = 42\n```',
    )
  })
})

async function codeNode(value: string, language?: string): Promise<CodeNode> {
  const fence = '`'.repeat(Math.max(3, longestBacktickRun(value) + 1))
  return codeNodeFromSource(`${fence}${language ?? ''}\n${value}\n${fence}`)
}

async function codeNodeWithFence(
  value: string,
  language: string,
  marker: '~',
): Promise<CodeNode> {
  const fence = marker.repeat(Math.max(3, longestMarkerRun(value, marker) + 1))
  return codeNodeFromSource(`${fence}${language}\n${value}\n${fence}`)
}

async function codeNodeFromSource(source: string): Promise<CodeNode> {
  const { document, diagnostics } = await compileDocument({
    articleSlug: 'code-renderer-unit',
    source,
    frontmatter: {},
  })
  expect(diagnostics).toEqual([])
  const node = document.root.children[0]
  if (node?.type !== 'code') throw new Error('fixture 未编译为 code node')
  return node
}

function longestBacktickRun(value: string): number {
  return Math.max(0, ...Array.from(value.matchAll(/`+/gu), (match) => match[0].length))
}

function longestMarkerRun(value: string, marker: '~'): number {
  return Math.max(0, ...Array.from(value.matchAll(/~+/gu), (match) => match[0].length))
}
