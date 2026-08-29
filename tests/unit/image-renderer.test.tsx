import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  compileArticleDocumentWithDiagnostics,
  compileDocument,
  projectResponsiveImageSources,
  renderImageMarkdown,
  renderImageText,
  type BlockImageNode,
} from '../../src/features/doc-engine'
import { ImageScreenRenderer } from '../../src/features/doc-engine/renderers/image/screen-renderer'

const ARTICLE_SLUG = 'image-renderer-unit'
const ORIGINAL_OUTPUT = `blog/${ARTICLE_SLUG}/media/photo.png`
const MANIFEST = [
  imageEntry(ORIGINAL_OUTPUT, `/blog/${ARTICLE_SLUG}/media/photo.png`, 1_200, 'png', false),
  imageEntry('media/image-renderer-unit/photo-480.avif', '/media/image-renderer-unit/photo-480.avif', 480, 'avif', true),
  imageEntry('media/image-renderer-unit/photo-960.avif', '/media/image-renderer-unit/photo-960.avif', 960, 'avif', true),
  imageEntry('media/image-renderer-unit/photo-480.webp', '/media/image-renderer-unit/photo-480.webp', 480, 'webp', true),
  imageEntry('media/image-renderer-unit/photo-960.webp', '/media/image-renderer-unit/photo-960.webp', 960, 'webp', true),
] as const

describe('image renderer', () => {
  it('projects manifest-owned variants into a responsive picture with fixed dimensions', async () => {
    const node = await imageNode(
      '![验收图片](./media/photo.png "构建期响应式图片")',
      MANIFEST,
    )
    const sources = projectResponsiveImageSources(node, ARTICLE_SLUG, MANIFEST)
    const html = renderToStaticMarkup(
      <ImageScreenRenderer
        articleSlug={ARTICLE_SLUG}
        assetManifest={MANIFEST}
        node={node}
        showDetails
      />,
    )

    expect(sources).toMatchObject({
      fallback: `/blog/${ARTICLE_SLUG}/media/photo.png`,
      avifSrcSet:
        '/media/image-renderer-unit/photo-480.avif 480w, /media/image-renderer-unit/photo-960.avif 960w',
      webpSrcSet:
        '/media/image-renderer-unit/photo-480.webp 480w, /media/image-renderer-unit/photo-960.webp 960w',
    })
    expect(html).toContain('<picture>')
    expect(html).toContain('type="image/avif"')
    expect(html).toContain('type="image/webp"')
    expect(html).toContain('width="1200"')
    expect(html).toContain('height="600"')
    expect(html).toContain('<figcaption')
    expect(html).toContain('构建期响应式图片')
    expect(html).toContain('data-selectable="none"')
  })

  it('preserves the original Markdown syntax and emits readable TXT', async () => {
    const source = '![方括号\\]与中文](./media/photo.png "图注")'
    const node = await imageNode(source, MANIFEST)

    expect(renderImageMarkdown(node)).toBe(source)
    expect(renderImageText(node)).toBe('[图片：方括号]与中文]（./media/photo.png）')
  })

  it('percent-encodes manifest URLs before placing them in srcset grammar', async () => {
    const outputPath = `blog/${ARTICLE_SLUG}/media/中文 photo.png`
    const manifest = [
      imageEntry(
        outputPath,
        `/blog/${ARTICLE_SLUG}/media/中文 photo.png`,
        1_200,
        'png',
        false,
      ),
      {
        ...imageEntry(
          'media/image-renderer-unit/中文 photo-480.webp',
          '/media/image-renderer-unit/中文 photo-480.webp',
          480,
          'webp',
          true,
        ),
        derivedFrom: outputPath,
      },
    ]
    const node = await imageNode(
      '![图](./media/%E4%B8%AD%E6%96%87%20photo.png)',
      manifest,
    )

    expect(node).toMatchObject({ width: 1_200, height: 600 })
    expect(projectResponsiveImageSources(node, ARTICLE_SLUG, manifest)).toMatchObject({
      fallback:
        '/blog/image-renderer-unit/media/%E4%B8%AD%E6%96%87%20photo.png',
      webpSrcSet:
        '/media/image-renderer-unit/%E4%B8%AD%E6%96%87%20photo-480.webp 480w',
    })
  })

  it('allows author-hosted HTTPS images without local raster dimensions', async () => {
    const source =
      '![远程封面](https://husteread.com/storage/public/files/blog/demo/cover.webp)'
    const result = await compileArticleDocumentWithDiagnostics({
      articleSlug: ARTICLE_SLUG,
      assetManifest: [],
      frontmatter: {},
      source,
    })
    expect(result.diagnostics.filter((item) => item.buildBlocking)).toEqual([])
    const node = result.document.root.children[0]
    expect(node).toMatchObject({
      type: 'image',
      src: 'https://husteread.com/storage/public/files/blog/demo/cover.webp',
    })
    expect(
      projectResponsiveImageSources(
        node as BlockImageNode,
        ARTICLE_SLUG,
        [],
      ),
    ).toEqual({
      fallback:
        'https://husteread.com/storage/public/files/blog/demo/cover.webp',
    })
  })

  it.each([
    [
      'unlisted HTTPS remote image',
      '![远程图](https://example.com/photo.png)',
      [],
      'DOC-SECURITY-005',
    ],
    [
      'local SVG without raster dimensions',
      '![矢量图](./media/icon.svg)',
      [
        {
          articleSlug: ARTICLE_SLUG,
          outputPath: `blog/${ARTICLE_SLUG}/media/icon.svg`,
          publicUrl: `/blog/${ARTICLE_SLUG}/media/icon.svg`,
        },
      ],
      'DOC-ASSET-006',
    ],
  ])('blocks %s', async (_name, source, manifest, code) => {
    const result = await compileArticleDocumentWithDiagnostics({
      articleSlug: ARTICLE_SLUG,
      assetManifest: manifest,
      frontmatter: {},
      source,
    })

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code,
        buildBlocking: true,
        sourceRange: expect.any(Object),
      }),
    )
  })

  it('registers a real server projection and excludes discussion', async () => {
    const node = await imageNode('![图](./media/photo.png)', MANIFEST)
    const definition = BUILTIN_RENDERER_REGISTRY.get('image')

    expect(definition?.renderScreen(node, { profile: 'article' })).toEqual({
      kind: 'server-screen-projection',
      rendererName: 'image',
      nodeId: node.nodeId,
    })
    expect(definition?.allowedProfiles).toEqual(['article', 'editor-preview'])
    expect(definition?.discussionCandidate).toBe(false)
    expect(definition?.selectable).toBe('none')
  })

  it('reports missing alt as a located warning without blocking article build', async () => {
    const result = await compileArticleDocumentWithDiagnostics({
      articleSlug: ARTICLE_SLUG,
      assetManifest: MANIFEST,
      frontmatter: {},
      source: '![](./media/photo.png)',
    })

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'DOC-ASSET-005',
        severity: 'warning',
        disposition: 'continue',
        buildBlocking: false,
        sourceRange: expect.any(Object),
      }),
    ])
  })
})

async function imageNode(
  source: string,
  assetManifest: readonly unknown[],
): Promise<BlockImageNode> {
  const { document, diagnostics } = await compileDocument({
    articleSlug: ARTICLE_SLUG,
    assetManifest,
    source,
    frontmatter: {},
  })
  expect(diagnostics).toEqual([])
  const node = document.root.children[0]
  if (node?.type !== 'image' || node.placement !== 'block') {
    throw new Error('fixture 未编译为块图片节点')
  }
  return node
}

function imageEntry(
  outputPath: string,
  publicUrl: string,
  width: number,
  format: string,
  derived: boolean,
) {
  return {
    articleSlug: ARTICLE_SLUG,
    outputPath,
    publicUrl,
    ...(derived ? { derivedFrom: ORIGINAL_OUTPUT } : {}),
    image: {
      width,
      height: width / 2,
      format,
      derived,
    },
  }
}
