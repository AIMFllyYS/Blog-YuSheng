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
      Object.fromEntries(
        books.map((book) => [book.slug, book.chapters.length]),
      ),
    ).toEqual({
      'fullstack-learning': 4,
      'ai-mflly-notes': 2,
      'yu-studies': 1,
      'yu-reflections': 1,
      'yu-reviews': 7,
      'yu-essays': 11,
      other: 4,
      [UNCATEGORIZED_BOOK_SLUG]: 1,
    })
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

  it('keeps the final reclassification and the July review stable', async () => {
    const posts = await listPublishedPosts()
    const bySlug = new Map(posts.map((post) => [post.slug, post]))

    expect(bySlug.get('ai-deep-learning-plan')?.frontmatter.section).toBe(
      'yu-reviews',
    )
    expect(bySlug.get('agent-principles-and-trends')?.frontmatter.section).toBe(
      'fullstack-learning',
    )
    expect(bySlug.get('personal-finance-and-ai-dev')?.frontmatter.section).toBe(
      'yu-reviews',
    )
    expect(bySlug.get('med-student-coding-and-health')?.frontmatter.section).toBe(
      'yu-reviews',
    )
    expect(bySlug.get('when-energy-runs-low')?.frontmatter.section).toBe('yu-reviews')
    expect(bySlug.get('september-ninth-new-self')?.frontmatter.section).toBe('yu-reviews')
    expect(bySlug.get('july-28-ai-frontier-review')?.frontmatter.section).toBe(
      'yu-reviews',
    )
  })

  it('locks the requested title archive and personal-finance date', async () => {
    const posts = await listPublishedPosts()
    const bySlug = new Map(posts.map((post) => [post.slug, post]))
    const expected = {
      'when-we-talk-about-ai-coding': 'AI编程范式笔记·羽升手记01-v0.3',
      'ai-deep-learning-plan': '25-12-9 AI 深度学习计划',
      'open-models-and-watermarks': '26-8-15 复盘 · 开源模型廉价智能和水印',
      'agent-principles-and-trends': 'Agent的简单理解',
      'personal-finance-and-ai-dev': '26-8-26 个人财务复盘',
      'when-energy-runs-low': '25-8-4 复盘 · 能量低的那天',
      'september-ninth-new-self': '25-9-9 复盘 · 九月九日新的自己',
      'october-busy-and-growth': '25年10月复盘 · 认知、忙碌、成长',
      'july-28-ai-frontier-review': '26-7-28 复盘 · AI方向如是状态',
      'editing-quantity-to-quality': '剪辑&质变与量变的简单理解',
      'med-student-coding-and-health': '26-2-19 复盘 · 医学生转码血泪史｜注意身体',
    } as const
    for (const [slug, title] of Object.entries(expected)) {
      expect(bySlug.get(slug)?.frontmatter.title, slug).toBe(title)
    }
    expect(bySlug.get('personal-finance-and-ai-dev')?.frontmatter.publishedAt).toBe(
      '2026-08-26T00:00:00+08:00',
    )
    expect(bySlug.get('july-28-ai-frontier-review')?.frontmatter.publishedAt).toBe(
      '2026-07-28T00:00:00+08:00',
    )
  })
})
