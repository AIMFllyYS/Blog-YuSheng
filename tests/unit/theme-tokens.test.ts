import { describe, expect, it } from 'vitest'
import { getThemeStyle } from '../../src/lib/theme/tokens'

describe('reader prototype theme tokens', () => {
  it.each([
    ['paper', '#f2e9d6', '#a9762f', 'rgba(90, 70, 40, 0.22)'],
    ['mist', '#e6edf1', '#2f7d95', 'rgba(30, 60, 75, 0.2)'],
    ['snow', '#f6f6f4', '#3a6ea5', 'rgba(20, 25, 35, 0.16)'],
    ['night', '#101012', '#d9a94a', 'rgba(232, 228, 220, 0.16)'],
  ] as const)('keeps %s aligned with the authoritative prototype', (theme, bg, accent, scrollbar) => {
    const style = getThemeStyle(theme)
    expect(style['--bg']).toBe(bg)
    expect(style['--accent']).toBe(accent)
    expect(style['--scrollbar']).toBe(scrollbar)
    expect(style['--ease-damp']).toBe('cubic-bezier(.22,.82,.28,1)')
    expect(style['--z-drawer']).toBe('41')
    expect(style['--font-serif']).toBe(
      '"Noto Serif CJK", "Source Han Serif SC", "Noto Serif SC", serif',
    )
    expect(style['--font-mono']).toBe(
      '"JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
    )
  })
})
