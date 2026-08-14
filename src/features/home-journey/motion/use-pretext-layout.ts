'use client'

import { useEffect, useState } from 'react'
import gsap from 'gsap'
import {
  createTypographyLayout,
  type TypographyLayout,
} from './pretext-layout'

export function usePretextLayout() {
  const [layout, setLayout] = useState<TypographyLayout | null>(null)

  useEffect(() => {
    let cancelled = false
    let generation = 0
    let measuredWidth = window.innerWidth
    let resizeCall: gsap.core.Tween | null = null

    const measure = async () => {
      const currentGeneration = ++generation
      const nextLayout = await createTypographyLayout()
      if (!cancelled && currentGeneration === generation) setLayout(nextLayout)
    }

    const handleResize = () => {
      if (window.innerWidth === measuredWidth) return
      measuredWidth = window.innerWidth
      resizeCall?.kill()
      resizeCall = gsap.delayedCall(0.18, () => {
        resizeCall = null
        void measure()
      })
    }

    void measure()
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      cancelled = true
      generation += 1
      resizeCall?.kill()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return layout
}
