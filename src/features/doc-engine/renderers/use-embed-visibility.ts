'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

export function useEmbedVisibility(): {
  readonly containerRef: RefObject<HTMLElement | null>
  readonly visible: boolean
} {
  const containerRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const Observer = window.IntersectionObserver as
      | typeof IntersectionObserver
      | undefined
    if (!Observer) {
      const timeout = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(timeout)
    }
    const observer = new Observer(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { containerRef, visible }
}
