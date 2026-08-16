import type { PreparedTextWithSegments } from '@chenglou/pretext'

export type GlyphHome = {
  id: string
  char: string
  index: number
  width: number
  x: number
}
export type TypographyStyle = {
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  lineWidth: number
  maxWidth: number
}
export type TypographyLayout = {
  title: GlyphHome[]
  motto: GlyphHome[]
  narrative: GlyphHome[]
  floating: GlyphHome[]
  styles: {
    title: TypographyStyle
    motto: TypographyStyle
    narrative: TypographyStyle
    floating: TypographyStyle
  }
}

type TextLayoutRequest = {
  id: string
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  maxWidth: number
  lineHeight: number
  letterSpacing: number
}

const layoutCache = new Map<
  string,
  { glyphs: GlyphHome[]; style: TypographyStyle }
>()
const preparedTextCache = new Map<string, PreparedTextWithSegments>()

async function layoutGlyphHomes(request: TextLayoutRequest) {
  const cacheKey = JSON.stringify(request)
  const cached = layoutCache.get(cacheKey)
  if (cached) return cached

  const { layoutWithLines, prepareWithSegments } = await import(
    '@chenglou/pretext'
  )
  const font = `${request.fontWeight} ${request.fontSize}px ${request.fontFamily}`
  const options = {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'keep-all' as const,
    letterSpacing: request.letterSpacing,
  }
  const prepareCached = (text: string) => {
    const key = JSON.stringify({ font, options, text })
    const cachedText = preparedTextCache.get(key)
    if (cachedText) return cachedText

    const nextText = prepareWithSegments(text, font, options)
    if (preparedTextCache.size >= 64) preparedTextCache.clear()
    preparedTextCache.set(key, nextText)
    return nextText
  }
  const prepared = prepareCached(request.text)
  const { lines } = layoutWithLines(
    prepared,
    request.maxWidth,
    request.lineHeight,
  )
  if (request.text && lines.length !== 1) {
    throw new Error(`Journey typography recipe ${request.id} must fit one line`)
  }
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
  const graphemes = Array.from(
    segmenter.segment(request.text),
    (part) => part.segment,
  )
  const widths = graphemes.map((grapheme) => {
    const glyph = prepareCached(grapheme)
    return glyph.widths.reduce((sum, width) => sum + width, 0)
  })
  const measuredWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, graphemes.length - 1) * request.letterSpacing
  // Pretext's layout line includes terminal CSS letter-spacing. Individual
  // absolutely-positioned glyphs only paint the n - 1 interior gaps, so their
  // visible home map must center on the measured paint width instead.
  const centeringWidth = measuredWidth
  let cursor = -centeringWidth / 2

  const glyphs = graphemes.map((char, index) => {
    const width = widths[index] ?? 0
    const glyph = {
      id: `${request.id}-${index}`,
      char,
      index,
      width,
      x: cursor + width / 2,
    }
    cursor += width
    if (index < graphemes.length - 1) cursor += request.letterSpacing
    return glyph
  })

  const result = {
    glyphs,
    style: {
      fontFamily: request.fontFamily,
      fontSize: request.fontSize,
      fontWeight: request.fontWeight,
      letterSpacing: request.letterSpacing,
      lineHeight: request.lineHeight,
      lineWidth: centeringWidth,
      maxWidth: request.maxWidth,
    },
  }

  if (layoutCache.size >= 32) layoutCache.clear()
  layoutCache.set(cacheKey, result)
  return result
}

export async function createTypographyLayout(): Promise<TypographyLayout> {
  await document.fonts.ready

  const viewportWidth = window.innerWidth
  const displaySize = Math.min(184, Math.max(124, viewportWidth * 0.125))
  const mottoSize = Math.min(30.4, Math.max(18.4, viewportWidth * 0.021))
  const narrativeSize = Math.min(36, Math.max(20, viewportWidth * 0.0245))
  const floatingSize = Math.min(24.8, Math.max(16, viewportWidth * 0.017))
  const fontFamily =
    '"Noto Serif CJK", "Source Han Serif SC", "Noto Serif SC", STSong, SimSun, serif'

  const [titleLayout, mottoLayout, narrativeLayout, floatingLayout] = await Promise.all([
    layoutGlyphHomes({
      id: 'title',
      text: '羽升',
      fontFamily,
      fontSize: displaySize,
      fontWeight: 600,
      maxWidth: viewportWidth * 0.74,
      lineHeight: displaySize * 1.18,
      letterSpacing: displaySize * 0.1,
    }),
    layoutGlyphHomes({
      id: 'motto',
      text: '羽化成蝶 升生不息',
      fontFamily,
      fontSize: mottoSize,
      fontWeight: 400,
      maxWidth: viewportWidth * 0.72,
      lineHeight: mottoSize * 1.7,
      letterSpacing: mottoSize * 0.16,
    }),
    layoutGlyphHomes({
      id: 'narrative',
      text: '把走过的路，写成可以再次抵达的光。',
      fontFamily,
      fontSize: narrativeSize,
      fontWeight: 400,
      maxWidth: viewportWidth * 0.78,
      lineHeight: narrativeSize * 1.7,
      letterSpacing: narrativeSize * 0.11,
    }),
    layoutGlyphHomes({
      id: 'floating',
      text: '记录思考生长造物日常方法未来',
      fontFamily,
      fontSize: floatingSize,
      fontWeight: 400,
      maxWidth: viewportWidth * 0.82,
      lineHeight: floatingSize * 1.6,
      letterSpacing: 6,
    }),
  ])

  return {
    title: titleLayout.glyphs,
    motto: mottoLayout.glyphs,
    narrative: narrativeLayout.glyphs,
    floating: floatingLayout.glyphs,
    styles: {
      title: titleLayout.style,
      motto: mottoLayout.style,
      narrative: narrativeLayout.style,
      floating: floatingLayout.style,
    },
  }
}
