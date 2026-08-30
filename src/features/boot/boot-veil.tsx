'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BookLoader } from './book-loader'
import { startBootStamp } from './boot-stamp'
import styles from './boot-veil.module.css'

const NORMAL_HOLD_MS = 1_200
const REDUCED_HOLD_MS = 60
const FADE_MS = 520
const MAX_BOOT_MS = 2_400
const ROUTE_BOOT_GRACE_MS = 2_500

let lastRouteBootAt = 0
let playFirstPaint = true

function markRouteBoot() {
  lastRouteBootAt = Date.now()
  playFirstPaint = false
}

export function BootVeil({ persist = false }: { readonly persist?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const stopStamp = canvas ? startBootStamp(canvas) : undefined
    const root = rootRef.current
    if (root) {
      const others = document.querySelectorAll('[data-boot-veil]')
      if (others.length > 1 && others[0] !== root) {
        stopStamp?.()
        setIsMounted(false)
        return
      }
    }

    if (persist) markRouteBoot()
    document.body.classList.add('reader-is-booting')
    if (persist) {
      return () => {
        stopStamp?.()
        document.body.classList.remove('reader-is-booting')
      }
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let dismissTimer: ReturnType<typeof setTimeout> | undefined
    let removeTimer: ReturnType<typeof setTimeout> | undefined
    let settled = false

    const leave = () => {
      if (settled) return
      settled = true
      playFirstPaint = false
      if (dismissTimer) clearTimeout(dismissTimer)
      setIsLeaving(true)
      document.body.classList.remove('reader-is-booting')
      removeTimer = setTimeout(
        () => setIsMounted(false),
        reduced ? 0 : FADE_MS,
      )
    }
    const dismiss = () => {
      dismissTimer = setTimeout(
        leave,
        reduced ? REDUCED_HOLD_MS : NORMAL_HOLD_MS,
      )
    }
    const hardLimitTimer = setTimeout(leave, reduced ? 300 : MAX_BOOT_MS)

    if (document.readyState === 'complete') dismiss()
    else window.addEventListener('load', dismiss, { once: true })

    return () => {
      window.removeEventListener('load', dismiss)
      if (dismissTimer) clearTimeout(dismissTimer)
      if (removeTimer) clearTimeout(removeTimer)
      clearTimeout(hardLimitTimer)
      stopStamp?.()
      document.body.classList.remove('reader-is-booting')
    }
  }, [persist])

  if (!isMounted) return null

  return (
    <div
      aria-busy={!isLeaving}
      aria-label="页面载入中"
      aria-live="polite"
      className={`${styles.bootVeil} ${isLeaving ? styles.bootVeilOut : ''}`}
      data-boot-persist={persist ? 'true' : undefined}
      data-boot-veil
      data-reader-boot-veil
      ref={rootRef}
      role="status"
    >
      <canvas
        aria-hidden="true"
        className={styles.bootStamp}
        data-reader-boot-stamp
        ref={canvasRef}
      />
      <BookLoader />
    </div>
  )
}

function subscribeBootVeil() {
  return () => {}
}

function getBootVeilSnapshot() {
  if (Date.now() - lastRouteBootAt < ROUTE_BOOT_GRACE_MS) return false
  return playFirstPaint
}

function getBootVeilServerSnapshot() {
  return true
}

export function BlogFirstPaintBoot() {
  const show = useSyncExternalStore(
    subscribeBootVeil,
    getBootVeilSnapshot,
    getBootVeilServerSnapshot,
  )

  if (!show) return null
  return <BootVeil />
}
