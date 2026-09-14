import {
  daysInMonth,
  formatDateKey,
  formatMonthKey,
  isoWeekday,
  isoWeekOf,
} from './brief-date'
import type { BriefEntry } from './types'

export type BriefDayCell = {
  readonly date: string
  readonly day: number
  /** 1 = 周一 … 7 = 周日 */
  readonly weekday: number
  /** 是否属于当前月页（跨月补位格为 false） */
  readonly inMonth: boolean
  readonly brief?: BriefEntry
}

export type BriefWeekRow = {
  /** `2026-W38` */
  readonly key: string
  readonly isoYear: number
  readonly isoWeek: number
  /** 周一到周日，长度恒为 7 */
  readonly days: readonly BriefDayCell[]
  /** 本行内属于当前月且有日报的天数 */
  readonly count: number
}

export type BriefMonthPage = {
  /** `2026-09` */
  readonly key: string
  readonly year: number
  readonly month: number
  readonly count: number
  readonly weeks: readonly BriefWeekRow[]
  /** 本月最新一期 */
  readonly latest?: BriefEntry
}

/**
 * 把日报按「月页 → ISO 周行 → 日格」整理成台历网格；月份最新在前。
 * 只为出现过日报的月份建页，空月不占位。
 */
export function groupBriefsByMonth(
  briefs: readonly BriefEntry[],
): readonly BriefMonthPage[] {
  const byDate = new Map(briefs.map((brief) => [brief.date, brief] as const))
  const monthKeys = new Set(briefs.map((brief) => formatMonthKey(brief.year, brief.month)))
  return [...monthKeys]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => buildMonthPage(key, byDate))
}

function buildMonthPage(
  key: string,
  byDate: ReadonlyMap<string, BriefEntry>,
): BriefMonthPage {
  const [yearText, monthText] = key.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const total = daysInMonth(year, month)
  const first = new Date(Date.UTC(year, month - 1, 1))
  const leading = isoWeekday(first) - 1
  const cells: BriefDayCell[] = []

  // 从本月 1 日所在周的周一开始，补满整周
  const cursor = new Date(Date.UTC(year, month - 1, 1 - leading))
  const lastCell = new Date(Date.UTC(year, month - 1, total))
  const trailing = 7 - isoWeekday(lastCell)
  lastCell.setUTCDate(lastCell.getUTCDate() + trailing)

  while (cursor.getTime() <= lastCell.getTime()) {
    const cellYear = cursor.getUTCFullYear()
    const cellMonth = cursor.getUTCMonth() + 1
    const cellDay = cursor.getUTCDate()
    const date = formatDateKey(cellYear, cellMonth, cellDay)
    cells.push({
      date,
      day: cellDay,
      weekday: isoWeekday(cursor),
      inMonth: cellMonth === month && cellYear === year,
      brief: byDate.get(date),
    })
    cursor.setUTCDate(cellDay + 1)
  }

  const weeks: BriefWeekRow[] = []
  for (let index = 0; index < cells.length; index += 7) {
    const days = cells.slice(index, index + 7)
    const [y, m, d] = days[0]!.date.split('-').map(Number)
    const { isoYear, isoWeek } = isoWeekOf(new Date(Date.UTC(y!, m! - 1, d!)))
    weeks.push({
      key: `${isoYear}-W${String(isoWeek).padStart(2, '0')}`,
      isoYear,
      isoWeek,
      days,
      count: days.filter((cell) => cell.inMonth && cell.brief).length,
    })
  }

  const inMonthBriefs = cells
    .filter((cell) => cell.inMonth && cell.brief)
    .map((cell) => cell.brief!)
  return {
    key,
    year,
    month,
    count: inMonthBriefs.length,
    weeks,
    latest: inMonthBriefs.at(-1),
  }
}

export function latestBrief(briefs: readonly BriefEntry[]): BriefEntry | undefined {
  return briefs.reduce<BriefEntry | undefined>(
    (best, brief) => (!best || brief.date > best.date ? brief : best),
    undefined,
  )
}

/** 周行在月页里的可读范围：`9.14 – 9.20` */
export function formatWeekRange(week: BriefWeekRow): string {
  const first = week.days[0]!
  const last = week.days[6]!
  const label = (cell: BriefDayCell) => {
    const [, m, d] = cell.date.split('-')
    return `${Number(m)}.${Number(d)}`
  }
  return `${label(first)} – ${label(last)}`
}
