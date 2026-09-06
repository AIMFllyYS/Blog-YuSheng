import { seededUnit } from './math'
import type { TypographyLayout } from './pretext-layout'

type Point = { x: number; y: number }

export type TitleFragment = {
  id: string
  sourceChar: string
  sourceWidth: number
  glyphIndex: number
  cellX: number
  cellY: number
  cellWidth: number
  cellHeight: number
  homeX: number
  homeY: number
  originX: number
  originY: number
  clipPath: string
  scatterX: number
  scatterY: number
  scatterZ: number
  scatterRotation: number
  scatterTiltX: number
  scatterTiltY: number
  swirlX: number
  swirlY: number
  collapseX: number
  collapseY: number
}

const GRID_SIZE = 4
const SEED = 20260815

/** A shared, jittered lattice guarantees that adjacent triangles never leave holes. */
function latticePoint(glyphIndex: number, column: number, row: number): Point {
  const id = `${glyphIndex}:${column}:${row}`
  const xJitter = column === 0 || column === GRID_SIZE
    ? 0
    : (seededUnit(SEED, id, 'vertex-x') - 0.5) * 0.44
  const yJitter = row === 0 || row === GRID_SIZE
    ? 0
    : (seededUnit(SEED, id, 'vertex-y') - 0.5) * 0.44

  return { x: (column + xJitter) / GRID_SIZE, y: (row + yJitter) / GRID_SIZE }
}

function triangleFor(glyphIndex: number, index: number): Point[] {
  const cell = Math.floor(index / 2)
  const column = cell % GRID_SIZE
  const row = Math.floor(cell / GRID_SIZE)
  const a = latticePoint(glyphIndex, column, row)
  const b = latticePoint(glyphIndex, column + 1, row)
  const c = latticePoint(glyphIndex, column + 1, row + 1)
  const d = latticePoint(glyphIndex, column, row + 1)
  const diagonal = (column + row) % 2

  if (diagonal === 0) return index % 2 === 0 ? [a, b, c] : [a, c, d]
  return index % 2 === 0 ? [a, b, d] : [b, c, d]
}

/** Source windows stay in Pretext's exact CSS-pixel coordinate system. */
export function createTitleFragments(layout: TypographyLayout): TitleFragment[] {
  return layout.title.flatMap((glyph, glyphIndex) =>
    Array.from({ length: GRID_SIZE * GRID_SIZE * 2 }, (_, index) => {
      const id = `title-fragment-${glyphIndex * GRID_SIZE * GRID_SIZE * 2 + index}`
      const sourceHeight = layout.styles.title.fontSize
      const vertices = triangleFor(glyphIndex, index).map((point) => ({
        x: point.x * glyph.width,
        y: point.y * sourceHeight,
      }))
      const cellX = Math.min(...vertices.map((point) => point.x))
      const cellY = Math.min(...vertices.map((point) => point.y))
      const cellWidth = Math.max(...vertices.map((point) => point.x)) - cellX
      const cellHeight = Math.max(...vertices.map((point) => point.y)) - cellY
      const centerX = vertices.reduce((sum, point) => sum + point.x, 0) / 3
      const centerY = vertices.reduce((sum, point) => sum + point.y, 0) / 3
      const homeX = glyph.x - glyph.width / 2 + cellX
      const homeY = cellY
      const globalCenterX = glyph.x - glyph.width / 2 + centerX
      const globalCenterY = centerY - sourceHeight / 2
      const angle = Math.atan2(globalCenterY, globalCenterX) +
        (seededUnit(SEED, id, 'scatter-angle') - 0.5) * 0.9
      const scatterRadius = sourceHeight * (0.9 + seededUnit(SEED, id, 'scatter-radius') * 1.6)
      const ringIndex = glyphIndex * GRID_SIZE * GRID_SIZE * 2 + index
      const swirlAngle = ringIndex * 0.63 + glyphIndex * Math.PI
      const swirlRadius = sourceHeight * (0.58 + seededUnit(SEED, id, 'swirl-radius') * 0.62)
      const clipPath = `polygon(${vertices.map((point) =>
        `${((point.x - cellX) / cellWidth * 100).toFixed(4)}% ${((point.y - cellY) / cellHeight * 100).toFixed(4)}%`,
      ).join(', ')})`

      return {
        id,
        sourceChar: glyph.char,
        sourceWidth: glyph.width,
        glyphIndex,
        cellX,
        cellY,
        cellWidth,
        cellHeight,
        homeX,
        homeY,
        originX: centerX - cellX,
        originY: centerY - cellY,
        clipPath,
        scatterX: Math.cos(angle) * scatterRadius - globalCenterX,
        scatterY: Math.sin(angle) * scatterRadius * 0.68 - globalCenterY,
        scatterZ: (seededUnit(SEED, id, 'scatter-depth') - 0.5) * 180,
        scatterRotation: (seededUnit(SEED, id, 'scatter-rotation') - 0.5) * 112,
        scatterTiltX: (seededUnit(SEED, id, 'scatter-tilt-x') - 0.5) * 68,
        scatterTiltY: (seededUnit(SEED, id, 'scatter-tilt-y') - 0.5) * 74,
        swirlX: Math.cos(swirlAngle) * swirlRadius - globalCenterX,
        swirlY: Math.sin(swirlAngle) * swirlRadius * 0.44 - globalCenterY,
        collapseX: -globalCenterX,
        collapseY: -globalCenterY,
      }
    }),
  )
}
