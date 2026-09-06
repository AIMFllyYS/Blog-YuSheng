import { describe, expect, it } from 'vitest'
import { createTitleFragments, type TitleFragment } from '../../src/features/home-journey/motion/glyph-fragments'
import type { TypographyLayout } from '../../src/features/home-journey/motion/pretext-layout'

function fixture(): TypographyLayout {
  const style = {
    fontFamily: 'serif', fontSize: 180, fontWeight: 600,
    letterSpacing: 18, lineHeight: 180, lineWidth: 378, maxWidth: 1000,
  }
  return {
    title: [
      { id: 'title-0', char: '羽', index: 0, width: 180, x: -99 },
      { id: 'title-1', char: '升', index: 1, width: 180, x: 99 },
    ],
    motto: [], narrative: [], floating: [],
    styles: { title: style, motto: style, narrative: style, floating: style },
  }
}

function area(fragment: TitleFragment) {
  const numbers = fragment.clipPath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  const points = Array.from({ length: numbers.length / 2 }, (_, index) => ({
    x: numbers[index * 2] / 100 * fragment.cellWidth,
    y: numbers[index * 2 + 1] / 100 * fragment.cellHeight,
  }))
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0)) / 2
}

describe('source-glyph fracture', () => {
  it('uses exactly 32 source windows for each real title glyph', () => {
    const fragments = createTitleFragments(fixture())
    expect(fragments).toHaveLength(64)
    expect(new Set(fragments.map((fragment) => fragment.id)).size).toBe(64)
    expect(fragments.slice(0, 32).every((fragment) => fragment.sourceChar === '羽')).toBe(true)
    expect(fragments.slice(32).every((fragment) => fragment.sourceChar === '升')).toBe(true)
  })

  it('tessellates each complete glyph paint rectangle without missing area', () => {
    const layout = fixture()
    const fragments = createTitleFragments(layout)
    for (let glyphIndex = 0; glyphIndex < layout.title.length; glyphIndex += 1) {
      const glyph = layout.title[glyphIndex]
      const parts = fragments.filter((fragment) => fragment.glyphIndex === glyphIndex)
      const totalArea = parts.reduce((sum, fragment) => sum + area(fragment), 0)
      expect(Math.abs(totalArea - glyph.width * layout.styles.title.fontSize)).toBeLessThan(0.1)
      for (const fragment of parts) {
        expect(fragment.homeX).toBeCloseTo(glyph.x - glyph.width / 2 + fragment.cellX, 8)
        expect(fragment.homeY).toBe(fragment.cellY)
      }
    }
  })

  it('is deterministic and collapses every source centroid to the same title center', () => {
    const layout = fixture()
    const fragments = createTitleFragments(layout)
    expect(createTitleFragments(layout)).toEqual(fragments)
    for (const fragment of fragments) {
      expect(fragment.homeX + fragment.originX + fragment.collapseX).toBeCloseTo(0, 8)
      expect(fragment.homeY + fragment.originY + fragment.collapseY).toBeCloseTo(90, 8)
      expect(Object.values(fragment).filter((value) => typeof value === 'number').every(Number.isFinite)).toBe(true)
    }
  })
})
