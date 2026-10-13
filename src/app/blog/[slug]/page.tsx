import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogArticlePlaceholder } from '@/features/blog-article'
import {
  createBlogStaticParams,
  createAssetManifest,
  createPostMetadata,
  mirrorPublishedAssetsForDev,
  readPost,
  transformContentImages,
} from '@/server/content'
import { readVisibility } from '@/server/visibility/read-visibility'

type Props = { params: Promise<{ slug: string }> }

async function isHiddenPost(slug: string) {
  return (await readVisibility()).posts.includes(slug)
}

export const dynamicParams = false

export function generateStaticParams() {
  return createBlogStaticParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (await isHiddenPost(slug)) return { title: '找不到这篇文章' }
  return createPostMetadata(slug)
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params
  if (await isHiddenPost(slug)) notFound()
  const [post, sourceAssetManifest] = await Promise.all([
    readPost(slug),
    createAssetManifest(),
  ])
  const assetManifest = await transformContentImages(sourceAssetManifest)
  const articleAssets = assetManifest.filter((entry) => entry.articleSlug === slug)
  await mirrorPublishedAssetsForDev(articleAssets)
  return <BlogArticlePlaceholder assetManifest={articleAssets} post={post} />
}
