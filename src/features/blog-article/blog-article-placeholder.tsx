import { DocumentRenderer } from '@/features/doc-engine/screen/document-renderer'
import { ReaderBootVeil, ReaderLayout } from '@/features/reader-layout'
import type { AssetManifestEntry, Post } from '@/server/content'

export function BlogArticlePlaceholder({
  assetManifest,
  post,
}: {
  readonly assetManifest: readonly AssetManifestEntry[]
  readonly post: Post
}) {
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
        description={post.frontmatter.description}
        publishedAt={post.frontmatter.publishedAt}
      />
    </>
  )
}
