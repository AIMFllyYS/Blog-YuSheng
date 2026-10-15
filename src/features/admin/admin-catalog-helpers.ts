import type { VisibilityKind } from '@/features/admin/admin-visibility'

export type AdminPost = {
  slug: string
  title: string
  publishedAt: string
  section?: string
  sectionTitle?: string
  hidden: boolean
}

export type AdminBrief = {
  date: string
  title: string
  hidden: boolean
}

export type AdminSection = {
  slug: string
  title: string
  order: number
}

export type AdminCatalog = {
  canWrite: boolean
  posts: AdminPost[]
  briefs: AdminBrief[]
  sections?: AdminSection[]
}

export type CategoryId =
  | 'all'
  | 'posts'
  | 'briefs'
  | `post:${string}`
  | `brief:${string}`

export type Category = {
  id: CategoryId
  label: string
}

export type StatusFilter = 'all' | 'visible' | 'hidden'
export type DeskViewMode = 'stage' | 'ledger'

export type AdminRow = {
  key: string
  kind: VisibilityKind
  id: string
  title: string
  meta: string
  badge: string
  href: string
  spineColor: string
  publishedLabel: string
  hidden: boolean
}

export type AdminSectionSummary = {
  slug: string
  title: string
  order: number
  count: number
  hiddenCount: number
  visibleCount: number
  color: string
}

export type AdminMonthSummary = {
  month: string
  label: string
  yearNum: number
  monthNum: number
  count: number
  hiddenCount: number
  visibleCount: number
}

export type AdminBookGroup = {
  slug: string
  title: string
  color: string
  colorDark: string
  posts: readonly AdminRow[]
  visibleCount: number
  hiddenCount: number
  latestDateLabel: string | undefined
}

export type AdminCalendarDayCell = {
  date: string
  day: number
  weekday: number
  inMonth: boolean
  row: AdminRow | undefined
}

export type AdminCalendarWeek = {
  key: string
  weekNumber: number
  days: readonly AdminCalendarDayCell[]
  briefRows: readonly AdminRow[]
}

export type AdminCalendarMonth = {
  key: string
  label: string
  yearNum: number
  monthNum: number
  count: number
  hiddenCount: number
  visibleCount: number
  weeks: readonly AdminCalendarWeek[]
  rows: readonly AdminRow[]
}

const BOOK_PALETTE = [
  '#8a6d3b',
  '#5d7a5a',
  '#2f5d7a',
  '#9c4a3c',
  '#6d5a8a',
  '#a9762f',
] as const

export const BRIEF_SPINE_COLOR = '#73573b'

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export function hashString(value: string, seed = 997): number {
  let hash = seed
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function sectionSpineColor(slug: string): string {
  if (!slug) return '#5f625d'
  return BOOK_PALETTE[hashString(slug) % BOOK_PALETTE.length]
}

export function shadeColor(hex: string, percent: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const target = percent < 0 ? 0 : 255
  const amount = Math.abs(percent)
  const channel = (shift: number) => {
    const current = (value >> shift) & 255
    return Math.round(current + (target - current) * amount)
  }
  return `#${((1 << 24) + (channel(16) << 16) + (channel(8) << 8) + channel(0))
    .toString(16)
    .slice(1)}`
}

export function formatShortDate(isoOrDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(isoOrDate)
  if (!match) return isoOrDate
  return `${match[1]}.${match[2]}.${match[3]}`
}

export function buildAdminCategories(catalog: AdminCatalog): {
  sections: AdminSectionSummary[]
  months: AdminMonthSummary[]
} {
  const counts = new Map<string, number>()
  const hiddenCounts = new Map<string, number>()
  for (const post of catalog.posts) {
    const slug = post.section || ''
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
    if (post.hidden) {
      hiddenCounts.set(slug, (hiddenCounts.get(slug) ?? 0) + 1)
    }
  }
  const known = new Set((catalog.sections ?? []).map((section) => section.slug))
  const sections: AdminSectionSummary[] = [...(catalog.sections ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((section) => {
      const count = counts.get(section.slug) ?? 0
      const hiddenCount = hiddenCounts.get(section.slug) ?? 0
      return {
        ...section,
        count,
        hiddenCount,
        visibleCount: count - hiddenCount,
        color: sectionSpineColor(section.slug),
      }
    })

  for (const post of catalog.posts) {
    const slug = post.section || ''
    if (known.has(slug)) continue
    known.add(slug)
    const count = counts.get(slug) ?? 0
    const hiddenCount = hiddenCounts.get(slug) ?? 0
    sections.push({
      slug,
      title: post.sectionTitle || '未分类',
      order: 999,
      count,
      hiddenCount,
      visibleCount: count - hiddenCount,
      color: sectionSpineColor(slug),
    })
  }

  const monthCounts = new Map<string, number>()
  const monthHiddenCounts = new Map<string, number>()
  for (const brief of catalog.briefs) {
    const month = brief.date.slice(0, 7)
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
    if (brief.hidden) {
      monthHiddenCounts.set(month, (monthHiddenCounts.get(month) ?? 0) + 1)
    }
  }

  const months: AdminMonthSummary[] = [...monthCounts.entries()]
    .sort(([left], [right]) => (left < right ? 1 : -1))
    .map(([month, count]) => {
      const yearNum = Number(month.slice(0, 4))
      const monthNum = Number(month.slice(5, 7))
      const hiddenCount = monthHiddenCounts.get(month) ?? 0
      return {
        month,
        yearNum,
        monthNum,
        count,
        hiddenCount,
        visibleCount: count - hiddenCount,
        label: `${yearNum}年${monthNum}月`,
      }
    })

  return { sections, months }
}

export function postToRow(post: AdminPost): AdminRow {
  const sectionSlug = post.section || ''
  const sectionTitle = post.sectionTitle || '未分类'
  return {
    key: `posts:${post.slug}`,
    kind: 'posts',
    id: post.slug,
    title: post.title,
    meta: `${sectionTitle} · ${formatShortDate(post.publishedAt)} · ${post.slug}`,
    badge: sectionTitle,
    href: `/blog/${post.slug}/`,
    spineColor: sectionSpineColor(sectionSlug),
    publishedLabel: formatShortDate(post.publishedAt),
    hidden: post.hidden,
  }
}

export function briefToRow(brief: AdminBrief): AdminRow {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(brief.date)
  const weekday = match
    ? WEEKDAY_NAMES[
        new Date(
          Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
        ).getUTCDay()
      ]
    : ''
  return {
    key: `briefs:${brief.date}`,
    kind: 'briefs',
    id: brief.date,
    title: brief.title,
    meta: weekday ? `${brief.date} · ${weekday}` : brief.date,
    badge: `早报 · ${brief.date.slice(5)}`,
    href: `/daily/${brief.date}/`,
    spineColor: BRIEF_SPINE_COLOR,
    publishedLabel: brief.date,
    hidden: brief.hidden,
  }
}

export function filterAdminRows(
  catalog: AdminCatalog,
  categoryId: CategoryId,
  status: StatusFilter,
  query: string,
): AdminRow[] {
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  const posts = catalog.posts
    .filter((post) => matchesCategory(categoryId, 'posts', post.section))
    .map(postToRow)
  const briefs = catalog.briefs
    .filter((brief) => matchesCategory(categoryId, 'briefs', brief.date.slice(0, 7)))
    .map(briefToRow)

  return [...posts, ...briefs].filter((row) => {
    if (status === 'visible' && row.hidden) return false
    if (status === 'hidden' && !row.hidden) return false
    if (!needle) return true
    return `${row.title} ${row.meta} ${row.id}`.toLocaleLowerCase('zh-CN').includes(needle)
  })
}

export function matchesCategory(
  categoryId: CategoryId,
  kind: VisibilityKind,
  group: string | undefined,
): boolean {
  if (categoryId === 'all') return true
  if (categoryId === kind) return true
  if (categoryId === `${kind === 'posts' ? 'post' : 'brief'}:${group ?? ''}`) return true
  return false
}

/**
 * 将过滤后的博客条目按专栏聚合成 3D「方向典籍」
 */
export function buildAdminBooks(
  catalog: AdminCatalog,
  filteredRows: readonly AdminRow[],
): AdminBookGroup[] {
  const postRowsBySlug = new Map<string, AdminRow>()
  for (const row of filteredRows) {
    if (row.kind === 'posts') {
      postRowsBySlug.set(row.id, row)
    }
  }

  const { sections } = buildAdminCategories(catalog)
  const books: AdminBookGroup[] = []

  for (const section of sections) {
    const matchingPosts = catalog.posts
      .filter((post) => (post.section || '') === section.slug && postRowsBySlug.has(post.slug))
      .map((post) => postRowsBySlug.get(post.slug)!)

    if (matchingPosts.length === 0) continue

    const hiddenCount = matchingPosts.filter((row) => row.hidden).length
    const color = section.color
    books.push({
      slug: section.slug || 'uncategorized',
      title: section.title,
      color,
      colorDark: shadeColor(color, -0.22),
      posts: matchingPosts,
      visibleCount: matchingPosts.length - hiddenCount,
      hiddenCount,
      latestDateLabel: matchingPosts[0]?.publishedLabel,
    })
  }

  return books
}

/**
 * 将过滤后的早报条目按月构建为 3D 报亭台历月页（含 7 列星期网格）
 */
export function buildAdminCalendarMonths(
  catalog: AdminCatalog,
  filteredRows: readonly AdminRow[],
): AdminCalendarMonth[] {
  const briefRowsByDate = new Map<string, AdminRow>()
  for (const row of filteredRows) {
    if (row.kind === 'briefs') {
      briefRowsByDate.set(row.id, row)
    }
  }

  const allBriefsByDate = new Map<string, AdminRow>()
  for (const brief of catalog.briefs) {
    allBriefsByDate.set(brief.date, briefToRow(brief))
  }

  const { months } = buildAdminCategories(catalog)
  const pages: AdminCalendarMonth[] = []

  for (const summary of months) {
    const monthRows = catalog.briefs
      .filter(
        (brief) =>
          brief.date.startsWith(`${summary.month}-`) && briefRowsByDate.has(brief.date),
      )
      .map((brief) => briefRowsByDate.get(brief.date)!)

    if (monthRows.length === 0) continue

    const weeks = buildMonthGrid(
      summary.yearNum,
      summary.monthNum,
      briefRowsByDate,
      allBriefsByDate,
    )
    const hiddenCount = monthRows.filter((row) => row.hidden).length

    pages.push({
      key: summary.month,
      label: summary.label,
      yearNum: summary.yearNum,
      monthNum: summary.monthNum,
      count: monthRows.length,
      hiddenCount,
      visibleCount: monthRows.length - hiddenCount,
      weeks,
      rows: monthRows,
    })
  }

  return pages
}

function buildMonthGrid(
  year: number,
  month: number,
  filteredByDate: ReadonlyMap<string, AdminRow>,
  allByDate: ReadonlyMap<string, AdminRow>,
): AdminCalendarWeek[] {
  const firstDayUtc = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  // 周一为 0，周日为 6
  const startOffset = (firstDayUtc.getUTCDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  const weeks: AdminCalendarWeek[] = []
  for (let weekIdx = 0; weekIdx < totalCells / 7; weekIdx += 1) {
    const days: AdminCalendarDayCell[] = []
    const briefRows: AdminRow[] = []

    for (let col = 0; col < 7; col += 1) {
      const cellIndex = weekIdx * 7 + col
      const dayNumber = cellIndex - startOffset + 1
      const cellUtc = new Date(Date.UTC(year, month - 1, dayNumber))
      const cellYear = cellUtc.getUTCFullYear()
      const cellMonth = cellUtc.getUTCMonth() + 1
      const cellDay = cellUtc.getUTCDate()
      const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth
      const dateStr = `${String(cellYear).padStart(4, '0')}-${String(cellMonth).padStart(
        2,
        '0',
      )}-${String(cellDay).padStart(2, '0')}`

      const row = inMonth
        ? (filteredByDate.get(dateStr) ?? undefined)
        : (allByDate.get(dateStr) ?? undefined)

      if (inMonth && row) {
        briefRows.push(row)
      }

      days.push({
        date: dateStr,
        day: cellDay,
        weekday: col + 1,
        inMonth,
        row: inMonth ? row : undefined,
      })
    }

    weeks.push({
      key: `${year}-${String(month).padStart(2, '0')}-w${weekIdx + 1}`,
      weekNumber: weekIdx + 1,
      days,
      briefRows,
    })
  }

  return weeks
}
