import { describe, expect, it } from 'vitest'
import type { OutlineItem } from '../../src/features/doc-engine'
import { createOutlineSkeletonMetrics } from '../../src/features/toc/outline-skeleton'

function section(
  title: string,
  characterCount: number,
  embeds: OutlineItem['embeds'] = {
    customTag: false,
    image: false,
    mindmap: false,
  },
): OutlineItem {
  const slug = title.toLowerCase()
  return Object.freeze({
    nodeId: `node-${slug}`,
    blockId: `block-${slug}`,
    slug,
    title,
    depth: 2,
    characterCount,
    embeds: Object.freeze(embeds),
    children: Object.freeze([]),
  })
}

describe('graphical table-of-contents view model', () => {
  it('maps the shortest and longest sections linearly to 2 and 8 bars', () => {
    const metrics = createOutlineSkeletonMetrics([
      section('短', 10),
      section('中', 40),
      section('长', 70),
    ])

    expect(metrics.map((metric) => metric.barCount)).toEqual([2, 5, 8])
    expect(metrics[0]?.lastBarPercent).toBe(88)
    expect(metrics[2]?.lastBarPercent).toBe(88)
  })

  it('keeps the fractional remainder in the last bar without square-root compression', () => {
    const metrics = createOutlineSkeletonMetrics([
      section('最短', 10),
      section('较短', 25),
      section('较长', 40),
      section('最长', 70),
    ])

    expect(metrics.map((metric) => metric.barCount)).toEqual([2, 4, 5, 8])
    expect(metrics[1]?.lastBarPercent).toBeCloseTo(63, 5)
    expect(metrics[2]?.lastBarPercent).toBe(88)
  })

  it('preserves the marker semantics supplied by the canonical outline', () => {
    const item = section('嵌入', 20, {
      customTag: true,
      image: true,
      mindmap: true,
    })
    const metric = createOutlineSkeletonMetrics([item])[0]

    expect(metric?.item.embeds).toEqual({
      customTag: true,
      image: true,
      mindmap: true,
    })
    expect(metric?.barCount).toBeGreaterThanOrEqual(2)
    expect(metric?.barCount).toBeLessThanOrEqual(8)
  })
})
