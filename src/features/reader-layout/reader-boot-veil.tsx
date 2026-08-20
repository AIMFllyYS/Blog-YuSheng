'use client'

import { useEffect, useRef, useState } from 'react'
import { BookLoader } from './book-loader'
import styles from './reader-boot-veil.module.css'

const STAMP_FONT =
  '"Noto Serif CJK", "Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, serif'
const NORMAL_HOLD_MS = 1_200
const REDUCED_HOLD_MS = 60
const FADE_MS = 520
const MAX_BOOT_MS = 2_400

type CanvasBox = {
  readonly context: CanvasRenderingContext2D
  readonly height: number
  readonly width: number
}

function fitCanvas(canvas: HTMLCanvasElement): CanvasBox | undefined {
  const context = canvas.getContext('2d')
  if (!context) return undefined

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  return { context, height, width }
}

function themeColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    accent: style.getPropertyValue('--accent').trim() || '#a9762f',
    faint: style.getPropertyValue('--ink-faint').trim() || '#9c9184',
  }
}

function paintMarks(
  context: CanvasRenderingContext2D,
  marks: ReadonlyArray<{ readonly text: string; readonly x: number; readonly y: number }>,
  size: number,
  color: string,
) {
  context.fillStyle = color
  context.shadowColor = color
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.shadowBlur = size * 0.95
  context.globalAlpha = 0.022
  marks.forEach(({ text, x, y }) => context.fillText(text, x, y))
  context.shadowBlur = size * 0.32
  context.globalAlpha = 0.034
  marks.forEach(({ text, x, y }) => context.fillText(text, x, y))
}

function paintFallback(canvas: HTMLCanvasElement) {
  const box = fitCanvas(canvas)
  if (!box) return

  const { accent, faint } = themeColors()
  const size = Math.max(72, Math.min(box.width, box.height) * 0.22)
  const context = box.context
  context.save()
  context.translate(box.width / 2, box.height / 2)
  context.rotate((-9 * Math.PI) / 180)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `600 ${size}px ${STAMP_FONT}`
  paintMarks(context, [{ text: '羽升', x: 0, y: 0 }], size, accent)
  const smallSize = size * 0.38
  context.font = `600 ${smallSize}px ${STAMP_FONT}`
  paintMarks(
    context,
    [
      { text: '羽升', x: box.width * -0.38, y: box.height * -0.34 },
      { text: '羽升', x: box.width * -0.36, y: box.height * 0.36 },
      { text: '羽升', x: box.width * 0.36, y: box.height * -0.32 },
      { text: '羽升', x: box.width * 0.34, y: box.height * 0.34 },
    ],
    smallSize,
    faint,
  )
  context.restore()
  canvas.dataset.stampMode = 'fallback'
}

async function paintPretext(canvas: HTMLCanvasElement) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    paintFallback(canvas)
    return
  }

  try {
    await document.fonts.ready
    const api = await import('@chenglou/pretext')
    if (canvas.dataset.stampMode === 'pretext') return
    api.setLocale('zh-CN')
    const box = fitCanvas(canvas)
    if (!box) return

    const { accent } = themeColors()
    const unit = '羽升'
    const size = Math.max(56, Math.min(box.width, box.height) * 0.118)
    const font = `600 ${size}px ${STAMP_FONT}`
    const prepared = api.prepareWithSegments(unit, font, {
      letterSpacing: size * 0.08,
      whiteSpace: 'pre-wrap',
      wordBreak: 'keep-all',
    })
    const range = api.layoutNextLineRange(
      prepared,
      { graphemeIndex: 0, segmentIndex: 0 },
      box.width,
    )
    if (!range) {
      paintFallback(canvas)
      return
    }

    const measured = api.materializeLineRange(prepared, range)
    const cellWidth = measured.width + size * 0.78
    const cellHeight = size * 1.46
    let columnCount = Math.ceil(box.width / cellWidth) + 3
    let rowCount = Math.ceil(box.height / cellHeight) + 3
    if (columnCount % 2 === 0) columnCount += 1
    if (rowCount % 2 === 0) rowCount += 1
    const startX = box.width / 2 - ((columnCount - 1) * cellWidth) / 2
    const startY = box.height / 2 - ((rowCount - 1) * cellHeight) / 2
    const angle = (-7 * Math.PI) / 180
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const marks: Array<{ text: string; x: number; y: number }> = []

    for (let row = 0; row < rowCount; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        const x = startX + column * cellWidth
        const y = startY + row * cellHeight
        const dx = x - box.width / 2
        const dy = y - box.height / 2
        const screenX = box.width / 2 + dx * cosine - dy * sine
        const screenY = box.height / 2 + dx * sine + dy * cosine
        if (
          Math.abs(screenX - box.width / 2) < 164 &&
          Math.abs(screenY - box.height / 2) < 128
        ) {
          continue
        }
        marks.push({ text: unit, x, y })
      }
    }

    const context = box.context
    context.save()
    context.translate(box.width / 2, box.height / 2)
    context.rotate(angle)
    context.translate(-box.width / 2, -box.height / 2)
    context.font = font
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    paintMarks(context, marks, size, accent)
    context.restore()
    canvas.dataset.stampMode = 'pretext'
  } catch {
    if (!canvas.dataset.stampMode) paintFallback(canvas)
  }
}

export function ReaderBootVeil() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) void paintPretext(canvas)

    document.body.classList.add('reader-is-booting')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let dismissTimer: ReturnType<typeof setTimeout> | undefined
    let removeTimer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    const stampFallbackTimer = canvas
      ? setTimeout(() => {
          if (!canvas.dataset.stampMode) paintFallback(canvas)
        }, 900)
      : undefined

    const leave = () => {
      if (settled) return
      settled = true
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
      if (stampFallbackTimer) clearTimeout(stampFallbackTimer)
      document.body.classList.remove('reader-is-booting')
    }
  }, [])

  if (!isMounted) return null

  return (
    <div
      aria-busy={!isLeaving}
      aria-label="页面载入中"
      aria-live="polite"
      className={`${styles.bootVeil} ${isLeaving ? styles.bootVeilOut : ''}`}
      data-reader-boot-veil
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
