import 'server-only'

import path from 'node:path'

export const CONTENT_POSTS_ROOT = path.join(process.cwd(), 'content', 'posts')
export const CONTENT_SECTIONS_PATH = path.join(
  process.cwd(),
  'content',
  'sections.yml',
)

export function getArticlePackageRoot(slug: string, postsRoot = CONTENT_POSTS_ROOT) {
  return path.join(postsRoot, slug)
}
