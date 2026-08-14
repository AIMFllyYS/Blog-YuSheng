'use client'

/**
 * 底部滚动提示（序幕驻留态呼吸闪烁；第一章启动后由主时间线淡出）。
 * 呼吸为装饰性微动 —— L2 GSAP 管；本组件只在完整叙事中挂载，无需担心 reduced-motion。
 */
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { JOURNEY_COPY, JOURNEY_PALETTE } from '../constants'

export function ScrollHint() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const tween = gsap.to(el, {
      opacity: 0.35,
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
    return () => {
      tween.kill()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      data-scroll-hint
      className="absolute inset-x-0 bottom-8 z-40 flex flex-col items-center gap-2"
      style={{ color: JOURNEY_PALETTE.gold }}
    >
      <span className="text-xs tracking-[0.4em]">{JOURNEY_COPY.scrollHint}</span>
      <svg width="14" height="26" viewBox="0 0 14 26" aria-hidden>
        <path
          d="M7 2 v14 M2 11 l5 6 l5 -6"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="7" y1="20" x2="7" y2="24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}
