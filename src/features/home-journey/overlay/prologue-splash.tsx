'use client'

/**
 * 首屏占位：GL 就绪前呈现标题与副句（深夜固定视觉，D11）。
 * 就绪后淡出（opacity 而非 visibility，保留在可访问性树中作为页面的 h1）。
 */
import { JOURNEY_COPY, JOURNEY_PALETTE } from '../constants'

export function PrologueSplash({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center transition-opacity duration-500"
      style={{
        backgroundColor: JOURNEY_PALETTE.space,
        opacity: dimmed ? 0 : 1,
        pointerEvents: dimmed ? 'none' : 'auto',
      }}
    >
      <h1
        className="text-6xl font-semibold tracking-wide sm:text-7xl"
        style={{
          backgroundImage: `linear-gradient(160deg, ${JOURNEY_PALETTE.paper} 20%, ${JOURNEY_PALETTE.gold} 55%, ${JOURNEY_PALETTE.inkGold} 90%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {JOURNEY_COPY.title}
      </h1>
      <p className="mt-6 text-sm tracking-[0.45em]" style={{ color: JOURNEY_PALETTE.gold }}>
        {JOURNEY_COPY.subtitle}
      </p>
    </div>
  )
}
