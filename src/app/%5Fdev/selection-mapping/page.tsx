import path from 'node:path'
import { notFound } from 'next/navigation'

import { SelectionMappingProbe } from '@/features/annotations/selection/selection-mapping-probe'
import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
} from '@/features/doc-engine/core'
import { DocumentRenderer } from '@/features/doc-engine'
import { buildSelectionIndex } from '@/features/doc-engine/selection'
import { createAssetManifest, readPost, transformContentImages } from '@/server/content'

export default async function SelectionMappingFixturePage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const post = await readPost('p0-kitchen-sink')
  const assetManifest = await transformContentImages(
    await createAssetManifest(),
    path.join(process.cwd(), '.tmp', 'compiler-image-cache'),
  )
  const compiled = await compileArticleDocumentWithDiagnostics({
    articleSlug: post.slug,
    assetManifest,
    frontmatter: post.frontmatter,
    source: post.source,
  })
  assertDocumentBuildCanContinue(compiled.diagnostics)
  if (!compiled.document) {
    throw new Error('p0-kitchen-sink 未生成 Canonical Document。')
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-10 text-[var(--ink)] md:px-10">
      <h1 className="mb-6 text-lg font-semibold">Selection 映射探针（_dev）</h1>
      <SelectionMappingProbe index={buildSelectionIndex(compiled.document)}>
        <DocumentRenderer
          articleSlug={post.slug}
          assetManifest={assetManifest}
          className="leading-8 text-[var(--ink-muted)]"
          frontmatter={post.frontmatter}
          profile="article"
          source={post.source}
        />
      </SelectionMappingProbe>
    </main>
  )
}
