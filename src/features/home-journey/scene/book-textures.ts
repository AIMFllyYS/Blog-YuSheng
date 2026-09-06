import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { JOURNEY_CONTENT } from '../content'
import { seededUnit } from '../motion/math'
import type { JourneyPalette } from './palette'

const FONT_STACK =
  '600 96px "Noto Serif CJK", "Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, serif'

function withAlpha(value: string, opacity: number): string {
  const color = new Color(value).convertLinearToSRGB()
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity})`
}

function configureTexture(texture: CanvasTexture): CanvasTexture {
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Ink-cloth cover texture. It deliberately contains no title so it can be
 * reused on the lower board and the hinged board without mirrored lettering. */
export function createCoverTexture(
  palette: JourneyPalette,
  seed: number,
): CanvasTexture {
  const canvas = makeCanvas(1024, 704)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('book cover texture: 2d context unavailable')

  const gradient = context.createLinearGradient(0, 0, 1024, 704)
  gradient.addColorStop(0, palette.nebula)
  gradient.addColorStop(0.4, palette.nebulaDeep)
  gradient.addColorStop(0.73, palette.voidRaised)
  gradient.addColorStop(1, palette.nebula)
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 704)

  context.save()
  context.globalCompositeOperation = 'screen'
  for (let index = 0; index < 3600; index += 1) {
    const x = seededUnit(seed, index, 'cover-x') * 1024
    const y = seededUnit(seed, index, 'cover-y') * 704
    const length = 2 + seededUnit(seed, index, 'cover-length') * 12
    const alpha = 0.018 + seededUnit(seed, index, 'cover-alpha') * 0.038
    context.strokeStyle = withAlpha(palette.paperEdge, alpha)
    context.lineWidth = 0.45 + seededUnit(seed, index, 'cover-width') * 0.55
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + length, y + 0.8)
    context.stroke()
  }
  context.restore()

  // Two crossing fiber directions form a restrained, woven cloth grain.
  context.strokeStyle = palette.paperEdge
  context.lineWidth = 0.6
  context.globalAlpha = 0.07
  for (let x = 1; x < 1024; x += 4) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x + 2, 704)
    context.stroke()
  }
  context.globalAlpha = 0.035
  for (let y = 1; y < 704; y += 3) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(1024, y)
    context.stroke()
  }

  context.strokeStyle = palette.gold
  context.globalAlpha = 0.72
  context.lineWidth = 3
  context.strokeRect(42, 38, 940, 628)
  context.globalAlpha = 0.38
  context.lineWidth = 1
  context.strokeRect(58, 54, 908, 596)
  context.globalAlpha = 1

  return configureTexture(new CanvasTexture(canvas))
}

/** Vertical title plaque used as a separate decal so it stays legible while
 * the cover pivots. */
export function createTitleTexture(
  palette: JourneyPalette,
): CanvasTexture {
  const canvas = makeCanvas(256, 640)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('book title texture: 2d context unavailable')

  context.fillStyle = palette.paper
  context.fillRect(14, 14, 228, 612)
  context.strokeStyle = palette.gold
  context.globalAlpha = 0.82
  context.lineWidth = 4
  context.strokeRect(18, 18, 220, 604)
  context.globalAlpha = 0.34
  context.lineWidth = 1
  context.strokeRect(28, 28, 200, 584)
  context.globalAlpha = 1

  context.fillStyle = palette.ink
  context.font = FONT_STACK
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const chars = Array.from(JOURNEY_CONTENT.bookTitle)
  chars.forEach((char, index) => {
    context.fillText(char, 128, 156 + index * 150)
  })

  context.fillStyle = palette.gold
  context.globalAlpha = 0.72
  context.font = '600 18px "Noto Serif CJK", "Source Han Serif SC", serif'
  context.fillText('羽升 · 集', 128, 566)
  context.globalAlpha = 1

  return configureTexture(new CanvasTexture(canvas))
}

/**
 * Page texture with real vertical Chinese typography. The copy is intentionally
 * sparse: this is a cinematic prop, not a second readable article surface.
 */
export function createPageTexture(
  palette: JourneyPalette,
  seed: number,
): CanvasTexture {
  const canvas = makeCanvas(1024, 768)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('book page texture: 2d context unavailable')

  context.fillStyle = palette.paper
  context.fillRect(0, 0, 1024, 768)

  for (let index = 0; index < 520; index += 1) {
    const x = seededUnit(seed, index, 'page-fiber-x') * 1024
    const y = seededUnit(seed, index, 'page-fiber-y') * 768
    const length = 4 + seededUnit(seed, index, 'page-fiber-length') * 30
    const angle = seededUnit(seed, index, 'page-fiber-angle') * Math.PI
    context.strokeStyle = withAlpha(palette.ink, 0.014 + seededUnit(seed, index, 'page-fiber-alpha') * 0.035)
    context.lineWidth = 0.35 + seededUnit(seed, index, 'page-fiber-width') * 0.55
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    context.stroke()
  }

  const edgeGradient = context.createRadialGradient(512, 384, 170, 512, 384, 600)
  edgeGradient.addColorStop(0, withAlpha(palette.paperEdge, 0))
  edgeGradient.addColorStop(1, withAlpha(palette.ink, 0.12))
  context.fillStyle = edgeGradient
  context.fillRect(0, 0, 1024, 768)

  // Each column is a complete phrase, read top-to-bottom, then right-to-left.
  // Seeded randomness is only for the paper fibers, never for the written copy.
  const columns = [
    ...JOURNEY_CONTENT.narrative.split(/[，。]/u),
    ...JOURNEY_CONTENT.motto.split(' '),
    ...JOURNEY_CONTENT.gateLine.split('，'),
  ].filter(Boolean)
  context.fillStyle = palette.ink
  context.globalAlpha = 0.74
  context.font = '500 42px "Noto Serif CJK", "Source Han Serif SC", "Songti SC", SimSun, serif'
  context.textAlign = 'center'
  context.textBaseline = 'top'
  columns.forEach((column, columnIndex) => {
    const x = 850 - columnIndex * 130
    Array.from(column).forEach((character, row) => {
      context.fillText(character, x, 96 + row * 56)
    })
  })
  context.globalAlpha = 1

  context.fillStyle = palette.ink
  context.globalAlpha = 0.56
  context.font = '400 18px "Noto Serif CJK", "Source Han Serif SC", SimSun, serif'
  context.fillText(`${JOURNEY_CONTENT.bookTitle} · 序`, 512, 696)

  context.strokeStyle = palette.paperEdge
  context.globalAlpha = 0.65
  context.lineWidth = 2
  context.strokeRect(24, 24, 976, 720)
  context.globalAlpha = 1

  return configureTexture(new CanvasTexture(canvas))
}

export type BookTextureBundle = {
  cover: CanvasTexture
  title: CanvasTexture
  pages: CanvasTexture
}

export function createBookTextureBundle(
  palette: JourneyPalette,
  seed: number,
): BookTextureBundle {
  return {
    cover: createCoverTexture(palette, seed),
    title: createTitleTexture(palette),
    pages: createPageTexture(palette, seed ^ 0x1f2e3d),
  }
}

export function disposeBookTextureBundle(bundle: BookTextureBundle): void {
  Object.values(bundle).forEach((texture: Texture) => texture.dispose())
}
