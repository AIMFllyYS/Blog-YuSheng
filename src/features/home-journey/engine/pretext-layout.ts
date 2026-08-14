/**
 * Pretext 活字布局（D17）：为「羽升」与副句算出每个字符的精确家位置。
 * Pretext 只负责「每个字该在哪」；何时飞、怎么飞归 GSAP 频道；画出来归 Three.js。
 * 单位：CSS px（以视口为参照），世界坐标映射由场景层完成。
 */
import { layoutWithLines, measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext'
import { JOURNEY_COPY, JOURNEY_FONT_STACK, TYPE_SCALE } from '../constants'

export interface LaidOutChar {
  char: string
  /** 字符中心相对整行中心的 x（px，右为正） */
  x: number
  /** 字符中心的 y（px，下为正；单行即行中心） */
  y: number
  /** 字宽（px） */
  width: number
  /** 字号（px） */
  fontSize: number
}

export interface LaidOutLine {
  chars: LaidOutChar[]
  fontSize: number
  lineWidth: number
}

function fontOf(sizePx: number, weight: number): string {
  return `${weight} ${sizePx}px ${JOURNEY_FONT_STACK}`
}

/** 用 Pretext 排单行文本并回算逐字中心坐标（水平居中于 0） */
function layoutSingleLine(text: string, fontSize: number, weight: number, centerY: number): LaidOutLine {
  const font = fontOf(fontSize, weight)
  // 整行：Pretext 排版得行宽（maxWidth 给足，保证单行）
  const preparedLine = prepareWithSegments(text, font)
  const { lines } = layoutWithLines(preparedLine, Number.MAX_SAFE_INTEGER / 4, fontSize * 1.2)
  const lineWidth = lines[0]?.width ?? measureNaturalWidth(preparedLine)

  // 逐字：Pretext 测量每个字符的自宽，累计得家位置
  const chars: LaidOutChar[] = []
  let cursor = -lineWidth / 2
  for (const char of text) {
    if (char === ' ') {
      // 空格不生成粒子，只占位
      const w = measureNaturalWidth(prepareWithSegments(' ', font))
      cursor += w
      continue
    }
    const width = measureNaturalWidth(prepareWithSegments(char, font))
    chars.push({ char, x: cursor + width / 2, y: centerY, width, fontSize })
    cursor += width
  }
  return { chars, fontSize, lineWidth }
}

export interface JourneyTypeLayout {
  title: LaidOutLine
  subtitle: LaidOutLine
  /** 主标题字号（px），供 DOM 首屏 overlay 对齐用 */
  titleFontSize: number
  subtitleFontSize: number
}

/**
 * 计算序幕文字布局（响应视口；resize 时重算）。
 * 坐标系：px，主标题中心为 (0, 0)，y 向下为正。
 */
export function layoutJourneyType(viewportWidthPx: number): JourneyTypeLayout {
  const titleFontSize = Math.min(viewportWidthPx * TYPE_SCALE.titleVwFactor, TYPE_SCALE.titleMaxPx)
  const subtitleFontSize = Math.min(
    viewportWidthPx * TYPE_SCALE.subtitleVwFactor,
    TYPE_SCALE.subtitleMaxPx,
  )
  const title = layoutSingleLine(JOURNEY_COPY.title, titleFontSize, 600, 0)
  const subtitleY = titleFontSize * TYPE_SCALE.subtitleGapFactor + subtitleFontSize / 2
  const subtitle = layoutSingleLine(JOURNEY_COPY.subtitle, subtitleFontSize, 500, subtitleY)
  return { title, subtitle, titleFontSize, subtitleFontSize }
}
