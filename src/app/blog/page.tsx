import { BlogIndex } from '@/features/blog-index'
import { ReaderBootVeil } from '@/features/reader-layout'
import { listPublishedPosts } from '@/server/content'

export default async function BlogPage() {
  return (
    <>
      <ReaderBootVeil />
      <BlogIndex posts={await listPublishedPosts()} />
    </>
  )
}
