import type { JourneySceneName } from '../types'

export const STORY_BEATS = [
  0,
  0.03,
  0.1,
  0.2,
  0.25,
  0.32,
  0.42,
  0.48,
  0.5,
  0.56,
  0.66,
  0.72,
  0.75,
  0.82,
  0.88,
  0.95,
  1,
] as const

export const CHAPTER_ENDS = [0, 0.25, 0.5, 0.75, 1] as const

export function getChapterSnapTarget(progress: number, direction: number) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1

  const chapterLength = 0.25
  const chapterIndex = Math.min(3, Math.floor(progress / chapterLength))
  const chapterStart = chapterIndex * chapterLength
  const chapterEnd = chapterStart + chapterLength
  const localProgress = (progress - chapterStart) / chapterLength

  if (direction < 0) {
    return localProgress <= 0.6 ? chapterStart : chapterEnd
  }

  return localProgress >= 0.4 ? chapterEnd : chapterStart
}

export function getJourneyScene(progress: number): JourneySceneName {
  if (progress < 0.03) return 'prologue'
  if (progress < 0.245) return 'scatter'
  if (progress < 0.255) return 'scatter-end'
  if (progress < 0.495) return 'gather'
  if (progress < 0.505) return 'gather-end'
  if (progress < 0.745) return 'open'
  if (progress < 0.755) return 'open-end'
  if (progress < 0.95) return 'gate'
  if (progress < 0.995) return 'gate-pass'
  return 'epilogue'
}
