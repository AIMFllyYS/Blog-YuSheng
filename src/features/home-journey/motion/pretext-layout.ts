export type GlyphHome = {
  id: string
  char: string
  index: number
  width: number
  x: number
}
export type TypographyLayout = {
  title: GlyphHome[]
  motto: GlyphHome[]
  narrative: GlyphHome[]
  floating: GlyphHome[]
}

type TextLayoutRequest = {
  id: string
  text: string
  font: string
  maxWidth: number
  lineHeight: number
  letterSpacing?: number
}

async function layoutGlyphHomes(request: TextLayoutRequest) {
  const { layoutWithLines, prepareWithSegments } = await import(
    '@chenglou/pretext'
  )
  const options = {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'keep-all' as const,
    letterSpacing: request.letterSpacing ?? 0,
  }
  const prepared = prepareWithSegments(request.text, request.font, options)
  const { lines } = layoutWithLines(
    prepared,
    request.maxWidth,
    request.lineHeight,
  )
  const lineWidth = lines[0]?.width ?? 0
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
  const graphemes = Array.from(
    segmenter.segment(request.text),
    (part) => part.segment,
  )
  const widths = graphemes.map((grapheme) => {
    const glyph = prepareWithSegments(grapheme, request.font, options)
    return glyph.widths.reduce((sum, width) => sum + width, 0)
  })
  const measuredWidth = widths.reduce((sum, width) => sum + width, 0)
  const centeringWidth = Math.max(lineWidth, measuredWidth)
  let cursor = -centeringWidth / 2

  return graphemes.map((char, index) => {
    const width = widths[index] ?? 0
    const glyph = {
      id: `${request.id}-${index}`,
      char,
      index,
      width,
      x: cursor + width / 2,
    }
    cursor += width
    return glyph
  })
}

export async function createTypographyLayout(): Promise<TypographyLayout> {
  await document.fonts.ready

  const viewportWidth = window.innerWidth
  const displaySize = Math.min(184, Math.max(124, viewportWidth * 0.125))
  const bodySize = Math.min(31, Math.max(24, viewportWidth * 0.022))
  const displayFont = `600 ${displaySize}px "STZhongsong", "Songti SC", "SimSun", serif`
  const bodyFont = `500 ${bodySize}px "STZhongsong", "Songti SC", "SimSun", serif`
  const smallFont = `500 20px "STZhongsong", "Songti SC", "SimSun", serif`

  const [title, motto, narrative, floating] = await Promise.all([
    layoutGlyphHomes({
      id: 'title',
      text: '羽升',
      font: displayFont,
      maxWidth: viewportWidth * 0.74,
      lineHeight: displaySize * 1.18,
      letterSpacing: displaySize * 0.1,
    }),
    layoutGlyphHomes({
      id: 'motto',
      text: '羽化成蝶 升生不息',
      font: bodyFont,
      maxWidth: viewportWidth * 0.72,
      lineHeight: bodySize * 1.7,
      letterSpacing: bodySize * 0.24,
    }),
    layoutGlyphHomes({
      id: 'narrative',
      text: '把走过的路，写成可以再次抵达的光。',
      font: bodyFont,
      maxWidth: viewportWidth * 0.78,
      lineHeight: bodySize * 1.7,
      letterSpacing: bodySize * 0.1,
    }),
    layoutGlyphHomes({
      id: 'floating',
      text: '记录思考生长造物日常方法未来',
      font: smallFont,
      maxWidth: viewportWidth * 0.82,
      lineHeight: 32,
      letterSpacing: 6,
    }),
  ])

  return { title, motto, narrative, floating }
}
