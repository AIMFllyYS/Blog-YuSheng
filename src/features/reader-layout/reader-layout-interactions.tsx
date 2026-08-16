'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './reader-layout.module.css'

const REVEAL_DAMPING = 0.035
const FOOTER_STATE_THRESHOLD = 0.62

export function ReaderLayoutInteractions() {
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null)
  const leftButtonRef = useRef<HTMLButtonElement>(null)
  const rightButtonRef = useRef<HTMLButtonElement>(null)
  const previousDrawerRef = useRef<'left' | 'right' | null>(null)

  useEffect(() => {
    const center = document.querySelector<HTMLElement>('[data-reader-center]')
    const footer = document.querySelector<HTMLElement>('[data-reader-footer]')
    if (!center || !footer) return
    document.body.dataset.readerHydrated = 'true'

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let target = 0
    let current = reducedMotion.matches ? 1 : 0
    let frame: number | undefined

    const writeReveal = () => {
      footer.style.setProperty('--reveal', current.toFixed(4))
      document.body.classList.toggle(
        'reader-in-footer',
        reducedMotion.matches
          ? target > FOOTER_STATE_THRESHOLD
          : current > FOOTER_STATE_THRESHOLD,
      )
    }

    const measureFooter = () => {
      const top = footer.getBoundingClientRect().top
      const distance = Math.min(window.innerHeight * 0.8, 520)
      target = Math.max(0, Math.min(1, (window.innerHeight - top) / distance))
      if (reducedMotion.matches) {
        current = 1
        writeReveal()
      } else if (frame === undefined && current !== target) {
        frame = window.requestAnimationFrame(tickReveal)
      }
    }

    const constrainResizedColumns = () => {
      const shell = center.closest<HTMLElement>('[data-reader-shell]')
      if (!shell?.dataset.readerResized || window.innerWidth <= 1024) return
      const left = shell.querySelector<HTMLElement>('[data-reader-column="left"]')
      const right = shell.querySelector<HTMLElement>('[data-reader-column="right"]')
      if (!left || !right) return
      const sideBudget = window.innerWidth - 14 - 520
      const leftWidth = left.getBoundingClientRect().width
      const rightWidth = right.getBoundingClientRect().width
      if (leftWidth + rightWidth <= sideBudget) return
      const adjustableBudget = sideBudget - 180 - 260
      const currentAdjustable = Math.max(1, leftWidth - 180 + rightWidth - 260)
      const ratio = Math.max(0, adjustableBudget) / currentAdjustable
      shell.style.setProperty('--w-left', `${180 + (leftWidth - 180) * ratio}px`)
      shell.style.setProperty('--w-right', `${260 + (rightWidth - 260) * ratio}px`)
    }

    const handleResize = () => {
      constrainResizedColumns()
      measureFooter()
    }

    const tickReveal = () => {
      current += (target - current) * REVEAL_DAMPING
      if (Math.abs(target - current) < 0.0015) current = target
      writeReveal()
      frame = current === target ? undefined : window.requestAnimationFrame(tickReveal)
    }

    const syncArticleEnd = () => {
      const atEnd =
        center.scrollHeight - center.scrollTop - center.clientHeight <= 2
      document.body.classList.toggle('reader-is-article-end', atEnd)
    }

    syncArticleEnd()
    measureFooter()
    center.addEventListener('scroll', syncArticleEnd, { passive: true })
    window.addEventListener('scroll', measureFooter, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      center.removeEventListener('scroll', syncArticleEnd)
      window.removeEventListener('scroll', measureFooter)
      window.removeEventListener('resize', handleResize)
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      delete document.body.dataset.readerHydrated
      document.body.classList.remove('reader-in-footer', 'reader-is-article-end')
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)')
    const leftPanel = document.querySelector<HTMLElement>('[data-reader-column="left"]')
    const rightPanel = document.querySelector<HTMLElement>('[data-reader-column="right"]')
    const center = document.querySelector<HTMLElement>('[data-reader-center]')
    const footer = document.querySelector<HTMLElement>('[data-reader-footer]')
    const controls = document.querySelector<HTMLElement>('[data-reader-floating-controls]')
    const overlay = document.querySelector<HTMLButtonElement>('[data-reader-drawer-overlay]')

    const setHidden = (element: HTMLElement | null, hidden: boolean) => {
      if (!element) return
      element.inert = hidden
      if (hidden) element.setAttribute('aria-hidden', 'true')
      else element.removeAttribute('aria-hidden')
    }

    const syncAccessibility = () => {
      if (!media.matches) {
        for (const element of [leftPanel, rightPanel, center, footer, controls]) {
          setHidden(element, false)
        }
        return
      }
      setHidden(leftPanel, drawer !== 'left')
      setHidden(rightPanel, drawer !== 'right')
      setHidden(center, drawer !== null)
      setHidden(footer, drawer !== null)
      setHidden(controls, drawer !== null)
    }

    document.body.classList.toggle('reader-drawer-left', drawer === 'left')
    document.body.classList.toggle('reader-drawer-right', drawer === 'right')
    syncAccessibility()
    media.addEventListener('change', syncAccessibility)
    const previousDrawer = previousDrawerRef.current
    previousDrawerRef.current = drawer

    if (drawer) {
      const panel = drawer === 'left' ? leftPanel : rightPanel
      const frame = window.requestAnimationFrame(() => panel?.focus())
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setDrawer(null)
          return
        }
        if (event.key !== 'Tab' || !panel || !overlay) return
        const focusable = [
          panel,
          ...panel.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
          overlay,
        ].filter(
          (element) =>
            !element.inert &&
            !element.hidden &&
            (element === overlay || element.offsetParent !== null),
        )
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        window.cancelAnimationFrame(frame)
        document.removeEventListener('keydown', handleKeyDown)
        media.removeEventListener('change', syncAccessibility)
        for (const element of [leftPanel, rightPanel, center, footer, controls]) {
          setHidden(element, false)
        }
        document.body.classList.remove('reader-drawer-left', 'reader-drawer-right')
      }
    }

    if (previousDrawer) {
      const trigger = previousDrawer === 'left' ? leftButtonRef.current : rightButtonRef.current
      window.requestAnimationFrame(() => trigger?.focus())
    }
    return () => {
      media.removeEventListener('change', syncAccessibility)
      for (const element of [leftPanel, rightPanel, center, footer, controls]) {
        setHidden(element, false)
      }
      document.body.classList.remove('reader-drawer-left', 'reader-drawer-right')
    }
  }, [drawer])

  return (
    <>
      <div className={styles.mobileControls} data-reader-floating-controls>
        <button
          aria-controls="reader-left-drawer"
          aria-expanded={drawer === 'left'}
          aria-label="打开文章目录"
          className={styles.leftDrawerButton}
          onClick={() => setDrawer((current) => (current === 'left' ? null : 'left'))}
          ref={leftButtonRef}
          type="button"
        >
          目录
        </button>
        <button
          aria-controls="reader-right-drawer"
          aria-expanded={drawer === 'right'}
          aria-label="打开阅读工作区"
          className={styles.rightDrawerButton}
          onClick={() => setDrawer((current) => (current === 'right' ? null : 'right'))}
          ref={rightButtonRef}
          type="button"
        >
          <span aria-hidden="true">✎</span>
          <span className={styles.srOnly}>工作区</span>
        </button>
      </div>
      <button
        aria-label="关闭侧栏"
        aria-hidden={drawer === null}
        className={styles.drawerOverlay}
        data-reader-drawer-overlay
        onClick={() => setDrawer(null)}
        tabIndex={drawer === null ? -1 : 0}
        type="button"
      />
    </>
  )
}
