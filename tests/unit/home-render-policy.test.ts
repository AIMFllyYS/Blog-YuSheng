import { describe, expect, it } from 'vitest'
import {
  createJourneyQualitySampler,
  getJourneyDpr,
  getJourneyFrameloop,
  isJourneyRenderActive,
  resetJourneyQualityWindow,
  sampleJourneyQuality,
  type JourneyQualitySampler,
  type JourneyRenderConditions,
} from '../../src/features/home-journey/motion/render-policy'

const visible: JourneyRenderConditions = {
  diagnostics: false,
  qaFreeze: false,
  progress: 0.5,
  documentVisible: true,
  inViewport: true,
}

function feedFrames(sample: JourneyQualitySampler, count: number, fps: number) {
  for (let frame = 0; frame < count; frame += 1) {
    sampleJourneyQuality(sample, 1 / fps)
  }
}

describe('homepage canvas render gating', () => {
  it('runs continuously only while the narrative is visible and moving', () => {
    expect(getJourneyFrameloop(visible)).toBe('always')
    expect(getJourneyFrameloop({ ...visible, progress: 0.9499 })).toBe('always')
    expect(getJourneyFrameloop({ ...visible, progress: 0.95 })).toBe('demand')
  })

  it.each([
    { documentVisible: false, inViewport: true },
    { documentVisible: true, inViewport: false },
    { documentVisible: false, inViewport: false },
  ])('combines tab and viewport gates: %j', (gates) => {
    const conditions = { ...visible, ...gates }
    expect(getJourneyFrameloop(conditions)).toBe('demand')
    expect(isJourneyRenderActive(conditions)).toBe(false)
  })

  it('does not wake an offscreen canvas when the tab becomes visible again', () => {
    const offscreen = { ...visible, inViewport: false, documentVisible: false }
    expect(getJourneyFrameloop({ ...offscreen, documentVisible: true })).toBe('demand')
    expect(getJourneyFrameloop({ ...offscreen, inViewport: true })).toBe('demand')
    expect(getJourneyFrameloop(visible)).toBe('always')
  })

  it('keeps both diagnostics and frozen QA deterministic, but allows requested frames', () => {
    const diagnostics = { ...visible, diagnostics: true }
    expect(getJourneyFrameloop(diagnostics)).toBe('demand')
    expect(getJourneyFrameloop({ ...visible, qaFreeze: true })).toBe('demand')
    expect(isJourneyRenderActive(diagnostics)).toBe(true)
  })
})

describe('homepage adaptive quality policy', () => {
  it('keeps the initial quality through an incomplete window or a lone slow frame', () => {
    const sample = createJourneyQualitySampler()
    feedFrames(sample, 20, 60)
    sampleJourneyQuality(sample, 0.08)
    feedFrames(sample, 24, 60)
    expect(sample.quality).toBe('high')
    expect(sample.frameCount).toBe(0)
    expect(sample.elapsed).toBe(0)
  })

  it('reduces DPR after a complete sustained slow window', () => {
    const sample = createJourneyQualitySampler()
    feedFrames(sample, 44, 30)
    expect(sample.quality).toBe('high')
    expect(sampleJourneyQuality(sample, 1 / 30)).toBe('low')
    expect(sample.quality).toBe('low')
    expect(sample.cooldown).toBeGreaterThan(0)
  })

  it('uses a cooldown and requires sustained recovery before increasing DPR', () => {
    const sample = createJourneyQualitySampler('low')
    sample.cooldown = 2
    feedFrames(sample, 90, 60)
    expect(sample.quality).toBe('low')
    expect(sample.frameCount).toBe(0)
    sample.cooldown = 0
    feedFrames(sample, 90, 60)
    expect(sample.quality).toBe('low')
    feedFrames(sample, 45, 60)
    expect(sample.quality).toBe('high')
  })

  it('resets recovery when a window drops into the hysteresis band', () => {
    const sample = createJourneyQualitySampler('low')
    feedFrames(sample, 90, 60)
    feedFrames(sample, 45, 50)
    expect(sample.fastWindows).toBe(0)
    feedFrames(sample, 45, 60)
    expect(sample.quality).toBe('low')
  })

  it('ignores suspended-frame gaps and invalid deltas', () => {
    const sample = createJourneyQualitySampler()
    feedFrames(sample, 40, 30)
    sampleJourneyQuality(sample, 1)
    for (const delta of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sampleJourneyQuality(sample, delta)).toBeNull()
    }
    expect(sample.frameCount).toBe(0)
    expect(sample.elapsed).toBe(0)
    expect(sample.quality).toBe('high')
  })

  it('clears window history on demand-render transitions without changing quality', () => {
    const sample = createJourneyQualitySampler('low')
    feedFrames(sample, 70, 60)
    resetJourneyQualityWindow(sample)
    expect(sample).toEqual({
      quality: 'low', frameCount: 0, elapsed: 0, cooldown: 0, fastWindows: 0,
    })
  })

  it('bounds the device ratio for both quality levels', () => {
    expect(getJourneyDpr('low', 3)).toBe(1)
    expect(getJourneyDpr('high', 3)).toBe(1.6)
    expect(getJourneyDpr('high', 1.25)).toBe(1.25)
    expect(getJourneyDpr('high', 0.75)).toBe(1)
    expect(getJourneyDpr('high', Number.NaN)).toBe(1)
  })
})
