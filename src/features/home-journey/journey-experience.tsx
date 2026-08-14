'use client'

/**
 * 首页 3D 滚动叙事 · 体验编排器。
 * 结构：外层 500vh 滚动轨道 + 内层 sticky 视口；ScrollTrigger scrub 驱动主时间线，
 * 磁吸（snap）落在各章终点。GL 画布只渲染场景；DOM overlay 承担常驻 UI 与尾声主页。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { JOURNEY_PALETTE, JOURNEY_SCROLL_VH } from './constants'
import { buildMasterTimeline, createInitialChannels, magneticSnap } from './engine/master-timeline'
import { EpilogueHome } from './epilogue/epilogue-home'
import { GateMotto } from './overlay/gate-motto'
import { PrologueSplash } from './overlay/prologue-splash'
import { ScrollHint } from './overlay/scroll-hint'
import { SkipButton } from './overlay/skip-button'
import type { JourneyChannels } from './types'

const JourneyCanvas = dynamic(() => import('./scene/journey-canvas'), { ssr: false })

export default function JourneyExperience() {
  const rootRef = useRef<HTMLDivElement>(null)
  const channelsRef = useRef<JourneyChannels>(createInitialChannels())
  const stRef = useRef<ScrollTrigger | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
    const root = rootRef.current
    if (!root) return
    const ctx = gsap.context(() => {
      const tl = buildMasterTimeline(channelsRef.current, root)
      // ?nosnap=1：验收工具截中途帧时禁用章节磁吸（见 scripts/dev/capture-home-journey.mjs）
      const snapDisabled =
        typeof window !== 'undefined' && window.location.search.includes('nosnap')
      stRef.current = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        animation: tl,
        anticipatePin: 1,
        snap: snapDisabled
          ? undefined
          : {
              snapTo: (value) => magneticSnap(value),
              duration: { min: 0.15, max: 0.7 },
              ease: 'power2.inOut',
              delay: 0.05,
              inertia: false,
            },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  /** 跳过（storyboard：约 0.5s 快闪过渡，不生硬切）= 平滑滚到轨道终点，由 scrub 补完画面 */
  const handleSkip = useCallback(() => {
    const st = stRef.current
    if (!st) return
    gsap.to(window, {
      scrollTo: st.end,
      duration: 0.6,
      ease: 'power2.inOut',
      overwrite: 'auto',
    })
  }, [])

  return (
    <div ref={rootRef} className="journey-stage relative" style={{ height: `${JOURNEY_SCROLL_VH}vh` }}>
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{ backgroundColor: JOURNEY_PALETTE.space }}
      >
        {/* 首屏占位：GL 就绪前呈现标题（保持可访问性树），就绪后淡出但保留在 DOM */}
        <PrologueSplash dimmed={canvasReady} />
        <JourneyCanvas channelsRef={channelsRef} onReady={() => setCanvasReady(true)} />

        {/* 常驻 UI（storyboard：右上跳过、底部滚动提示） */}
        <ScrollHint />
        <SkipButton onSkip={handleSkip} />
        <GateMotto />

        {/* 尾声 · 主页本体（95–100% 由主时间线揭示） */}
        <EpilogueHome />
      </div>
    </div>
  )
}
