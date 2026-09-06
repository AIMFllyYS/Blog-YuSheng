export type JourneyFrameloop = 'always' | 'demand'
export type JourneyRenderQuality = 'high' | 'low'

export const JOURNEY_MAX_DPR = 1.6
export const JOURNEY_IDLE_PROGRESS = 0.95

export type JourneyRenderConditions = {
  diagnostics: boolean
  qaFreeze: boolean
  progress: number
  documentVisible: boolean
  inViewport: boolean
}

export function isJourneyRenderActive({
  documentVisible,
  inViewport,
}: Pick<JourneyRenderConditions, 'documentVisible' | 'inViewport'>) {
  return documentVisible && inViewport
}

export function getJourneyFrameloop(
  conditions: JourneyRenderConditions,
): JourneyFrameloop {
  return isJourneyRenderActive(conditions) &&
    !conditions.diagnostics &&
    !conditions.qaFreeze &&
    conditions.progress < JOURNEY_IDLE_PROGRESS
    ? 'always'
    : 'demand'
}

const SAMPLE_FRAMES = 45
const COOLDOWN_SECONDS = 2.5
const MAX_FRAME_SECONDS = 0.25
const UPGRADE_WINDOWS = 3

export type JourneyQualitySampler = {
  quality: JourneyRenderQuality
  frameCount: number
  elapsed: number
  cooldown: number
  fastWindows: number
}

export function createJourneyQualitySampler(
  quality: JourneyRenderQuality = 'high',
): JourneyQualitySampler {
  return { quality, frameCount: 0, elapsed: 0, cooldown: 0, fastWindows: 0 }
}

export function resetJourneyQualityWindow(sample: JourneyQualitySampler) {
  sample.frameCount = 0
  sample.elapsed = 0
  sample.fastWindows = 0
}

/**
 * A constant-space sampler owned by a ref, never React state. Complete windows
 * and separate recovery thresholds prevent one slow frame from changing DPR.
 */
export function sampleJourneyQuality(
  sample: JourneyQualitySampler,
  deltaSeconds: number,
): JourneyRenderQuality | null {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return null

  // A resumed tab or a demand-render gap is not a measure of GPU throughput.
  if (deltaSeconds >= MAX_FRAME_SECONDS) {
    resetJourneyQualityWindow(sample)
    return null
  }

  if (sample.cooldown > 0) {
    sample.cooldown = Math.max(0, sample.cooldown - deltaSeconds)
    return null
  }

  sample.frameCount += 1
  sample.elapsed += deltaSeconds
  if (sample.frameCount < SAMPLE_FRAMES) return null

  const average = sample.elapsed / sample.frameCount
  sample.frameCount = 0
  sample.elapsed = 0

  if (sample.quality === 'high') {
    if (average <= 1 / 44) return null
    sample.quality = 'low'
  } else {
    sample.fastWindows = average < 1 / 57 ? sample.fastWindows + 1 : 0
    if (sample.fastWindows < UPGRADE_WINDOWS) return null
    sample.quality = 'high'
  }

  sample.fastWindows = 0
  sample.cooldown = COOLDOWN_SECONDS
  return sample.quality
}

export function getJourneyDpr(
  quality: JourneyRenderQuality,
  deviceDpr: number,
) {
  if (quality === 'low') return 1
  const safeDpr = Number.isFinite(deviceDpr) ? deviceDpr : 1
  return Math.max(1, Math.min(safeDpr, JOURNEY_MAX_DPR))
}
