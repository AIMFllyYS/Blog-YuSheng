import { BlogIndex } from '@/features/blog-index'
import { listPublishedPosts } from '@/server/content'

export default async function BlogPage() {
  return <BlogIndex posts={await listPublishedPosts()} />
}
