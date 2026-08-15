/** 取值来自 getComputedStyle，恒为 CSS 颜色字符串，不是 three 的 Color 实例。 */
export type JourneyPalette = {
  void: string
  voidRaised: string
  gold: string
  goldSoft: string
  paper: string
  paperEdge: string
  ink: string
}

const JOURNEY_COLOR_PROPERTIES = {
  void: '--journey-void',
  voidRaised: '--journey-void-raised',
  gold: '--journey-gold',
  goldSoft: '--journey-gold-soft',
  paper: '--journey-paper',
  paperEdge: '--journey-paper-edge',
  ink: '--journey-ink',
} as const

export function readJourneyPalette(element: HTMLElement): JourneyPalette {
  const styles = window.getComputedStyle(element)
  const entries = Object.entries(JOURNEY_COLOR_PROPERTIES).map(
    ([key, property]) => [key, styles.getPropertyValue(property).trim()] as const,
  )
  const missing = entries.filter(([, value]) => value.length === 0)

  if (missing.length > 0) {
    throw new Error(
      `JourneyCanvas is missing required color tokens: ${missing
        .map(([key]) => JOURNEY_COLOR_PROPERTIES[key as keyof JourneyPalette])
        .join(', ')}`,
    )
  }

  return Object.fromEntries(entries) as JourneyPalette
}
