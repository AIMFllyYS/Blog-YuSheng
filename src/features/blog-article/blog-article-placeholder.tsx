import kitchenSinkAnnotations from '@/features/annotations/__fixtures__/kitchen-sink-annotations.json'
import { toMemoryDiscussionSeed } from '@/features/annotations/__fixtures__/to-memory-seed'
import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
} from '@/features/doc-engine/core'
import { DocumentRenderer } from '@/features/doc-engine/screen/document-renderer'
import { buildSelectionIndex } from '@/features/doc-engine/selection'
import { extractOutline } from '@/features/doc-engine/toc'
import { ReaderLayout } from '@/features/reader-layout'
import type { AssetManifestEntry, Post } from '@/server/content'

export async function BlogArticlePlaceholder({
  assetManifest,
  post,
}: {
  readonly assetManifest: readonly AssetManifestEntry[]
  readonly post: Post
}) {
  const compiled = await compileArticleDocumentWithDiagnostics({
    articleSlug: post.slug,
    assetManifest,
    frontmatter: post.frontmatter,
    source: post.source,
  })
  assertDocumentBuildCanContinue(compiled.diagnostics)
  if (!compiled.document) {
    throw new Error(`文章 ${post.slug} 未生成 Canonical Document。`)
  }
  const outline = extractOutline(compiled.document)
  const selectionIndex = buildSelectionIndex(compiled.document)
  return (
    <ReaderLayout
      article={
        <DocumentRenderer
          articleSlug={post.slug}
          assetManifest={assetManifest}
          className="leading-8 text-[var(--ink-muted)]"
          frontmatter={post.frontmatter}
          profile="article"
          source={post.source}
        />
      }
      articleSlug={post.slug}
      assetManifest={assetManifest}
      description={post.frontmatter.description}
      document={compiled.document}
      discussionSeed={
        post.slug === 'p0-kitchen-sink'
          ? toMemoryDiscussionSeed(kitchenSinkAnnotations)
          : undefined
      }
      outline={outline}
      publishedAt={post.frontmatter.publishedAt}
      selectionIndex={selectionIndex}
      title={post.frontmatter.title}
    />
  )
}
