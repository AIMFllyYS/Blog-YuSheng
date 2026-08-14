'use client'

/**
 * 常驻「跳过 ⤍ 直接入门」（storyboard：右上角常驻，重访每次都播所以必须常驻）。
 * 跳到 100% 终态的快闪过渡由 onSkip（滚动到轨道终点 + scrub 补完）承担。
 */
import { JOURNEY_COPY, JOURNEY_PALETTE } from '../constants'

export function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      data-skip
      onClick={onSkip}
      className="absolute right-5 top-5 z-40 rounded-full border px-4 py-2 text-xs tracking-widest backdrop-blur-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 sm:right-8 sm:top-8 sm:text-sm"
      style={{
        color: JOURNEY_PALETTE.gold,
        borderColor: `${JOURNEY_PALETTE.gold}55`,
        backgroundColor: `${JOURNEY_PALETTE.space}b3`,
      }}
      onMouseEnter={(ev) => {
        ev.currentTarget.style.backgroundColor = `${JOURNEY_PALETTE.gold}26`
      }}
      onMouseLeave={(ev) => {
        ev.currentTarget.style.backgroundColor = `${JOURNEY_PALETTE.space}b3`
      }}
    >
      {JOURNEY_COPY.skip}
    </button>
  )
}
