'use client'

/**
 * 第四章点题句（82–88% 浮现于光门之上，穿门前隐去）。
 * 文案为 storyboard 占位「玄之又玄，众妙之门」，收口时改 JOURNEY_COPY.gateMotto。
 */
import { JOURNEY_COPY } from '../constants'

export function GateMotto() {
  return (
    <div
      data-motto
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <p
        className="px-6 text-center text-2xl font-semibold tracking-[0.3em] sm:text-4xl"
        style={{
          // 门内是白金世界，题字用玄墨深色 + 透光晕，取「镌刻于光门」之意
          color: '#231c12',
          textShadow: '0 0 22px rgba(255,244,214,0.95), 0 0 5px rgba(255,248,230,0.7)',
        }}
      >
        {JOURNEY_COPY.gateMotto}
      </p>
    </div>
  )
}
