'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

export function usePopoverPosition(
  panelId: string,
  panelRef: RefObject<HTMLElement | null>,
) {
  const [position, setPosition] = useState({ left: 12, top: 96 })

  useLayoutEffect(() => {
    const place = () => {
      const panel = panelRef.current
      const anchor = document.querySelector<HTMLElement>(
        `[aria-controls="${CSS.escape(panelId)}"]`,
      )
      if (!panel || !anchor) return
      const anchorRect = anchor.getBoundingClientRect()
      const width = panel.offsetWidth
      const height = panel.offsetHeight
      const left = Math.max(
        12,
        Math.min(
          anchorRect.left + anchorRect.width / 2 - width / 2,
          window.innerWidth - width - 12,
        ),
      )
      const preferredTop = anchorRect.bottom + 10
      const top =
        preferredTop + height > window.innerHeight - 12
          ? Math.max(12, anchorRect.top - height - 10)
          : preferredTop
      setPosition({ left, top })
    }

    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [panelId, panelRef])

  return position
}
