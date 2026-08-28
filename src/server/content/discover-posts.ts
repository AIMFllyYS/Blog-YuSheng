import 'server-only'

import { readdir } from 'node:fs/promises'
import { CONTENT_POSTS_ROOT } from './content-paths'
import { readPost, type Post } from './read-post'
import {
  assertKnownSections,
  listSections,
  sectionsPathForPostsRoot,
} from './read-sections'

export type PostSummary = Pick<Post, 'slug' | 'frontmatter' | 'source'>

export async function discoverPostSlugs(postsRoot = CONTENT_POSTS_ROOT) {
  const entries = await readdir(postsRoot, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))
}

export async function readAllPosts(postsRoot = CONTENT_POSTS_ROOT) {
  const slugs = await discoverPostSlugs(postsRoot)
  const posts = await Promise.all(
    slugs.map((slug) => readPost(slug, postsRoot)),
  )
  const sections = await listSections(sectionsPathForPostsRoot(postsRoot))
  assertKnownSections(posts, sections)
  return posts
}

export async function listPublishedPosts(postsRoot = CONTENT_POSTS_ROOT) {
  const posts = await readAllPosts(postsRoot)
  return posts
    .filter((post) => post.frontmatter.draft !== true)
    .sort((left, right) => {
      const byDate =
        Date.parse(right.frontmatter.publishedAt) -
        Date.parse(left.frontmatter.publishedAt)
      return byDate || left.slug.localeCompare(right.slug, 'en')
    })
    .map(({ slug, frontmatter, source }) => ({ slug, frontmatter, source }))
}
