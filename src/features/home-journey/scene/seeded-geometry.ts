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
  homeX: number
  homeY: number
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
    sizes[index] = 1.1 + Math.pow(seededUnit(seed, index, 'size'), 4) * 5.5
    alphas[index] = 0.48 + seededUnit(seed, index, 'alpha') * 0.52
  }

  return { positions, sizes, alphas }
}

/**
 * A deterministic logarithmic-spiral galaxy. The mild gaussian-like jitter
 * keeps the arms natural without introducing a texture or a runtime noise pass.
 */
export function createGalaxyCloud(count: number, seed: number): PointCloudData {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const arm = index % 4
    const radius = 1.2 + Math.pow(seededUnit(seed, index, 'radius'), 0.66) * 18.8
    const armAngle = arm * (FULL_TURN / 4)
    const spiralAngle = armAngle + radius * 0.27 + (seededUnit(seed, index, 'angle') - 0.5) * 0.68
    const lane = (seededUnit(seed, index, 'lane') - 0.5) * (0.28 + radius * 0.055)
    const x = Math.cos(spiralAngle) * radius + Math.cos(spiralAngle + Math.PI / 2) * lane
    const y = Math.sin(spiralAngle) * radius * 0.56 + Math.sin(spiralAngle + Math.PI / 2) * lane

    positions[index * 3] = x
    positions[index * 3 + 1] = y + (seededUnit(seed, index, 'vertical') - 0.5) * 0.34
    positions[index * 3 + 2] = 2.5 - radius * 0.62 - seededUnit(seed, index, 'depth') * 12
    sizes[index] = 0.36 + seededUnit(seed, index, 'size') * 1.55 + (radius < 3 ? 0.5 : 0)
    alphas[index] = 0.12 + seededUnit(seed, index, 'alpha') * 0.46
  }

  return { positions, sizes, alphas }
}

export function createStarBand(count: number, seed: number): PointCloudData {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const x = (seededUnit(seed, index, 'x') - 0.5) * 24
    const center = Math.sin(x * 0.32) * 1.1
    const y = center + (seededUnit(seed, index, 'y') - 0.5) * (1.25 + Math.abs(x) * 0.08)

    positions[index * 3] = x
    positions[index * 3 + 1] = y
    positions[index * 3 + 2] = -1.5 - seededUnit(seed, index, 'depth') * 13
    sizes[index] = 0.28 + seededUnit(seed, index, 'size') * 1.25
    alphas[index] = 0.16 + seededUnit(seed, index, 'alpha') * 0.42
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
      homeX:
        (glyphIndex % 2 === 0 ? -0.88 : 0.88) +
        (seededUnit(seed, glyphIndex, 'home-x') - 0.5) * 0.24,
      homeY:
        (strokeIndex - 1) * 0.36 +
        (seededUnit(seed, glyphIndex, 'home-y') - 0.5) * 0.18,
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
