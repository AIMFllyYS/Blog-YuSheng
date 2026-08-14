/**
 * 字形图集：把活字（标题/副句/叙事句/字池/符文/标题碎片）渲染到一张 canvas，
 * GL 粒子按 UV 采样。字形绘制为白色亮度图，颜色与渐变全部由 shader 决定。
 * 两级格元：标题字符与碎片用大格（保证主标题清晰度），其余用小格。
 */
import {
  GLYPH_POOL,
  JOURNEY_COPY,
  JOURNEY_FONT_STACK,
  RUNE_POOL,
} from '../constants'

export interface UvRect {
  u0: number
  v0: number
  u1: number
  v1: number
}

export interface GlyphAtlas {
  canvas: HTMLCanvasElement
  /** slot → UV 矩形 */
  rects: UvRect[]
  /** 普通字 → slot */
  charSlot: Map<string, number>
  /** 标题/副句字 → 符文变体 slot */
  runeSlot: Map<string, number>
  /** 字池 slot 列表（filler 粒子取用） */
  poolSlots: number[]
  /** 叙事句用字 → slot（lineGather 时改写 filler 字形） */
  narrativeSlot: Map<string, number>
}

const ATLAS_SIZE = 2048
const BIG_CELL = 256
const SMALL_CELL = 128
const BIG_GLYPH_PX = 224
const SMALL_GLYPH_PX = 108

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  char: string,
  cx: number,
  cy: number,
  px: number,
  clip?: { x: number; y: number; w: number; h: number },
): void {
  ctx.save()
  if (clip) {
    ctx.beginPath()
    ctx.rect(clip.x, clip.y, clip.w, clip.h)
    ctx.clip()
  }
  ctx.font = `600 ${px}px ${JOURNEY_FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(char, cx, cy)
  ctx.restore()
}

/** 构建图集（纯浏览器 API，仅在客户端调用） */
export function buildGlyphAtlas(): GlyphAtlas {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_SIZE
  canvas.height = ATLAS_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('glyph-atlas: 2d context unavailable')
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE)

  const rects: UvRect[] = []
  const charSlot = new Map<string, number>()
  const runeSlot = new Map<string, number>()
  const narrativeSlot = new Map<string, number>()
  const poolSlots: number[] = []

  const pushRect = (x: number, y: number, size: number): number => {
    rects.push({
      u0: x / ATLAS_SIZE,
      v0: 1 - (y + size) / ATLAS_SIZE,
      u1: (x + size) / ATLAS_SIZE,
      v1: 1 - y / ATLAS_SIZE,
    })
    return rects.length - 1
  }

  // 大格区：顶部 4 行 × 8 列（标题字完整字形，序幕用大格保证清晰；
  // 标题碎片不单独绘制——由编排层取字符格元的子 UV，天然无接缝）
  const bigCols = Math.floor(ATLAS_SIZE / BIG_CELL)
  let bigIndex = 0
  const nextBigCell = (): { x: number; y: number } => {
    const col = bigIndex % bigCols
    const row = Math.floor(bigIndex / bigCols)
    bigIndex += 1
    return { x: col * BIG_CELL, y: row * BIG_CELL }
  }

  const titleChars = [...new Set(JOURNEY_COPY.title.split(''))]
  const subChars = [...new Set(JOURNEY_COPY.subtitle.replaceAll(' ', '').split(''))]

  for (const char of titleChars) {
    const { x, y } = nextBigCell()
    drawGlyph(ctx, char, x + BIG_CELL / 2, y + BIG_CELL / 2, BIG_GLYPH_PX)
    charSlot.set(char, pushRect(x, y, BIG_CELL))
  }

  // 小格区：剩余空间
  const smallOriginY = BIG_CELL * Math.ceil((bigIndex + bigCols) / bigCols)
  const smallCols = Math.floor(ATLAS_SIZE / SMALL_CELL)
  const smallRows = Math.floor((ATLAS_SIZE - smallOriginY) / SMALL_CELL)
  const smallCapacity = smallCols * smallRows
  let smallIndex = 0
  const nextSmallCell = (): { x: number; y: number } | null => {
    if (smallIndex >= smallCapacity) return null
    const col = smallIndex % smallCols
    const row = Math.floor(smallIndex / smallCols)
    smallIndex += 1
    return { x: col * SMALL_CELL, y: smallOriginY + row * SMALL_CELL }
  }
  const addSmallGlyph = (char: string, px = SMALL_GLYPH_PX): number | null => {
    const cell = nextSmallCell()
    if (!cell) return null
    drawGlyph(ctx, char, cell.x + SMALL_CELL / 2, cell.y + SMALL_CELL / 2, px)
    return pushRect(cell.x, cell.y, SMALL_CELL)
  }

  // 副句字符
  for (const char of subChars) {
    if (charSlot.has(char)) continue
    const slot = addSmallGlyph(char)
    if (slot !== null) charSlot.set(char, slot)
  }
  // 符文变体（标题 + 副句逐字对应一个符文）
  const enchanted = [...new Set([...titleChars, ...subChars])]
  enchanted.forEach((char, i) => {
    const slot = addSmallGlyph(RUNE_POOL[i % RUNE_POOL.length])
    if (slot !== null) runeSlot.set(char, slot)
  })
  // 叙事句用字（去重；空格/标点跳过）
  for (const char of JOURNEY_COPY.narrativeLine) {
    if (char.trim() === '' || char === '，' || narrativeSlot.has(char)) continue
    if (charSlot.has(char)) {
      narrativeSlot.set(char, charSlot.get(char) as number)
      continue
    }
    const slot = addSmallGlyph(char)
    if (slot !== null) {
      narrativeSlot.set(char, slot)
      charSlot.set(char, slot)
    }
  }
  // 字池（道德经用字，供 filler/文字雨）
  for (const char of new Set(GLYPH_POOL.split(''))) {
    if (charSlot.has(char)) {
      poolSlots.push(charSlot.get(char) as number)
      continue
    }
    const slot = addSmallGlyph(char)
    if (slot !== null) {
      charSlot.set(char, slot)
      poolSlots.push(slot)
    }
  }

  return { canvas, rects, charSlot, runeSlot, narrativeSlot, poolSlots }
}
