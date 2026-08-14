'use client'

import { useEffect, useState } from 'react'
import {
  createTypographyLayout,
  type TypographyLayout,
} from './pretext-layout'

export function usePretextLayout() {
  const [layout, setLayout] = useState<TypographyLayout | null>(null)

  useEffect(() => {
    let cancelled = false

    const measure = async () => {
      const nextLayout = await createTypographyLayout()
      if (!cancelled) setLayout(nextLayout)
    }

    const handleResize = () => void measure()

    void measure()
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      cancelled = true
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return layout
}
