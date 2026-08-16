import { seededUnit } from '../motion/math'

const FULL_TURN = Math.PI * 2

export type PointCloudData = {
  positions: Float32Array
  sizes: Float32Array
  alphas: Float32Array
}

export type GlyphStroke = {
  angle: number
  depth: number
  radius: number
  scatterX: number
  scatterY: number
  scatterZ: number
  strokeAngle: number
  strokeLength: number
  strokeOffsetX: number
  strokeOffsetY: number
}

export function createStarCloud(count: number, seed: number): PointCloudData {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const radial = Math.sqrt(seededUnit(seed, index, 'radial'))
    const angle = seededUnit(seed, index, 'angle') * FULL_TURN
    const flattenedRadius = 18 * radial

    positions[index * 3] = Math.cos(angle) * flattenedRadius
    positions[index * 3 + 1] = Math.sin(angle) * flattenedRadius * 0.62
    positions[index * 3 + 2] = 8 - seededUnit(seed, index, 'depth') * 43
    sizes[index] = 0.48 + seededUnit(seed, index, 'size') * 1.9
    alphas[index] = 0.24 + seededUnit(seed, index, 'alpha') * 0.72
  }

  return { positions, sizes, alphas }
}

export function createDustCloud(count: number, seed: number): PointCloudData {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const angle = seededUnit(seed, index, 'angle') * FULL_TURN
    const radius = 1.4 + seededUnit(seed, index, 'radius') * 8.4

    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] =
      Math.sin(angle) * radius * 0.54 +
      (seededUnit(seed, index, 'vertical') - 0.5) * 2.2
    positions[index * 3 + 2] = 4 - seededUnit(seed, index, 'depth') * 18
    sizes[index] = 0.34 + seededUnit(seed, index, 'size') * 1.18
    alphas[index] = 0.16 + seededUnit(seed, index, 'alpha') * 0.48
  }

  return { positions, sizes, alphas }
}

export function createGlyphStrokes(
  glyphCount: number,
  seed: number,
): GlyphStroke[] {
  return Array.from({ length: glyphCount * 3 }, (_, index) => {
    const glyphIndex = Math.floor(index / 3)
    const strokeIndex = index % 3
    const radiusUnit =
      (glyphIndex + seededUnit(seed, glyphIndex, 'radius-jitter')) / glyphCount
    const arm = glyphIndex % 3
    const angle =
      (arm / 3) * FULL_TURN + radiusUnit * Math.PI * 5.8 +
      (seededUnit(seed, glyphIndex, 'angle-jitter') - 0.5) * 0.18
    const strokeAngles = [0, Math.PI / 2, Math.PI / 4]

    return {
      angle,
      depth: (seededUnit(seed, glyphIndex, 'depth') - 0.5) * 2.8,
      radius: 0.5 + radiusUnit * 5.2,
      scatterX: (seededUnit(seed, glyphIndex, 'scatter-x') - 0.5) * 13,
      scatterY: (seededUnit(seed, glyphIndex, 'scatter-y') - 0.5) * 7.4,
      scatterZ: (seededUnit(seed, glyphIndex, 'scatter-z') - 0.5) * 5.5,
      strokeAngle:
        strokeAngles[strokeIndex] +
        (seededUnit(seed, index, 'stroke-angle') - 0.5) * 0.18,
      strokeLength: 0.55 + seededUnit(seed, index, 'stroke-length') * 0.52,
      strokeOffsetX: (strokeIndex - 1) * 0.11,
      strokeOffsetY:
        (seededUnit(seed, index, 'stroke-offset-y') - 0.5) * 0.2,
    }
  })
}

export function createCoverFibers(seed: number): Float32Array {
  const fiberCount = 46
  const positions = new Float32Array(fiberCount * 6)

  for (let index = 0; index < fiberCount; index += 1) {
    const y = -1.48 + seededUnit(seed, index, 'fiber-y') * 2.96
    const x = -2.22 + seededUnit(seed, index, 'fiber-x') * 4.42
    const length = 0.18 + seededUnit(seed, index, 'fiber-length') * 0.82
    const slant = (seededUnit(seed, index, 'fiber-slant') - 0.5) * 0.05
    const offset = index * 6

    positions[offset] = x
    positions[offset + 1] = y
    positions[offset + 2] = 0
    positions[offset + 3] = Math.min(2.2, x + length)
    positions[offset + 4] = y + slant
    positions[offset + 5] = 0
  }

  return positions
}
