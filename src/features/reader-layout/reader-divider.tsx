'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './reader-layout.module.css'

type Side = 'left' | 'right'

const SIDE_LIMITS: Record<Side, { defaultWidth: number; min: number; max: number }> = {
  left: { defaultWidth: 248, min: 180, max: 400 },
  right: { defaultWidth: 352, min: 260, max: 520 },
}

export function ReaderDivider({ side }: { readonly side: Side }) {
  const dividerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(SIDE_LIMITS[side].defaultWidth)
  const variable = side === 'left' ? '--w-left' : '--w-right'

  const measureWidth = useCallback(() => {
    const shell = dividerRef.current?.closest<HTMLElement>('[data-reader-shell]')
    const column = shell?.querySelector<HTMLElement>(`[data-reader-column="${side}"]`)
    if (column) setWidth(Math.round(column.getBoundingClientRect().width))
  }, [side])

  const applyWidth = useCallback(
    (nextWidth: number) => {
      const shell = dividerRef.current?.closest<HTMLElement>('[data-reader-shell]')
      if (!shell) return
      const otherSide = side === 'left' ? 'right' : 'left'
      const otherVariable = side === 'left' ? '--w-right' : '--w-left'
      const otherColumn = shell.querySelector<HTMLElement>(
        `[data-reader-column="${otherSide}"]`,
      )
      const otherWidth = Math.round(otherColumn?.getBoundingClientRect().width ?? 0)
      const limits = SIDE_LIMITS[side]
      const available = window.innerWidth - otherWidth - 14 - 520
      const constrained = Math.max(
        limits.min,
        Math.min(limits.max, available, nextWidth),
      )
      shell.style.setProperty(otherVariable, `${otherWidth}px`)
      shell.style.setProperty(variable, `${constrained}px`)
      shell.dataset.readerResized = 'true'
      setWidth(constrained)
    },
    [side, variable],
  )

  const reset = useCallback(() => {
    const shell = dividerRef.current?.closest<HTMLElement>('[data-reader-shell]')
    if (!shell) return
    shell.style.removeProperty('--w-left')
    shell.style.removeProperty('--w-right')
    delete shell.dataset.readerResized
    measureWidth()
    window.requestAnimationFrame(measureWidth)
  }, [measureWidth])

  useEffect(() => {
    const divider = dividerRef.current
    if (!divider) return
    const shell = divider.closest<HTMLElement>('[data-reader-shell]')
    const column = shell?.querySelector<HTMLElement>(`[data-reader-column="${side}"]`)
    const resizeObserver = column ? new ResizeObserver(measureWidth) : undefined
    if (column) resizeObserver?.observe(column)
    measureWidth()

    const handlePointerDown = (event: PointerEvent) => {
      if (window.matchMedia('(max-width: 1024px)').matches) return
      event.preventDefault()
      divider.setPointerCapture(event.pointerId)
      document.body.classList.add('reader-is-dragging')

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const shell = divider.closest<HTMLElement>('[data-reader-shell]')
        if (!shell) return
        const proposed =
          side === 'left'
            ? moveEvent.clientX
            : window.innerWidth - moveEvent.clientX
        applyWidth(proposed)
      }

      const stop = () => {
        document.body.classList.remove('reader-is-dragging')
        divider.removeEventListener('pointermove', handlePointerMove)
        divider.removeEventListener('pointerup', stop)
        divider.removeEventListener('pointercancel', stop)
      }

      divider.addEventListener('pointermove', handlePointerMove)
      divider.addEventListener('pointerup', stop)
      divider.addEventListener('pointercancel', stop)
    }

    divider.addEventListener('pointerdown', handlePointerDown)
    return () => {
      divider.removeEventListener('pointerdown', handlePointerDown)
      resizeObserver?.disconnect()
      document.body.classList.remove('reader-is-dragging')
    }
  }, [applyWidth, measureWidth, side])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home') {
      event.preventDefault()
      applyWidth(SIDE_LIMITS[side].min)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      applyWidth(SIDE_LIMITS[side].max)
      return
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const signedDirection = side === 'right' ? -direction : direction
    const limits = SIDE_LIMITS[side]
    applyWidth(Math.max(limits.min, Math.min(limits.max, width + signedDirection * 12)))
  }

  return (
    <div
      aria-label={side === 'left' ? '拖动调整目录宽度' : '拖动调整工作区宽度'}
      aria-orientation="vertical"
      aria-valuemax={SIDE_LIMITS[side].max}
      aria-valuemin={SIDE_LIMITS[side].min}
      aria-valuenow={Math.round(width)}
      className={styles.divider}
      data-reader-divider={side}
      onDoubleClick={reset}
      onKeyDown={handleKeyDown}
      ref={dividerRef}
      role="separator"
      tabIndex={0}
    />
  )
}
