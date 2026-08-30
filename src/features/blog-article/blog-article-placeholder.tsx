import kitchenSinkAnnotations from '@/features/annotations/__fixtures__/kitchen-sink-annotations.json'
import { toMemoryDiscussionSeed } from '@/features/annotations/__fixtures__/to-memory-seed'
import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
} from '@/features/doc-engine/core'
import { DocumentRenderer } from '@/features/doc-engine/screen/document-renderer'
import { extractOutline } from '@/features/doc-engine/toc'
import { ReaderLayout } from '@/features/reader-layout'
import {
  mirrorArticleSidecarsForDev,
  type AssetManifestEntry,
  type Post,
} from '@/server/content'

export async function BlogArticlePlaceholder({
  assetManifest,
  post,
}: {
  readonly assetManifest: readonly AssetManifestEntry[]
  readonly post: Post
}) {
  const articleAssets = assetManifest.filter(
    (entry) => entry.articleSlug === post.slug,
  )
  const compiled = await compileArticleDocumentWithDiagnostics({
    articleSlug: post.slug,
    assetManifest: articleAssets,
    frontmatter: post.frontmatter,
    source: post.source,
  })
  assertDocumentBuildCanContinue(compiled.diagnostics)
  if (!compiled.document) {
    throw new Error(`文章 ${post.slug} 未生成 Canonical Document。`)
  }
  await mirrorArticleSidecarsForDev(compiled.document)
  const outline = extractOutline(compiled.document)
  return (
    <ReaderLayout
      article={
        <DocumentRenderer
          articleSlug={post.slug}
          document={compiled.document}
          profile="article"
        />
      }
      articleSlug={post.slug}
      description={post.frontmatter.description}
      discussionSeed={
        post.slug === 'p0-kitchen-sink'
          ? toMemoryDiscussionSeed(kitchenSinkAnnotations)
          : undefined
      }
      outline={outline}
      publishedAt={post.frontmatter.publishedAt}
      title={post.frontmatter.title}
    />
  )
}
