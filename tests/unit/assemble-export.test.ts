import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileArticleDocument } from '../../src/features/doc-engine'
import { assembleExport } from '../../src/features/export-service'
import {
  createAssetManifest,
  readPost,
  transformContentImages,
} from '../../src/server/content'

const KITCHEN_SINK_INDEX = path.join(
  process.cwd(),
  'content/posts/p0-kitchen-sink/index.md',
)

async function compileKitchenSink() {
  const post = await readPost('p0-kitchen-sink')
  const manifest = await transformContentImages(
    await createAssetManifest(),
    path.join(process.cwd(), '.tmp', 'export-image-cache'),
  )
  const document = await compileArticleDocument({
    articleSlug: post.slug,
    assetManifest: manifest,
    frontmatter: post.frontmatter,
    source: post.source,
  })
  return { document, post }
}

describe('assemble body-only Markdown from original source', () => {
  it('returns the kitchen-sink index.md byte-for-byte and freezes the Export IR', async () => {
    const { document, post } = await compileKitchenSink()
    const originalSource = document.originalSource
    const generatedAt = '2026-08-17T00:00:00.000Z'

    const result = assembleExport({
      document,
      format: 'markdown',
      generatedAt,
      scope: 'body-only',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.document)).toEqual([
      'schemaVersion',
      'articleSlug',
      'scope',
      'generatedAt',
      'body',
    ])
    expect(result.document).toEqual({
      schemaVersion: 1,
      articleSlug: 'p0-kitchen-sink',
      scope: 'body-only',
      generatedAt,
      body: { originalSource },
    })
    expect(Object.isFrozen(result.document)).toBe(true)
    expect(Object.isFrozen(result.document.body)).toBe(true)
    expect(result.artifact.filename).toBe('p0-kitchen-sink.md')
    expect(result.artifact.mimeType).toBe('text/markdown;charset=utf-8')
    expect(
      Buffer.compare(
        readFileSync(KITCHEN_SINK_INDEX),
        Buffer.from(result.artifact.bytes),
      ),
    ).toBe(0)
    expect(document.originalSource).toBe(originalSource)
    expect(document.originalSource).toBe(post.source)
  })

  it('rejects discussion scopes and DOCX/PDF with explicit diagnostics', async () => {
    const { document } = await compileKitchenSink()
    const originalSource = document.originalSource

    expect(
      assembleExport({
        document,
        format: 'markdown',
        scope: 'body-with-annotations',
      }),
    ).toEqual({
      ok: false,
      reason: 'unsupported-scope',
      message: '该内容范围随后续版本开放',
    })
    expect(
      assembleExport({
        document,
        format: 'markdown',
        scope: 'body-with-comments',
      }),
    ).toMatchObject({ ok: false, reason: 'unsupported-scope' })
    expect(
      assembleExport({
        document,
        format: 'markdown',
        scope: 'body-with-all-discussions',
      }),
    ).toMatchObject({ ok: false, reason: 'unsupported-scope' })
    expect(
      assembleExport({ document, format: 'docx', scope: 'body-only' }),
    ).toEqual({
      ok: false,
      reason: 'unsupported-format',
      message: 'DOCX 导出随后续版本开放',
    })
    expect(
      assembleExport({ document, format: 'pdf', scope: 'body-only' }),
    ).toEqual({
      ok: false,
      reason: 'unsupported-format',
      message: 'PDF 导出随后续版本开放',
    })
    expect(document.originalSource).toBe(originalSource)
  })
})
