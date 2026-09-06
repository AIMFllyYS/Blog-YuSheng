'use client'

import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { StarEcho } from './star-echo'

type JourneyEasterEgg = {
  id: string
  label: string
  detail: string
  left: string
  top: string
  tone: 'warm' | 'cool'
}

const EASTER_EGGS: readonly JourneyEasterEgg[] = [
  {
    id: 'north-star',
    label: '北辰',
    detail: '你点亮了归途的坐标。每一册文字，都会在这里留下微光。',
    left: '18%',
    top: '22%',
    tone: 'cool',
  },
  {
    id: 'ink-comet',
    label: '墨彗',
    detail: '一粒墨落入星河，沿着羽升的笔锋划过天幕。',
    left: '79%',
    top: '31%',
    tone: 'warm',
  },
  {
    id: 'paper-moon',
    label: '纸月',
    detail: '旧纸的边缘也有月相：半卷、留白、下一行。',
    left: '86%',
    top: '68%',
    tone: 'warm',
  },
  {
    id: 'hidden-seal',
    label: '藏印',
    detail: '羽升集的隐印被你找到。点击书脊上的纹章，也许会有回应。',
    left: '12%',
    top: '75%',
    tone: 'cool',
  },
] as const

export function JourneyEasterEggs({ enabled, settled = false, portalTarget }: { enabled: boolean; settled?: boolean; portalTarget?: HTMLDivElement | null }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [found, setFound] = useState<Set<string>>(() => new Set())
  const cardRef = useRef<HTMLDivElement>(null)
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [echo, setEcho] = useState(0)
  const activeEgg = EASTER_EGGS.find((egg) => egg.id === activeId) ?? null

  useEffect(() => {
    const card = cardRef.current
    if (!card || !activeEgg || !enabled) return
    const hotspot = hotspotRefs.current[activeEgg.id]
    const timeline = gsap.timeline()

    timeline.fromTo(
      card,
      { autoAlpha: 0, y: 18, scale: 0.94, rotate: -1.5 },
      { autoAlpha: 1, y: 0, scale: 1, rotate: 0, duration: 0.46, ease: 'power3.out' },
    )
    if (hotspot) {
      timeline
        .fromTo(
          hotspot,
          { scale: 1, filter: 'brightness(1)' },
          { scale: 2.45, filter: 'brightness(1.8)', duration: 0.18, ease: 'power4.out' },
          0,
        )
        .to(hotspot, { scale: 1, filter: 'brightness(1)', duration: 0.78, ease: 'power2.out' }, 0.18)
    }

    return () => {
      timeline.kill()
    }
  }, [activeEgg, echo, enabled])

  const discover = (egg: JourneyEasterEgg) => {
    setFound((current) => new Set(current).add(egg.id))
    setActiveId(egg.id)
    setEcho((current) => current + 1)
  }

  if (!enabled) return null

  const content = (
    <div
      data-journey-easter-eggs
      className={`pointer-events-none absolute inset-0 z-[var(--z-floating)] ${settled ? '' : 'overflow-hidden'}`}
    >
      {activeEgg ? <StarEcho key={echo} left={parseFloat(activeEgg.left)} top={settled ? 38 : parseFloat(activeEgg.top)} variant={EASTER_EGGS.indexOf(activeEgg)} /> : null}
      {EASTER_EGGS.map((egg) => (
        <button
          key={egg.id}
          ref={(element) => {
            hotspotRefs.current[egg.id] = element
          }}
          type="button"
          data-easter-egg={egg.id}
          data-found={found.has(egg.id) ? 'true' : 'false'}
          aria-label={`发现星签：${egg.label}`}
          onClick={() => discover(egg)}
          className={`journey-star-hotspot journey-star-hotspot-${egg.tone} pointer-events-auto absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--journey-gold)]`}
          style={{ left: egg.left, top: settled ? '38%' : egg.top }}
        >
          <span aria-hidden="true" className="journey-star-core" />
          <span aria-hidden="true" className="journey-star-orbit" />
          <span className="sr-only">{egg.label}</span>
        </button>
      ))}

      <p className="journey-sky-hint">星河有回声 · 试着点亮一颗星 <span>{found.size} / 4</span></p>
      {activeEgg ? (
        <div
          ref={cardRef}
          role="status"
          data-easter-card
          className="journey-discovery-note pointer-events-auto"
        >
          <p className="m-0 text-[0.64rem] tracking-[0.34em] text-[var(--journey-gold-soft)]">
            星签 · {activeEgg.label}
          </p>
          <p className="mt-2 mb-0 text-sm leading-6 text-[var(--journey-paper)]/90">
            {activeEgg.detail}
          </p>
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="mt-3 text-[0.64rem] tracking-[0.24em] text-[var(--journey-ink-muted)] underline decoration-[var(--journey-gold)] underline-offset-4"
          >
            收起星签
          </button>
        </div>
      ) : null}
    </div>
  )
  return settled && portalTarget ? createPortal(content, portalTarget) : content
}
