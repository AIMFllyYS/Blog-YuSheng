import 'server-only'

import { CONTENT_POSTS_ROOT } from './content-paths'
import { listPublishedPosts } from './discover-posts'

export async function createBlogStaticParams(postsRoot = CONTENT_POSTS_ROOT) {
  const posts = await listPublishedPosts(postsRoot)
  return posts.map(({ slug }) => ({ slug }))
}
