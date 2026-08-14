'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { HomeShell } from './components/home-shell'
import { MobileHome } from './components/mobile-home'
import type { JourneyMode } from './types'

const DesktopJourney = dynamic(
  () => import('./desktop-journey').then((module) => module.DesktopJourney),
  {
    ssr: false,
    loading: () => (
      <section
        data-testid="home-journey"
        data-journey-mode="cinematic"
        data-journey-ready="false"
        className="journey-stage flex min-h-screen items-center justify-center bg-[var(--journey-void)] font-serif text-sm tracking-[0.28em] text-[var(--journey-gold-soft)]"
      >
        正在展开星卷…
      </section>
    ),
  },
)

function resolveJourneyMode(): Exclude<JourneyMode, 'pending'> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'reduced'
  }

  if (
    window.matchMedia('(max-width: 767px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  ) {
    return 'mobile'
  }

  return 'cinematic'
}
export function HomeJourney() {
  const [mode, setMode] = useState<JourneyMode>('pending')

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const pointerQuery = window.matchMedia('(pointer: coarse)')
    const updateMode = () => setMode(resolveJourneyMode())

    updateMode()
    reducedQuery.addEventListener('change', updateMode)
    mobileQuery.addEventListener('change', updateMode)
    pointerQuery.addEventListener('change', updateMode)

    return () => {
      reducedQuery.removeEventListener('change', updateMode)
      mobileQuery.removeEventListener('change', updateMode)
      pointerQuery.removeEventListener('change', updateMode)
    }
  }, [])

  if (mode === 'mobile') return <MobileHome />

  if (mode === 'reduced') {
    return (
      <main
        data-testid="home-journey"
        data-journey-mode="reduced"
        data-journey-ready="true"
        data-journey-progress="1.0000"
        data-journey-scene="epilogue"
        className="min-h-screen bg-[var(--journey-void)]"
      >
        <HomeShell mode="reduced" />
      </main>
    )
  }

  if (mode === 'cinematic') return <DesktopJourney />

  return (
    <main
      data-testid="home-journey"
      data-journey-mode="pending"
      data-journey-ready="false"
      className="journey-stage flex min-h-screen items-center justify-center bg-[var(--journey-void)] font-serif text-sm tracking-[0.28em] text-[var(--journey-gold-soft)]"
    >
      羽升 · 正在辨认来客的纸页
    </main>
  )
}
