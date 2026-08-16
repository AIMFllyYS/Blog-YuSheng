import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  compileDocument,
  projectPackageMediaUrl,
  projectRendererNode,
  type RegisteredComponentNode,
} from '../../src/features/doc-engine'
import { SvgScreenRenderer } from '../../src/features/doc-engine/renderers/svg/screen-renderer'
import { sanitizeSvgSource } from '../../src/server/content'

const ARTICLE_SLUG = 'svg-renderer-unit'
const SOURCE =
  '<svg-embed id="safe" src="./media/svg/safe.svg" title="安全流程图" />'
const MANIFEST = [
  {
    articleSlug: ARTICLE_SLUG,
    outputPath: `blog/${ARTICLE_SLUG}/media/svg/safe.svg`,
    publicUrl: `/blog/${ARTICLE_SLUG}/media/svg/safe.svg`,
  },
] as const

describe('svg renderer', () => {
  it('sanitizes the golden SVG through a strict build-time projection', async () => {
    const source = await readFile(
      path.join(
        process.cwd(),
        'content/posts/p0-kitchen-sink/media/svg/safe-diagram.svg',
      ),
      'utf8',
    )
    const result = sanitizeSvgSource(source)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.reason)
    expect(result.value).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg"',
    )
    expect(result.value).toContain('<linearGradient id="ink"')
    expect(result.value).not.toMatch(/<script|onload=|foreignObject|evil\.example/i)
  })

  it.each([
    ['script', '<script>alert(1)</script>'],
    ['event attribute', '<rect onload="alert(1)" />'],
    ['foreignObject', '<foreignObject><p>unsafe</p></foreignObject>'],
    ['external image', '<image href="https://evil.example/x.png" />'],
    ['dangerous protocol', '<path fill="url(javascript:alert(1))" />'],
    ['inline style', '<rect style="background:url(https://evil.example)" />'],
    ['filter', '<filter id="f"><feGaussianBlur stdDeviation="9" /></filter>'],
    ['namespace bypass', '<g:script>alert(1)</g:script>'],
    ['doctype', '<!DOCTYPE svg><path />'],
    ['oversized path', `<path d="${'M0 0'.repeat(2_001)}" />`],
  ])('rejects malicious %s SVG input', (_, payload) => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg">${payload}</svg>`
    expect(sanitizeSvgSource(source)).toEqual(
      expect.objectContaining({ ok: false }),
    )
  })

  it('registers one safe resource projection for screen, Markdown, and TXT', async () => {
    const node = await svgNode()
    const definition = BUILTIN_RENDERER_REGISTRY.get('svg-embed')!

    expect(definition.allowedProfiles).toEqual(['article', 'editor-preview'])
    expect(definition.discussionCandidate).toBe(false)
    expect(definition.security).toEqual({
      trustLevel: 'registered',
      allowsScript: false,
      allowsExternalResource: false,
    })
    expect(definition.collectAssets(node)).toEqual([
      { source: './media/svg/safe.svg', kind: 'local', attribute: 'src' },
    ])
    expect(definition.renderScreen(node, { profile: 'article' })).toEqual({
      kind: 'server-screen-projection',
      rendererName: 'svg-embed',
      nodeId: node.nodeId,
    })
    expect(projectRendererNode(definition, 'markdown', node).value).toBe(SOURCE)
    expect(projectRendererNode(definition, 'text', node).value).toBe(
      '【SVG】安全流程图：./media/svg/safe.svg',
    )
  })

  it('renders only an isolated img resource in the shared image card', async () => {
    const node = await svgNode()
    const src = projectPackageMediaUrl(
      String(node.attributes.src),
      ARTICLE_SLUG,
      MANIFEST,
    )
    const html = renderToStaticMarkup(
      <SvgScreenRenderer
        node={node}
        showDetails
        src={src}
        title="安全流程图"
      />,
    )

    expect(html).toContain('data-svg-renderer="sanitized-image"')
    expect(html).toContain('<img')
    expect(html).toContain(`src="${src}"`)
    expect(html).not.toContain('<svg')
    expect(html).toContain('data-selectable="none"')
    expect(html).toContain('安全流程图')
  })
})

async function svgNode(): Promise<RegisteredComponentNode> {
  const { document, diagnostics } = await compileDocument({
    articleSlug: ARTICLE_SLUG,
    assetManifest: MANIFEST,
    frontmatter: {},
    source: SOURCE,
  })
  expect(diagnostics).toEqual([])
  const node = document.root.children[0]
  if (node?.type !== 'registeredComponent' || node.name !== 'svg-embed') {
    throw new Error('fixture 未编译为 SVG 组件')
  }
  return node
}
