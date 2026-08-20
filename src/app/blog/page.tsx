import { BlogIndex, createBlogIndexEntries } from '@/features/blog-index'
import { listPublishedPosts } from '@/server/content'

export default async function BlogPage() {
  const posts = await listPublishedPosts()

  return <BlogIndex posts={await createBlogIndexEntries(posts)} />
}
