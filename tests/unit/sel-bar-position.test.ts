import { describe, expect, it } from 'vitest'

import { computeSelBarPosition } from '../../src/features/annotations/selection/sel-bar-position'
import { truncateQuote } from '../../src/features/annotations/selection/annotate-selection-event'

describe('computeSelBarPosition', () => {
  const bar = { width: 120, height: 36 }

  it('centers on the range and clamps 10px from the viewport edges', () => {
    const leftEdge = computeSelBarPosition(
      { top: 200, bottom: 220, left: 0, width: 20 },
      bar,
      400,
    )
    expect(leftEdge.left).toBe(10)
    expect(leftEdge.top).toBe(154)

    const rightEdge = computeSelBarPosition(
      { top: 200, bottom: 220, left: 380, width: 20 },
      bar,
      400,
    )
    expect(rightEdge.left).toBe(270)
  })

  it('flips below the range when the preferred top is under 90', () => {
    const flipped = computeSelBarPosition(
      { top: 80, bottom: 110, left: 140, width: 80 },
      bar,
      800,
    )
    expect(flipped.top).toBe(120)
    expect(flipped.left).toBe(120)
  })
})

describe('truncateQuote', () => {
  it('keeps short quotes and appends an ellipsis after 90 characters', () => {
    expect(truncateQuote('短引语')).toBe('短引语')
    const exact = '字'.repeat(91)
    expect(truncateQuote(exact)).toBe(`${'字'.repeat(90)}…`)
  })
})
