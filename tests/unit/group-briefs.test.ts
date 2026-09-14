import { describe, expect, it } from 'vitest'
import { parseBriefDate } from '../../src/features/daily-brief/brief-date'
import {
  formatWeekRange,
  groupBriefsByMonth,
  latestBrief,
} from '../../src/features/daily-brief/group-briefs'
import type { BriefEntry } from '../../src/features/daily-brief/types'

function brief(date: string, headline = date): BriefEntry {
  const calendar = parseBriefDate(date)!
  return {
    ...calendar,
    title: `折晓早报 · ${headline} · ${date}`,
    headline,
    publicUrl: `/briefs/${date}.html`,
    href: `/daily/${date}/`,
    bytes: 1,
  }
}

describe('groupBriefsByMonth', () => {
  it('builds Monday-first month grids, newest month first, with only populated months', () => {
    const months = groupBriefsByMonth([
      brief('2026-08-31'),
      brief('2026-09-01'),
      brief('2026-09-14'),
      brief('2026-06-02'),
    ])
    expect(months.map((month) => month.key)).toEqual(['2026-09', '2026-08', '2026-06'])

    const september = months[0]!
    expect(september.count).toBe(2)
    expect(september.latest?.date).toBe('2026-09-14')
    expect(september.weeks).toHaveLength(5)
    expect(september.weeks[0]!.key).toBe('2026-W36')
    // 9 月 1 日是周二，行首周一 8 月 31 日是跨月补位格，但仍带上它的日报
    expect(september.weeks[0]!.days[0]).toMatchObject({
      date: '2026-08-31',
      inMonth: false,
      weekday: 1,
    })
    expect(september.weeks[0]!.days[0]!.brief?.date).toBe('2026-08-31')
    expect(september.weeks[0]!.count).toBe(1)
    expect(september.weeks.every((week) => week.days.length === 7)).toBe(true)
    expect(september.weeks.at(-1)!.days.at(-1)!.date).toBe('2026-10-04')
    expect(formatWeekRange(september.weeks[2]!)).toBe('9.14 – 9.20')
  })

  it('finds the newest brief regardless of input order', () => {
    expect(latestBrief([brief('2026-09-01'), brief('2026-09-14'), brief('2026-08-17')])?.date).toBe(
      '2026-09-14',
    )
    expect(latestBrief([])).toBeUndefined()
  })
})
