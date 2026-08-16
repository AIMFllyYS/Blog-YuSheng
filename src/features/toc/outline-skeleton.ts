import type { OutlineItem } from '@/features/doc-engine/toc'

export type OutlineSkeletonMetric = {
  readonly item: OutlineItem
  readonly barCount: number
  readonly lastBarPercent: number
  readonly titlePercent: number
}

const MIN_BARS = 2
const MAX_BARS = 8

export function createOutlineSkeletonMetrics(
  sections: readonly OutlineItem[],
): readonly OutlineSkeletonMetric[] {
  if (sections.length === 0) return Object.freeze([])
  const weights = sections.map((section) => Math.max(1, section.characterCount))
  const shortest = Math.min(...weights)
  const longest = Math.max(...weights)

  return Object.freeze(
    sections.map((item, index) => {
      const relative =
        longest === shortest ? 0.4 : (weights[index]! - shortest) / (longest - shortest)
      const rawCount = MIN_BARS + relative * (MAX_BARS - MIN_BARS)
      const fraction = rawCount - Math.floor(rawCount)
      const lastBarPercent = fraction < 0.08 ? 88 : 34 + fraction * 58
      return Object.freeze({
        item,
        barCount: Math.max(MIN_BARS, Math.min(MAX_BARS, Math.round(rawCount))),
        lastBarPercent: Math.max(28, Math.min(94, lastBarPercent)),
        titlePercent: Math.max(30, Math.min(72, Array.from(item.title).length * 3.2)),
      })
    }),
  )
}
