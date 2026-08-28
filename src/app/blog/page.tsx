import {
  BlogIndex,
  createBlogIndexEntries,
  createShelfBooks,
} from '@/features/blog-index'
import { listPublishedPosts, listSections } from '@/server/content'

export default async function BlogPage() {
  const [posts, sections] = await Promise.all([
    listPublishedPosts(),
    listSections(),
  ])

  return (
    <BlogIndex
      books={createShelfBooks(await createBlogIndexEntries(posts), sections)}
      totalPosts={posts.length}
    />
  )
}
