const STAMP_FONT =
  '"Noto Serif CJK", "Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, serif'

type CanvasBox = {
  readonly context: CanvasRenderingContext2D
  readonly height: number
  readonly width: number
}

function fitCanvas(canvas: HTMLCanvasElement): CanvasBox | undefined {
  const context = canvas.getContext('2d')
  if (!context) return undefined

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  return { context, height, width }
}

function themeColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    accent: style.getPropertyValue('--accent').trim() || '#a9762f',
    faint: style.getPropertyValue('--ink-faint').trim() || '#9c9184',
  }
}

function paintMarks(
  context: CanvasRenderingContext2D,
  marks: ReadonlyArray<{ readonly text: string; readonly x: number; readonly y: number }>,
  size: number,
  color: string,
) {
  context.fillStyle = color
  context.shadowColor = color
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.shadowBlur = size * 0.95
  context.globalAlpha = 0.022
  marks.forEach(({ text, x, y }) => context.fillText(text, x, y))
  context.shadowBlur = size * 0.32
  context.globalAlpha = 0.034
  marks.forEach(({ text, x, y }) => context.fillText(text, x, y))
}

function paintFallback(canvas: HTMLCanvasElement) {
  const box = fitCanvas(canvas)
  if (!box) return

  const { accent, faint } = themeColors()
  const size = Math.max(72, Math.min(box.width, box.height) * 0.22)
  const context = box.context
  context.save()
  context.translate(box.width / 2, box.height / 2)
  context.rotate((-9 * Math.PI) / 180)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `600 ${size}px ${STAMP_FONT}`
  paintMarks(context, [{ text: '羽升', x: 0, y: 0 }], size, accent)
  const smallSize = size * 0.38
  context.font = `600 ${smallSize}px ${STAMP_FONT}`
  paintMarks(
    context,
    [
      { text: '羽升', x: box.width * -0.38, y: box.height * -0.34 },
      { text: '羽升', x: box.width * -0.36, y: box.height * 0.36 },
      { text: '羽升', x: box.width * 0.36, y: box.height * -0.32 },
      { text: '羽升', x: box.width * 0.34, y: box.height * 0.34 },
    ],
    smallSize,
    faint,
  )
  context.restore()
  canvas.dataset.stampMode = 'fallback'
}

async function paintPretext(
  canvas: HTMLCanvasElement,
  isCancelled: () => boolean,
) {
  try {
    await document.fonts.ready
    if (isCancelled() || canvas.dataset.stampMode === 'pretext') return

    const api = await import('@chenglou/pretext')
    if (isCancelled() || canvas.dataset.stampMode === 'pretext') return

    api.setLocale('zh-CN')
    const box = fitCanvas(canvas)
    if (!box) return

    const { accent } = themeColors()
    const unit = '羽升'
    const size = Math.max(56, Math.min(box.width, box.height) * 0.118)
    const font = `600 ${size}px ${STAMP_FONT}`
    const prepared = api.prepareWithSegments(unit, font, {
      letterSpacing: size * 0.08,
      whiteSpace: 'pre-wrap',
      wordBreak: 'keep-all',
    })
    const range = api.layoutNextLineRange(
      prepared,
      { graphemeIndex: 0, segmentIndex: 0 },
      box.width,
    )
    if (!range) {
      if (!canvas.dataset.stampMode) paintFallback(canvas)
      return
    }

    const measured = api.materializeLineRange(prepared, range)
    const cellWidth = measured.width + size * 0.78
    const cellHeight = size * 1.46
    let columnCount = Math.ceil(box.width / cellWidth) + 3
    let rowCount = Math.ceil(box.height / cellHeight) + 3
    if (columnCount % 2 === 0) columnCount += 1
    if (rowCount % 2 === 0) rowCount += 1
    const startX = box.width / 2 - ((columnCount - 1) * cellWidth) / 2
    const startY = box.height / 2 - ((rowCount - 1) * cellHeight) / 2
    const angle = (-7 * Math.PI) / 180
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const marks: Array<{ text: string; x: number; y: number }> = []

    for (let row = 0; row < rowCount; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        const x = startX + column * cellWidth
        const y = startY + row * cellHeight
        const dx = x - box.width / 2
        const dy = y - box.height / 2
        const screenX = box.width / 2 + dx * cosine - dy * sine
        const screenY = box.height / 2 + dx * sine + dy * cosine
        if (
          Math.abs(screenX - box.width / 2) < 164 &&
          Math.abs(screenY - box.height / 2) < 128
        ) {
          continue
        }
        marks.push({ text: unit, x, y })
      }
    }

    if (isCancelled()) return

    const context = box.context
    context.save()
    context.translate(box.width / 2, box.height / 2)
    context.rotate(angle)
    context.translate(-box.width / 2, -box.height / 2)
    context.font = font
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    paintMarks(context, marks, size, accent)
    context.restore()
    canvas.dataset.stampMode = 'pretext'
  } catch {
    if (!canvas.dataset.stampMode) paintFallback(canvas)
  }
}

function hasSegmenter() {
  try {
    return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  } catch {
    return false
  }
}

export function startBootStamp(canvas: HTMLCanvasElement): () => void {
  let cancelled = false
  const isCancelled = () => cancelled

  if (!hasSegmenter()) {
    paintFallback(canvas)
    return () => {
      cancelled = true
    }
  }

  void paintPretext(canvas, isCancelled)
  const fallbackTimer = setTimeout(() => {
    if (!cancelled && !canvas.dataset.stampMode) paintFallback(canvas)
  }, 900)

  return () => {
    cancelled = true
    clearTimeout(fallbackTimer)
  }
}
