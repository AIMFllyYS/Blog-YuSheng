import type { Metadata } from 'next'
import { BlogArticlePlaceholder } from '@/features/blog-article'
import {
  createBlogStaticParams,
  createAssetManifest,
  createPostMetadata,
  readPost,
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
  const [post, assetManifest] = await Promise.all([
    readPost(slug),
    createAssetManifest(),
  ])
  return <BlogArticlePlaceholder assetManifest={assetManifest} post={post} />
}
