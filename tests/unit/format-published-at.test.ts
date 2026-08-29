import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  formatReaderPublishedAt,
  publishedAtHasClockTime,
} from '../../src/features/reader-layout/format-reader-published-at'

const LAYOUT_SOURCE = readFileSync(
  path.join(process.cwd(), 'src/features/reader-layout/reader-layout.tsx'),
  'utf8',
)

describe('formatReaderPublishedAt', () => {
  it('is the formatter the reading layout actually renders', () => {
    expect(LAYOUT_SOURCE).toContain('formatReaderPublishedAt')
    expect(LAYOUT_SOURCE).toContain('data-reader-published-at')
    expect(LAYOUT_SOURCE).not.toMatch(
      /<span>\s*\{publishedAt\}\s*<\/span>/,
    )
  })

  it('renders a zh-CN Asia/Shanghai calendar date without ISO tokens', () => {
    const visible = formatReaderPublishedAt('2025-11-02T00:00:00+08:00')
    expect(visible).toBe('2025年11月2日')
    expect(visible).not.toContain('T')
    expect(visible).not.toContain('+08:00')
    expect(publishedAtHasClockTime('2025-11-02T00:00:00+08:00')).toBe(false)
  })

  it('includes clock time when publishedAt is not Shanghai midnight', () => {
    const visible = formatReaderPublishedAt('2026-08-16T10:00:00+08:00')
    expect(visible).toBe('2026年8月16日 10:00')
    expect(visible).not.toContain('T')
    expect(visible).not.toContain('+08:00')
    expect(publishedAtHasClockTime('2026-08-16T10:00:00+08:00')).toBe(true)
  })

  it('treats UTC instants by Asia/Shanghai wall clock', () => {
    expect(formatReaderPublishedAt('2025-11-01T16:00:00Z')).toBe(
      '2025年11月2日',
    )
    expect(formatReaderPublishedAt('2026-08-16T02:00:00Z')).toBe(
      '2026年8月16日 10:00',
    )
  })
})
