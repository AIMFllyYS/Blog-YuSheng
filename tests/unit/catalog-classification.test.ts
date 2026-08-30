import { describe, expect, it } from 'vitest'
import {
  createShelfBooks,
  UNCATEGORIZED_BOOK_SLUG,
} from '../../src/features/blog-index/create-shelf-books'
import { listPublishedPosts, listSections } from '../../src/server/content'
import { IMPORTED_SLUGS } from '../imported-slugs'

/** Keep in lockstep with docs/ops/write-blog.md §1.4 散页名单. */
const DOCUMENTED_LOOSE_SLUGS = ['p0-kitchen-sink'] as const

const LIVE_SECTION_SLUGS = [
  'fullstack-learning',
  'ai-mflly-notes',
  'yu-studies',
  'yu-reflections',
  'yu-reviews',
  'yu-essays',
  'other',
] as const

describe('live catalog classification', () => {
  it('puts every published post in a registered 大方向 or documented 散页', async () => {
    const [posts, sections] = await Promise.all([
      listPublishedPosts(),
      listSections(),
    ])

    expect(sections.map((section) => section.slug)).toEqual([
      ...LIVE_SECTION_SLUGS,
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
    expect(
      books
        .filter((book) => book.slug !== UNCATEGORIZED_BOOK_SLUG)
        .map((book) => book.slug),
    ).toEqual(
      LIVE_SECTION_SLUGS.filter((slug) =>
        posts.some((post) => post.frontmatter.section === slug),
      ),
    )

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

  it('publishes every imported Downloads post into a registered 大方向', async () => {
    const posts = await listPublishedPosts()
    const bySlug = new Map(posts.map((post) => [post.slug, post]))

    for (const slug of IMPORTED_SLUGS) {
      const post = bySlug.get(slug)
      expect(post, slug).toBeDefined()
      if (!post) continue
      expect(post.frontmatter.draft).not.toBe(true)
      expect(post.frontmatter.title.length).toBeGreaterThan(0)
      expect(post.frontmatter.description.length).toBeGreaterThan(0)
      expect(post.frontmatter.publishedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/,
      )
      expect(post.frontmatter.section).toBeDefined()
      expect(LIVE_SECTION_SLUGS).toContain(post.frontmatter.section)
    }

    expect(bySlug.get('developer-vocabulary-handbook')?.frontmatter.section).toBe(
      'yu-studies',
    )
  })
})
