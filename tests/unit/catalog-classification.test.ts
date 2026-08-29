import { describe, expect, it } from 'vitest'
import {
  createShelfBooks,
  UNCATEGORIZED_BOOK_SLUG,
} from '../../src/features/blog-index/create-shelf-books'
import { listPublishedPosts, listSections } from '../../src/server/content'

/** Keep in lockstep with docs/ops/write-blog.md §1.4 散页名单. */
const DOCUMENTED_LOOSE_SLUGS = [
  'hello-world-again',
  'p0-kitchen-sink',
  'site-changelog-2026',
] as const

describe('live catalog classification', () => {
  it('puts every published post in a registered 大方向 or documented 散页', async () => {
    const [posts, sections] = await Promise.all([
      listPublishedPosts(),
      listSections(),
    ])

    expect(sections.map((section) => section.slug)).toEqual([
      'personal-reflections',
      'ai-thinking',
      'tech-thinking',
      'medical-thinking',
    ])

    const loosePublished = posts
      .filter((post) => post.frontmatter.section === undefined)
      .map((post) => post.slug)
      .sort()
    expect(loosePublished).toEqual([...DOCUMENTED_LOOSE_SLUGS].sort())

    const books = createShelfBooks(
      posts.map((post) => ({
        slug: post.slug,
        frontmatter: post.frontmatter,
        characterCount: 1,
        readingMinutes: 1,
      })),
      sections,
    )

    expect(books.length).toBeGreaterThan(0)
    expect(books.every((book) => book.chapters.length > 0)).toBe(true)
    expect(books.some((book) => book.slug === 'medical-thinking')).toBe(true)

    const known = new Set(sections.map((section) => section.slug))
    const seen = new Set<string>()

    for (const book of books) {
      if (book.slug === UNCATEGORIZED_BOOK_SLUG) {
        expect(book.title).toBe('散页')
        expect(book).toBe(books.at(-1))
        expect(book.chapters.map((chapter) => chapter.slug).sort()).toEqual(
          loosePublished,
        )
      } else {
        expect(known.has(book.slug)).toBe(true)
      }

      for (const chapter of book.chapters) {
        expect(chapter.frontmatter.section ?? UNCATEGORIZED_BOOK_SLUG).toBe(
          book.slug,
        )
        seen.add(chapter.slug)
      }

      const published = book.chapters.map((chapter) =>
        Date.parse(chapter.frontmatter.publishedAt),
      )
      expect(published).toEqual(
        [...published].sort((left, right) => left - right),
      )
    }

    expect([...seen].sort()).toEqual(posts.map((post) => post.slug).sort())
  })
})
