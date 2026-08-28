import { describe, expect, it } from 'vitest'
import type { BlogIndexEntry } from '../../src/features/blog-index/create-blog-index-entries'
import {
  createShelfBooks,
  UNCATEGORIZED_BOOK_SLUG,
} from '../../src/features/blog-index/create-shelf-books'
import type { SectionDefinition } from '../../src/server/content/read-sections'

const SECTIONS: readonly SectionDefinition[] = [
  { slug: 'personal-reflections', title: '个人感悟', order: 10 },
  { slug: 'ai-thinking', title: 'AI 时代思考', order: 20 },
  { slug: 'tech-thinking', title: '技术思考', order: 30 },
]

function entry(
  slug: string,
  publishedAt: string,
  characterCount: number,
  section?: string,
): BlogIndexEntry {
  return {
    slug,
    frontmatter: {
      schemaVersion: 1,
      title: `标题 ${slug}`,
      description: `摘要 ${slug}`,
      publishedAt,
      ...(section ? { section } : {}),
    },
    characterCount,
    readingMinutes: Math.max(1, Math.ceil(characterCount / 500)),
  }
}

describe('shelf books grouping', () => {
  it('groups entries into ordered books and ascending chapters', () => {
    const books = createShelfBooks(
      [
        entry('ai-new', '2026-03-01T00:00:00+08:00', 1000, 'ai-thinking'),
        entry('life-old', '2026-01-01T00:00:00+08:00', 500, 'personal-reflections'),
        entry('ai-old', '2026-02-01T00:00:00+08:00', 1500, 'ai-thinking'),
      ],
      SECTIONS,
    )

    expect(books.map((book) => book.slug)).toEqual([
      'personal-reflections',
      'ai-thinking',
    ])
    const aiBook = books[1]
    expect(aiBook?.title).toBe('AI 时代思考')
    expect(aiBook?.chapters.map((chapter) => chapter.slug)).toEqual([
      'ai-old',
      'ai-new',
    ])
    expect(aiBook?.totalCharacters).toBe(2500)
    expect(aiBook?.totalReadingMinutes).toBe(5)
  })

  it('keeps sectionless entries in a trailing uncategorized book', () => {
    const books = createShelfBooks(
      [
        entry('tech-post', '2026-01-01T00:00:00+08:00', 800, 'tech-thinking'),
        entry('loose-post', '2026-02-01T00:00:00+08:00', 300),
      ],
      SECTIONS,
    )

    expect(books.map((book) => book.slug)).toEqual([
      'tech-thinking',
      UNCATEGORIZED_BOOK_SLUG,
    ])
    expect(books[1]?.title).toBe('散页')
  })

  it('omits registered sections that have no chapters yet', () => {
    const books = createShelfBooks(
      [entry('ai-post', '2026-01-01T00:00:00+08:00', 800, 'ai-thinking')],
      SECTIONS,
    )

    expect(books.map((book) => book.slug)).toEqual(['ai-thinking'])
  })

  it('maps spine width linearly to total characters between 3rem and 6.5rem', () => {
    const books = createShelfBooks(
      [
        entry('thin-post', '2026-01-01T00:00:00+08:00', 200, 'personal-reflections'),
        entry('thick-post', '2026-01-02T00:00:00+08:00', 4200, 'ai-thinking'),
        entry('mid-post', '2026-01-03T00:00:00+08:00', 2200, 'tech-thinking'),
      ],
      SECTIONS,
    )

    const [thin, thick, mid] = books
    expect(thin?.widthRem).toBe(3)
    expect(thick?.widthRem).toBe(6.5)
    expect(mid?.widthRem).toBeCloseTo(4.75, 5)
    for (const book of books) {
      expect(book.heightRem).toBeGreaterThanOrEqual(16)
      expect(book.heightRem).toBeLessThan(18)
    }
  })

  it('gives a single book a neutral mid width', () => {
    const books = createShelfBooks(
      [entry('only-post', '2026-01-01T00:00:00+08:00', 900)],
      SECTIONS,
    )

    expect(books).toHaveLength(1)
    expect(books[0]?.widthRem).toBe(4.75)
  })

  it('returns an empty shelf when there are no posts at all', () => {
    expect(createShelfBooks([], SECTIONS)).toEqual([])
  })

  it('passes through the registered section color', () => {
    const books = createShelfBooks(
      [entry('ai-post', '2026-01-01T00:00:00+08:00', 800, 'ai-thinking')],
      [
        {
          slug: 'ai-thinking',
          title: 'AI 时代思考',
          order: 20,
          color: '#2f5d7a',
        },
      ],
    )

    expect(books[0]?.color).toBe('#2f5d7a')
  })

  it('falls back to a deterministic palette color when the section has none', () => {
    const first = createShelfBooks(
      [entry('ai-post', '2026-01-01T00:00:00+08:00', 800, 'ai-thinking')],
      SECTIONS,
    )
    const second = createShelfBooks(
      [entry('ai-post', '2026-01-01T00:00:00+08:00', 800, 'ai-thinking')],
      SECTIONS,
    )

    expect(first[0]?.color).toMatch(/^#[0-9a-f]{6}$/)
    expect(first[0]?.color).toBe(second[0]?.color)
  })

  it('gives the uncategorized book a fixed plain color', () => {
    const books = createShelfBooks(
      [entry('loose-post', '2026-01-01T00:00:00+08:00', 300)],
      SECTIONS,
    )

    expect(books[0]?.slug).toBe(UNCATEGORIZED_BOOK_SLUG)
    expect(books[0]?.color).toMatch(/^#[0-9a-f]{6}$/)
  })
})
