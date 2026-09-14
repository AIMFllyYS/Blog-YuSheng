import { describe, expect, it } from 'vitest'
import {
  daysInMonth,
  formatBriefDateLong,
  formatDayCn,
  formatMonthDayCn,
  formatYearCn,
  parseBriefDate,
} from '../../src/features/daily-brief/brief-date'

describe('brief date', () => {
  it('parses a calendar date into weekday and ISO week without timezone drift', () => {
    expect(parseBriefDate('2026-09-14')).toEqual({
      date: '2026-09-14',
      year: 2026,
      month: 9,
      day: 14,
      weekday: 1,
      isoYear: 2026,
      isoWeek: 38,
    })
    expect(parseBriefDate('2026-08-23')?.weekday).toBe(7)
  })

  it('assigns ISO week 1 / 53 across year boundaries', () => {
    expect(parseBriefDate('2027-01-01')).toMatchObject({ isoYear: 2026, isoWeek: 53 })
    expect(parseBriefDate('2027-01-04')).toMatchObject({ isoYear: 2027, isoWeek: 1 })
    expect(parseBriefDate('2024-12-30')).toMatchObject({ isoYear: 2025, isoWeek: 1 })
  })

  it('rejects malformed or overflowing dates', () => {
    expect(parseBriefDate('2026-02-30')).toBeUndefined()
    expect(parseBriefDate('2026-13-01')).toBeUndefined()
    expect(parseBriefDate('20260914')).toBeUndefined()
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
  })

  it('formats Chinese calendar labels', () => {
    expect(formatYearCn(2026)).toBe('二〇二六')
    expect(formatDayCn(1)).toBe('一')
    expect(formatDayCn(10)).toBe('十')
    expect(formatDayCn(14)).toBe('十四')
    expect(formatDayCn(20)).toBe('二十')
    expect(formatDayCn(31)).toBe('三十一')
    expect(formatMonthDayCn(9, 14)).toBe('九月十四日')
    expect(formatBriefDateLong(parseBriefDate('2026-09-14')!)).toBe(
      '2026年9月14日 · 周一',
    )
  })
})
