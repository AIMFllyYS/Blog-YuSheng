import type { SectionDefinition } from '../../server/content/read-sections'
import { hashString } from './catalog-helpers'
import type { BlogIndexEntry } from './create-blog-index-entries'

export const UNCATEGORIZED_BOOK_SLUG = 'uncategorized'

/** 内容兜底色：板块未配置 color 时按 slug 哈希确定性取色（宣纸古籍色系） */
const FALLBACK_BOOK_COLORS = [
  '#8a6d3b',
  '#5d7a5a',
  '#2f5d7a',
  '#9c4a3c',
  '#6d5a8a',
  '#a9762f',
] as const

/** 散页（未归栏文章）固定素色 */
const UNCATEGORIZED_BOOK_COLOR = '#7d7468'

export type ShelfBook = {
  readonly slug: string
  readonly title: string
  readonly summary: string | undefined
  readonly chapters: readonly BlogIndexEntry[]
  readonly totalCharacters: number
  readonly totalReadingMinutes: number
  /** 方向主色：优先注册表 color，缺省时 slug 哈希兜底取色 */
  readonly color: string
}

/**
 * 把平铺的文章条目按板块聚成「书」：章节按发布时间升序（第一章最早），
 * 同日再按 slug；书按注册表 order 排列，未归栏的散页永远在最后；
 * 没有文章的板块不上架。
 */
export function createShelfBooks(
  entries: readonly BlogIndexEntry[],
  sections: readonly SectionDefinition[],
): readonly ShelfBook[] {
  const chaptersByBook = new Map<string, BlogIndexEntry[]>()
  for (const entry of entries) {
    const key = entry.frontmatter.section ?? UNCATEGORIZED_BOOK_SLUG
    const chapters = chaptersByBook.get(key)
    if (chapters) {
      chapters.push(entry)
    } else {
      chaptersByBook.set(key, [entry])
    }
  }

  const books: ShelfBook[] = []
  for (const section of sections) {
    const chapters = chaptersByBook.get(section.slug)
    if (chapters) {
      books.push(
        buildBook(
          section.slug,
          section.title,
          section.summary,
          chapters,
          section.color ?? fallbackBookColor(section.slug),
        ),
      )
    }
  }

  const uncategorized = chaptersByBook.get(UNCATEGORIZED_BOOK_SLUG)
  if (uncategorized) {
    books.push(
      buildBook(
        UNCATEGORIZED_BOOK_SLUG,
        '散页',
        '还没有归入任何方向的文章。',
        uncategorized,
        UNCATEGORIZED_BOOK_COLOR,
      ),
    )
  }

  return Object.freeze(books)
}

function buildBook(
  slug: string,
  title: string,
  summary: string | undefined,
  chapters: readonly BlogIndexEntry[],
  color: string,
): ShelfBook {
  const sorted = [...chapters].sort((left, right) => {
    const byDate =
      Date.parse(left.frontmatter.publishedAt) -
      Date.parse(right.frontmatter.publishedAt)
    return byDate || left.slug.localeCompare(right.slug, 'en')
  })
  const totalCharacters = sorted.reduce(
    (sum, entry) => sum + entry.characterCount,
    0,
  )
  const totalReadingMinutes = sorted.reduce(
    (sum, entry) => sum + entry.readingMinutes,
    0,
  )

  return Object.freeze({
    slug,
    title,
    summary,
    chapters: Object.freeze(sorted),
    totalCharacters,
    totalReadingMinutes,
    color,
  })
}

function fallbackBookColor(slug: string): string {
  return FALLBACK_BOOK_COLORS[
    hashString(slug, 997) % FALLBACK_BOOK_COLORS.length
  ]
}
