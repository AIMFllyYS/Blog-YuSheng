import type { Metadata } from 'next'
import { BlogArticlePlaceholder } from '@/features/blog-article'
import {
  createBlogStaticParams,
  createAssetManifest,
  createPostMetadata,
  mirrorPublishedAssetsForDev,
  readPost,
  transformContentImages,
} from '@/server/content'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return createBlogStaticParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return createPostMetadata(slug)
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params
  const [post, sourceAssetManifest] = await Promise.all([
    readPost(slug),
    createAssetManifest(),
  ])
  const assetManifest = await transformContentImages(sourceAssetManifest)
  const articleAssets = assetManifest.filter((entry) => entry.articleSlug === slug)
  await mirrorPublishedAssetsForDev(articleAssets)
  return <BlogArticlePlaceholder assetManifest={articleAssets} post={post} />
}
