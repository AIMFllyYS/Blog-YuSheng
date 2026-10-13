import 'server-only'

import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { readVisibility } from '../visibility/read-visibility'
import { CONTENT_POSTS_ROOT } from './content-paths'
import { readPost, type Post } from './read-post'
import {
  assertKnownSections,
  assertPublishedSections,
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

export async function listPublishedPosts(
  postsRoot = CONTENT_POSTS_ROOT,
  hiddenSlugs?: readonly string[],
) {
  const posts = await readAllPosts(postsRoot)
  assertPublishedSections(posts)
  const hidden = await hiddenPostSlugs(postsRoot, hiddenSlugs)
  return posts
    .filter((post) => post.frontmatter.draft !== true && !hidden.has(post.slug))
    .sort((left, right) => {
      const byDate =
        Date.parse(right.frontmatter.publishedAt) -
        Date.parse(left.frontmatter.publishedAt)
      return byDate || left.slug.localeCompare(right.slug, 'en')
    })
    .map(({ slug, frontmatter, source }) => ({ slug, frontmatter, source }))
}

async function hiddenPostSlugs(
  postsRoot: string,
  hiddenSlugs: readonly string[] | undefined,
) {
  if (hiddenSlugs) return new Set(hiddenSlugs)
  if (path.resolve(postsRoot) !== path.resolve(CONTENT_POSTS_ROOT)) {
    return new Set<string>()
  }
  return new Set((await readVisibility()).posts)
}
