import 'server-only'

import { compileDocument } from '../doc-engine/core'
import { extractOutline } from '../doc-engine/toc'
import type { PostSummary } from '../../server/content/discover-posts'

const READING_GRAPHEMES_PER_MINUTE = 500

export type BlogIndexEntry = Pick<PostSummary, 'slug' | 'frontmatter'> & {
  readonly characterCount: number
  readonly readingMinutes: number
}

export async function createBlogIndexEntries(
  posts: readonly PostSummary[],
): Promise<readonly BlogIndexEntry[]> {
  return Promise.all(posts.map(createBlogIndexEntry))
}

async function createBlogIndexEntry(
  post: PostSummary,
): Promise<BlogIndexEntry> {
  const { document } = await compileDocument({
    articleSlug: post.slug,
    source: post.source,
    frontmatter: post.frontmatter,
  })
  const outline = extractOutline(document)
  const characterCount = outline.characterCount

  return Object.freeze({
    slug: post.slug,
    frontmatter: post.frontmatter,
    characterCount,
    readingMinutes: estimateReadingMinutes(characterCount),
  })
}

export function estimateReadingMinutes(characterCount: number): number {
  return Math.max(
    1,
    Math.ceil(Math.max(0, characterCount) / READING_GRAPHEMES_PER_MINUTE),
  )
}
