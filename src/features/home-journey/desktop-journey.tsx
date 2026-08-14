'use client'

import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useRef, useState } from 'react'
import { HomeShell } from './components/home-shell'
import { JourneyTypeLayer } from './components/journey-type-layer'
import { buildJourneyTimeline } from './motion/build-journey-timeline'
import { getChapterSnapTarget, getJourneyScene } from './motion/progress'
import { usePretextLayout } from './motion/use-pretext-layout'
import { useWebGsapTimeline } from './motion/use-web-gsap-timeline'
import { JourneyCanvas } from './scene'
import type { JourneyProgressSnapshot } from './types'

gsap.registerPlugin(ScrollTrigger)

function readQaProgress() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('qa') !== '1') return null
  const progress = Number(params.get('progress') ?? 0)
  if (!Number.isFinite(progress)) return 0
  return Math.min(1, Math.max(0, progress))
}

type MotionStageProps = {
  layout: NonNullable<ReturnType<typeof usePretextLayout>>
}

function MotionStage({ layout }: MotionStageProps) {
  const [qaProgress] = useState(readQaProgress)
  const isQa = qaProgress !== null
  const trackRef = useRef<HTMLElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const progressRef = useRef<JourneyProgressSnapshot>({
    progress: qaProgress ?? 0,
    qaFreeze: isQa,
  })
  const [canvasReady, setCanvasReady] = useState(false)
  const [timelineReady, setTimelineReady] = useState(false)

  const updateJourneyState = (timeline: gsap.core.Timeline, root: HTMLElement) => {
    const progress = timeline.progress()
    progressRef.current.progress = progress
    root.dataset.journeyProgress = progress.toFixed(4)
    root.dataset.journeyScene = getJourneyScene(progress)
  }

  useWebGsapTimeline(trackRef, buildJourneyTimeline, {
    fps: 60,
    durationInFrames: 601,
    seed: 20260815,
    onTimelineChange: (timeline) => {
      timelineRef.current = timeline
    },
    dependencies: [layout],
    attachTimeline: (timeline, root) => {
      root.dataset.journeyDuration = timeline.totalDuration().toFixed(4)
      timeline.eventCallback('onUpdate', () => updateJourneyState(timeline, root))

      if (isQa) {
        timeline.progress(qaProgress, false)
        updateJourneyState(timeline, root)
        setTimelineReady(true)
        return () => timeline.eventCallback('onUpdate', null)
      }

      const stage = stageRef.current
      if (!stage) return

      const trigger = ScrollTrigger.create({
        id: 'home-journey-master',
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        animation: timeline,
        scrub: 0.38,
        invalidateOnRefresh: true,
        snap: {
          snapTo: (value, self) =>
            getChapterSnapTarget(value, self?.direction ?? 1),
          duration: { min: 0.3, max: 0.62 },
          delay: 0.08,
          ease: 'power3.inOut',
          inertia: false,
        },
      })

      trigger.refresh()
      updateJourneyState(timeline, root)
      setTimelineReady(true)

      return () => {
        timeline.eventCallback('onUpdate', null)
        trigger.kill()
      }
    },
  })

  const handleSkip = () => {
    const timeline = timelineRef.current
    const root = trackRef.current
    if (!timeline || !root) return

    const flash = root.querySelector<HTMLElement>('[data-journey-flash]')
    const scrollTarget = root.offsetTop + root.offsetHeight - window.innerHeight
    const skipTimeline = gsap.timeline()

    if (flash) {
      skipTimeline.to(flash, {
        autoAlpha: 0.96,
        duration: 0.16,
        ease: 'power4.in',
      })
    }

    skipTimeline
      .call(() => {
        timeline.progress(1, false)
        updateJourneyState(timeline, root)
        window.scrollTo({ top: scrollTarget, behavior: 'auto' })
      })
      .to(flash ?? {}, {
        autoAlpha: 0,
        duration: 0.32,
        ease: 'power4.out',
      })
  }

  const ready = canvasReady && timelineReady

  return (
    <section
      ref={trackRef}
      data-testid="home-journey"
      data-journey-mode="cinematic"
      data-journey-ready={ready ? 'true' : 'false'}
      data-journey-progress={(qaProgress ?? 0).toFixed(4)}
      data-journey-scene={getJourneyScene(qaProgress ?? 0)}
      data-journey-qa={isQa ? 'true' : 'false'}
      className="journey-stage relative h-[500vh] min-h-screen overflow-clip bg-[var(--journey-void)] text-[var(--journey-paper)]"
      aria-label="羽升首页叙事"
    >
      <div
        data-testid="journey-scroll-track"
        className="sticky top-0 h-screen w-full overflow-hidden bg-[var(--journey-void)]"
      >
        <div
          className="absolute inset-0"
          data-testid="journey-canvas"
        >
          <JourneyCanvas
            progressRef={progressRef}
            onCanvasReady={() => setCanvasReady(true)}
          />
        </div>

        <div className="journey-nebula pointer-events-none absolute inset-0" />
        <div className="journey-vignette pointer-events-none absolute inset-0" />

        <JourneyTypeLayer layout={layout} />

        <div
          data-home-shell-layer
          className="invisible pointer-events-none absolute inset-0 z-[var(--z-panel)] opacity-0"
        >
          <HomeShell mode="cinematic" />
        </div>

        <div
          data-journey-flash
          className="journey-flash invisible pointer-events-none absolute inset-0 z-[var(--z-overlay)] opacity-0"
        />

        <button
          type="button"
          data-testid="journey-skip"
          onClick={handleSkip}
          className="absolute right-[clamp(1rem,3vw,2.75rem)] top-[clamp(1rem,3vw,2.5rem)] z-[var(--z-nav)] min-h-11 rounded-full border border-[var(--line)] bg-[var(--bg-elevated)]/80 px-5 py-2 font-serif text-sm tracking-[0.12em] text-[var(--ink)] shadow-[0_12px_40px_var(--shadow-color)] backdrop-blur-md transition-[border-color,background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
        >
          跳过 ⤍ 直接入门
        </button>

        <div
          data-scroll-cue
          className="pointer-events-none absolute bottom-[clamp(1.5rem,4vh,3rem)] left-1/2 z-[var(--z-floating)] flex -translate-x-1/2 flex-col items-center gap-3 font-serif text-xs tracking-[0.34em] text-[var(--journey-gold-soft)]"
        >
          <span>向下 · 入卷</span>
          <span className="journey-scroll-mark block h-12 w-px" />
        </div>

        <p className="sr-only">
          向下滚动浏览四章叙事，也可以使用右上角跳过按钮直接进入主页。
        </p>

        {!ready ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-[var(--z-toast)] text-center font-serif text-xs tracking-[0.24em] text-[var(--journey-gold-soft)]">
            正在落墨…
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function DesktopJourney() {
  const layout = usePretextLayout()

  if (!layout) {
    return (
      <section
        data-testid="home-journey"
        data-journey-mode="cinematic"
        data-journey-ready="false"
        className="journey-stage flex min-h-screen items-center justify-center bg-[var(--journey-void)] font-serif text-sm tracking-[0.28em] text-[var(--journey-gold-soft)]"
      >
        正在研墨排字…
      </section>
    )
  }

  return <MotionStage layout={layout} />
}
