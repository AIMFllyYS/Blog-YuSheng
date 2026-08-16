import Link from 'next/link'
import { DocumentRenderer } from '@/features/doc-engine/screen/document-renderer'
import type { AssetManifestEntry, Post } from '@/server/content'

export function BlogArticlePlaceholder({
  assetManifest,
  post,
}: {
  readonly assetManifest: readonly AssetManifestEntry[]
  readonly post: Post
}) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-16 text-[var(--ink)] md:px-10 md:py-24">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm text-[var(--accent)]" href="/blog/">
          ← 返回博客
        </Link>
        <header className="mt-12 border-y border-[var(--line)] py-12">
          <p className="text-sm text-[var(--ink-faint)]">
            {post.frontmatter.publishedAt}
          </p>
          <p className="mt-5 max-w-2xl leading-8 text-[var(--ink-muted)]">
            {post.frontmatter.description}
          </p>
        </header>
        <DocumentRenderer
          articleSlug={post.slug}
          assetManifest={assetManifest}
          className="mt-12 leading-8 text-[var(--ink-muted)]"
          frontmatter={post.frontmatter}
          profile="article"
          source={post.source}
        />
      </div>
    </main>
  )
}
