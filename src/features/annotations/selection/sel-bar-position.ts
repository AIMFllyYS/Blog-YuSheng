export type SelBarRangeBox = {
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly width: number
}

export type SelBarSize = {
  readonly width: number
  readonly height: number
}

/**
 * Prototype placement: center on the range, clamp 10px from the viewport
 * edges, and flip below the range when the preferred top is under 90px
 * (the rope-nav band).
 */
export function computeSelBarPosition(
  range: SelBarRangeBox,
  bar: SelBarSize,
  viewportWidth: number,
): { left: number; top: number } {
  const left = Math.max(
    10,
    Math.min(viewportWidth - bar.width - 10, range.left + range.width / 2 - bar.width / 2),
  )
  const preferredTop = range.top - bar.height - 10
  const top = preferredTop < 90 ? range.bottom + 10 : preferredTop
  return { left, top }
}
