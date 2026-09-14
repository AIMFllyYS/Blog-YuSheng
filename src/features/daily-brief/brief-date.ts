/**
 * 日报日期是「上海日历日」，不做时区换算：一律把 `YYYY-MM-DD` 当作 UTC 午夜
 * 来算星期与 ISO 周，避免服务器/浏览器时区把日期挪到前一天。
 */

export const BRIEF_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export type BriefCalendarDate = {
  readonly date: string
  readonly year: number
  readonly month: number
  readonly day: number
  /** ISO 星期：1 = 周一 … 7 = 周日 */
  readonly weekday: number
  readonly isoYear: number
  readonly isoWeek: number
}

export function parseBriefDate(date: string): BriefCalendarDate | undefined {
  const match = BRIEF_DATE_PATTERN.exec(date)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return undefined
  }
  const weekday = isoWeekday(utc)
  const { isoYear, isoWeek } = isoWeekOf(utc)
  return { date, year, month, day, weekday, isoYear, isoWeek }
}

export function isoWeekday(utc: Date): number {
  const day = utc.getUTCDay()
  return day === 0 ? 7 : day
}

/** ISO 8601 周：周一起始，含 1 月 4 日的那周是第 1 周 */
export function isoWeekOf(utc: Date): { isoYear: number; isoWeek: number } {
  const target = new Date(
    Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()),
  )
  const weekday = isoWeekday(target)
  // 移到本周四，本周四所在的年份就是 ISO 年
  target.setUTCDate(target.getUTCDate() + 4 - weekday)
  const isoYear = target.getUTCFullYear()
  const yearStart = Date.UTC(isoYear, 0, 1)
  const isoWeek = Math.ceil(((target.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return { isoYear, isoWeek }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${formatMonthKey(year, month)}-${String(day).padStart(2, '0')}`
}

const CN_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const
const CN_MONTHS = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
] as const
const CN_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const
const CN_WEEKDAYS_SHORT = ['一', '二', '三', '四', '五', '六', '日'] as const

export function formatYearCn(year: number): string {
  return String(year)
    .split('')
    .map((digit) => CN_DIGITS[Number(digit)] ?? digit)
    .join('')
}

export function formatMonthCn(month: number): string {
  return CN_MONTHS[month - 1] ?? `${month}月`
}

export function formatWeekdayCn(weekday: number): string {
  return CN_WEEKDAYS[weekday - 1] ?? ''
}

export function formatWeekdayShortCn(weekday: number): string {
  return CN_WEEKDAYS_SHORT[weekday - 1] ?? ''
}

/** 九月十四日 */
export function formatMonthDayCn(month: number, day: number): string {
  return `${formatMonthCn(month)}${formatDayCn(day)}日`
}

export function formatDayCn(day: number): string {
  if (day <= 10) return day === 10 ? '十' : (CN_DIGITS[day] ?? String(day))
  if (day < 20) return `十${CN_DIGITS[day - 10]}`
  const tens = Math.floor(day / 10)
  const ones = day % 10
  return `${CN_DIGITS[tens]}十${ones === 0 ? '' : CN_DIGITS[ones]}`
}

/** 2026年9月14日 · 周一 */
export function formatBriefDateLong(entry: BriefCalendarDate): string {
  return `${entry.year}年${entry.month}月${entry.day}日 · ${formatWeekdayCn(entry.weekday)}`
}
