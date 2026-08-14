import type { RefObject } from 'react'

export type JourneyMode = 'pending' | 'cinematic' | 'mobile' | 'reduced'

export type JourneySceneName =
  | 'prologue'
  | 'scatter'
  | 'scatter-end'
  | 'gather'
  | 'gather-end'
  | 'open'
  | 'open-end'
  | 'gate'
  | 'gate-pass'
  | 'epilogue'

export type JourneyProgressSnapshot = {
  progress: number
  qaFreeze: boolean
}
export type JourneyProgressRef = RefObject<JourneyProgressSnapshot>

export type JourneyScene3DProps = {
  progressRef: JourneyProgressRef
  onCanvasReady?: () => void
}
