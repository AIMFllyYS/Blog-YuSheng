'use client'

import { useEffect, useRef, useState } from 'react'

export function useRopeReveal(enabled: boolean, menuOpen: boolean) {
  const [visible, setVisible] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => {
    if (!enabled) return

    const show = () => {
      if (document.body.classList.contains('reader-in-footer')) {
        setVisible(false)
        return
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setVisible(true)
    }

    const hide = (delay = 320) => {
      if (menuOpen) return
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setVisible(false), delay)
    }

    const move = (event: MouseEvent) => {
      const center = document.querySelector<HTMLElement>('[data-reader-center]')
      const bounds = center?.getBoundingClientRect()
      const inCenter =
        !bounds ||
        (event.clientX >= bounds.left && event.clientX <= bounds.right)
      if (event.clientY <= 88 && inCenter) {
        show()
        return
      }
      if (
        event.target instanceof Element &&
        event.target.closest('[data-rope-navigation]')
      ) {
        return
      }
      hide()
    }

    const blur = () => hide(200)
    const scroll = () => {
      if (menuOpen) return
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setVisible(false)
    }

    document.addEventListener('mousemove', move)
    const center = document.querySelector<HTMLElement>('[data-reader-center]')
    center?.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('blur', blur)
    window.addEventListener('scroll', scroll, { passive: true })

    return () => {
      document.removeEventListener('mousemove', move)
      center?.removeEventListener('scroll', scroll)
      window.removeEventListener('blur', blur)
      window.removeEventListener('scroll', scroll)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [enabled, menuOpen])

  return { setVisible, visible }
}
