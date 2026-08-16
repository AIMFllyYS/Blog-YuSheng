import { BlogIndex, createBlogIndexEntries } from '@/features/blog-index'
import { ReaderBootVeil } from '@/features/reader-layout'
import { listPublishedPosts } from '@/server/content'

export default async function BlogPage() {
  const posts = await listPublishedPosts()

  return (
    <>
      <ReaderBootVeil />
      <BlogIndex posts={await createBlogIndexEntries(posts)} />
    </>
  )
}
