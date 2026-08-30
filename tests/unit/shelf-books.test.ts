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
  { slug: 'medical-thinking', title: '医学思考', order: 40 },
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

  it('breaks chapter ties by slug when publishedAt is equal', () => {
    const books = createShelfBooks(
      [
        entry('zeta', '2026-01-01T00:00:00+08:00', 100, 'ai-thinking'),
        entry('alpha', '2026-01-01T00:00:00+08:00', 100, 'ai-thinking'),
      ],
      SECTIONS,
    )

    expect(books[0]?.chapters.map((chapter) => chapter.slug)).toEqual([
      'alpha',
      'zeta',
    ])
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
    expect(books[1]?.chapters.map((chapter) => chapter.slug)).toEqual([
      'loose-post',
    ])
  })

  it('omits registered sections that have no chapters yet', () => {
    const books = createShelfBooks(
      [entry('ai-post', '2026-01-01T00:00:00+08:00', 800, 'ai-thinking')],
      SECTIONS,
    )

    expect(books.map((book) => book.slug)).toEqual(['ai-thinking'])
  })

  it('does not attach unused spine-dimension fields', () => {
    const books = createShelfBooks(
      [entry('ai-post', '2026-01-01T00:00:00+08:00', 800, 'ai-thinking')],
      SECTIONS,
    )

    expect(books[0]).not.toHaveProperty('widthRem')
    expect(books[0]).not.toHaveProperty('heightRem')
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
    expect(books[0]?.color).toBe('#5f625d')
  })

  it('keeps the registered other color distinct from the uncategorized color', () => {
    const books = createShelfBooks(
      [
        entry('formal-misc', '2026-01-01T00:00:00+08:00', 300, 'other'),
        entry('loose-post', '2026-02-01T00:00:00+08:00', 300),
      ],
      [{ slug: 'other', title: '其他', order: 60, color: '#7d7468' }],
    )

    expect(books.map((book) => book.slug)).toEqual([
      'other',
      UNCATEGORIZED_BOOK_SLUG,
    ])
    expect(books[0]?.color).toBe('#7d7468')
    expect(books[1]?.color).toBe('#5f625d')
    expect(books[0]?.color).not.toBe(books[1]?.color)
  })
})
