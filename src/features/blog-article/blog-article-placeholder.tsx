import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
} from '@/features/doc-engine/core'
import { DocumentRenderer } from '@/features/doc-engine/screen/document-renderer'
import { extractOutline } from '@/features/doc-engine/toc'
import { ReaderBootVeil, ReaderLayout } from '@/features/reader-layout'
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
  return (
    <>
      <ReaderBootVeil />
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
        description={post.frontmatter.description}
        outline={outline}
        publishedAt={post.frontmatter.publishedAt}
        title={post.frontmatter.title}
      />
    </>
  )
}
