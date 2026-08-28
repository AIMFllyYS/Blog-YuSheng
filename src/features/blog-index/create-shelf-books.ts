import type { SectionDefinition } from '../../server/content/read-sections'
import type { BlogIndexEntry } from './create-blog-index-entries'

export const UNCATEGORIZED_BOOK_SLUG = 'uncategorized'

const MIN_BOOK_WIDTH_REM = 3
const MAX_BOOK_WIDTH_REM = 6.5
const BASE_BOOK_HEIGHT_REM = 16
const BOOK_HEIGHT_STEP_REM = 0.35

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
  /** 书脊宽度：按全书总字数在架内线性映射，写得越多书越厚 */
  readonly widthRem: number
  /** 书高：按 slug 确定性微差，让书架像真书架一样参差 */
  readonly heightRem: number
  /** 方向主色：优先注册表 color，缺省时 slug 哈希兜底取色 */
  readonly color: string
}

/**
 * 把平铺的文章条目按板块聚成「书」：章节按发布时间升序（第一章最早），
 * 书按注册表 order 排列，未归栏的散页永远在最后；没有文章的板块不上架。
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

  return Object.freeze(applySpineDimensions(books))
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

  return {
    slug,
    title,
    summary,
    chapters: Object.freeze(sorted),
    totalCharacters,
    totalReadingMinutes,
    widthRem: MIN_BOOK_WIDTH_REM,
    heightRem: bookHeightRem(slug),
    color,
  }
}

function fallbackBookColor(slug: string): string {
  let hash = 0
  for (const char of slug) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }
  return FALLBACK_BOOK_COLORS[hash % FALLBACK_BOOK_COLORS.length]
}

function applySpineDimensions(
  books: readonly ShelfBook[],
): readonly ShelfBook[] {
  const totals = books.map((book) => book.totalCharacters)
  const min = Math.min(...totals)
  const max = Math.max(...totals)

  return books.map((book) => ({
    ...book,
    widthRem:
      max === min
        ? (MIN_BOOK_WIDTH_REM + MAX_BOOK_WIDTH_REM) / 2
        : MIN_BOOK_WIDTH_REM +
          ((book.totalCharacters - min) / (max - min)) *
            (MAX_BOOK_WIDTH_REM - MIN_BOOK_WIDTH_REM),
  }))
}

function bookHeightRem(slug: string): number {
  let hash = 0
  for (const char of slug) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }
  return BASE_BOOK_HEIGHT_REM + (hash % 5) * BOOK_HEIGHT_STEP_REM
}
