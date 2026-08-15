'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { RefObject } from 'react'

export type MotionBuildContext = {
  timeline: gsap.core.Timeline
  scope: HTMLElement
  fps: 24 | 30 | 60
  durationInFrames: number
  frames: (count: number) => number
  seed: number
}

type BuildTimeline = (context: MotionBuildContext) => void

type TimelineOptions = {
  fps: 24 | 30 | 60
  durationInFrames: number
  seed: number
  onTimelineChange?: (timeline: gsap.core.Timeline | null) => void
  attachTimeline?: (
    timeline: gsap.core.Timeline,
    root: HTMLElement,
  ) => void | (() => void)
  dependencies?: unknown[]
}

gsap.registerPlugin(useGSAP)

export function useWebGsapTimeline(
  scope: RefObject<HTMLElement | null>,
  buildTimeline: BuildTimeline,
  options: TimelineOptions,
) {
  const dependencies = options.dependencies ?? []

  useGSAP(
    () => {
      if (!scope.current) return

      const timeline = gsap.timeline({ paused: true })
      options.onTimelineChange?.(timeline)

      buildTimeline({
        timeline,
        scope: scope.current,
        fps: options.fps,
        durationInFrames: options.durationInFrames,
        frames: (count) => count / options.fps,
        seed: options.seed,
      })

      const disposeAttachment = options.attachTimeline?.(timeline, scope.current)

      return () => {
        disposeAttachment?.()
        options.onTimelineChange?.(null)
        timeline.kill()
      }
    },
    {
      scope,
      dependencies,
      revertOnUpdate: true,
    },
  )
}
