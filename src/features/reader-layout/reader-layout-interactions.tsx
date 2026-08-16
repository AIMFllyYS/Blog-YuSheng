'use client'

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import styles from './reader-layout.module.css'

const REVEAL_DAMPING = 0.035
const FOOTER_STATE_THRESHOLD = 0.62
const RIGHT_REVEAL_MS = 820
const RIGHT_COLLAPSE_DELAY_MS = 220
const RIGHT_STATE_KEY = 'reader-workspace:expanded'
const PEN_MOTION_KEY = 'reader-workspace:pen-motion'

const digitStrokes: Readonly<Record<string, readonly string[]>> = {
  '0': ['M9.1 3.2C4.6 3.6 3.1 8.4 3.2 12.6C3.4 18.2 6.1 21.4 9.2 21.3C14.1 21.1 15.4 16.2 15.2 11.6C15 6.4 13.3 2.9 9.1 3.2'],
  '1': ['M6.6 7.4C8.5 5 10.8 2.9 11 3.1C11.1 7 11 21.2 10.9 21.2'],
  '2': ['M4.1 8.2C4.8 3.8 14.4 3 14.6 8.6C14.7 12.6 6.2 15.2 5.1 19.8C4.7 21.6 6.4 21.1 15 20.7'],
  '3': ['M5 5C10.8 2.8 15.2 5.1 13.7 9.3C12.7 12.3 8.1 12.4 8.3 12.4C14.1 12.1 15.5 16.8 13.5 19.8C11.3 22.6 4.9 21.3 4.7 18.5'],
  '4': ['M13 3.1L4.1 15.7H15.6', 'M12.6 3.3V21.1'],
  '5': ['M14.8 3.5C12.2 3.3 8.4 3.6 6.2 3.9L5.1 11.6C8.8 9.2 15.4 10 15 16.1C14.6 21.6 6.8 22.6 4.5 18.1'],
  '6': ['M13.9 4C8 3.6 4.1 9.3 4.3 15C4.5 20.5 9.4 22.5 12.9 20.6C16.5 18.6 16.3 12.9 11.5 12.1C7.6 11.4 5.3 14.4 5.5 16.3'],
  '7': ['M4.5 4.1H15L8.1 21.2'],
  '8': ['M9 12.1C4.5 11.7 4.1 3.5 9 3.3C13.9 3.1 14.3 11.5 9 12.1C4.1 12.7 4.3 21.4 9.2 21.2C14.2 21 14.6 12.9 9 12.1'],
  '9': ['M5.1 20.2C9 22.1 15.1 19.1 14.7 12.9C14.4 6.8 10 3.1 6.7 4.5C3.5 5.9 3.7 12.4 8.3 13.6C12 14.6 14.5 11.9 14.6 11.7'],
}

export function ReaderLayoutInteractions({ annotationCount }: { readonly annotationCount: number }) {
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [rightPhase, setRightPhase] = useState<'idle' | 'revealing' | 'hiding'>('idle')
  const [penMotion, setPenMotion] = useState(true)
  const [penMenu, setPenMenu] = useState<{ left: number; top: number }>()
  const leftButtonRef = useRef<HTMLButtonElement>(null)
  const rightButtonRef = useRef<HTMLButtonElement>(null)
  const previousDrawerRef = useRef<'left' | 'right' | null>(null)
  const rightFocusTargetRef = useRef<'pen' | 'workspace' | undefined>(undefined)
  const rightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const storedExpanded = localStorage.getItem(RIGHT_STATE_KEY)
    const storedMotion = localStorage.getItem(PEN_MOTION_KEY)
    queueMicrotask(() => {
      setRightCollapsed(storedExpanded === '0')
      setPenMotion(reduced ? false : storedMotion !== '0')
    })
    return () => {
      if (rightTimerRef.current) clearTimeout(rightTimerRef.current)
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const rightPanel = document.querySelector<HTMLElement>('[data-reader-column="right"]')
    document.body.classList.toggle('reader-right-collapsed', rightCollapsed)
    document.body.classList.toggle('reader-right-revealing', rightPhase === 'revealing')
    document.body.classList.toggle('reader-right-hiding', rightPhase === 'hiding')
    if (rightPhase === 'idle') rightPanel?.removeAttribute('aria-busy')
    else rightPanel?.setAttribute('aria-busy', 'true')
    return () => {
      document.body.classList.remove(
        'reader-right-collapsed',
        'reader-right-revealing',
        'reader-right-hiding',
      )
      rightPanel?.removeAttribute('aria-busy')
    }
  }, [rightCollapsed, rightPhase])

  useEffect(() => {
    const media = matchMedia('(max-width: 1024px)')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const finish = () => {
      setRightPhase('idle')
      if (media.matches) return
      const target = rightFocusTargetRef.current
      rightFocusTargetRef.current = undefined
      window.requestAnimationFrame(() => {
        if (target === 'pen') rightButtonRef.current?.focus()
        if (target === 'workspace') {
          document
            .querySelector<HTMLButtonElement>('[data-reader-workspace] [role="tab"][aria-selected="true"]')
            ?.focus()
        }
      })
    }
    const toggle = () => {
      setPenMenu(undefined)
      if (rightPhase !== 'idle') return
      if (rightTimerRef.current) clearTimeout(rightTimerRef.current)
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
      if (media.matches) {
        if (drawer === 'right') {
          setRightPhase('hiding')
          collapseTimerRef.current = setTimeout(
            () => setDrawer(null),
            reduced.matches ? 0 : RIGHT_COLLAPSE_DELAY_MS,
          )
        } else {
          setDrawer('right')
          setRightPhase('revealing')
        }
        rightTimerRef.current = setTimeout(finish, reduced.matches ? 0 : RIGHT_REVEAL_MS)
        return
      }
      if (rightCollapsed) {
        rightFocusTargetRef.current = 'workspace'
        setRightPhase('revealing')
        setRightCollapsed(false)
        localStorage.setItem(RIGHT_STATE_KEY, '1')
      } else {
        rightFocusTargetRef.current = 'pen'
        setRightPhase('hiding')
        localStorage.setItem(RIGHT_STATE_KEY, '0')
        collapseTimerRef.current = setTimeout(
          () => setRightCollapsed(true),
          reduced.matches ? 0 : RIGHT_COLLAPSE_DELAY_MS,
        )
      }
      rightTimerRef.current = setTimeout(finish, reduced.matches ? 0 : RIGHT_REVEAL_MS)
    }
    window.addEventListener('reader:workspace-toggle', toggle)
    return () => window.removeEventListener('reader:workspace-toggle', toggle)
  }, [drawer, rightCollapsed, rightPhase])

  useEffect(() => {
    if (!penMenu) return
    const close = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-reader-pen-menu], [data-reader-workspace-pen]')) return
      setPenMenu(undefined)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPenMenu(undefined)
      window.requestAnimationFrame(() => rightButtonRef.current?.focus())
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [penMenu])

  const choosePenMotion = (motion: boolean) => {
    setPenMotion(motion)
    localStorage.setItem(PEN_MOTION_KEY, motion ? '1' : '0')
    setPenMenu(undefined)
    window.requestAnimationFrame(() => rightButtonRef.current?.focus())
  }

  const openPenMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const menuWidth = 96
    const menuHeight = 76
    setPenMenu({
      left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, event.clientX)),
      top: Math.max(8, Math.min(window.innerHeight - menuHeight - 8, event.clientY - menuHeight - 6)),
    })
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>('[data-reader-pen-menu] [role="menuitemradio"][aria-checked="true"]')
        ?.focus()
    })
  }

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
    const handleBreakpointChange = () => {
      if (!media.matches && drawer !== null) {
        previousDrawerRef.current = null
        rightFocusTargetRef.current = undefined
        if (rightTimerRef.current) clearTimeout(rightTimerRef.current)
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
        setRightPhase('idle')
        setDrawer(null)
      }
      syncAccessibility()
    }
    media.addEventListener('change', handleBreakpointChange)
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
        media.removeEventListener('change', handleBreakpointChange)
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
      media.removeEventListener('change', handleBreakpointChange)
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
          aria-label={`打开工作区。注释 ${annotationCount}，评论 0。右键可切换动效`}
          className={`${styles.rightDrawerButton} ${penMotion ? styles.penMotion : styles.penStill} ${penMenu ? styles.penMenuOpen : ''}`}
          data-reader-workspace-pen
          onClick={() => window.dispatchEvent(new Event('reader:workspace-toggle'))}
          onContextMenu={openPenMenu}
          ref={rightButtonRef}
          type="button"
        >
          <span className={styles.penTooltip}>
            <span>注释 {annotationCount}</span>
            <span>评论 0</span>
          </span>
          <span className={styles.penStage} aria-hidden="true" data-reader-pen-stage>
            <HandwrittenCount count={annotationCount} />
            <span className={styles.penIcon} data-reader-pen-icon>
              <svg viewBox="0 0 28 48">
                <path className={styles.penBarrel} d="M18.4 6.4h3.2c.7 0 1.2.5 1.2 1.1v7.6" />
                <rect className={styles.penBarrel} height="7.4" rx="1.6" width="10" x="9.4" y="3.4" />
                <path className={styles.penBand} d="M9.4 10.8h10" />
                <path className={styles.penBarrel} d="M9.8 10.8h9.2v17.2c0 1.1-.8 1.8-1.8 1.8h-5.6c-1 0-1.8-.7-1.8-1.8z" />
                <rect className={styles.penBand} height="2.3" rx=".35" width="9.6" x="9.6" y="28" />
                <path className={styles.penBarrel} d="M10.4 30.3h8l-1.15 4.1H11.55z" />
                <path className={styles.penNib} d="M11.55 34.4L14 46.2L16.45 34.4z" />
                <path className={styles.penSlit} d="M14 35.1v8.4" />
                <circle className={styles.penHole} cx="14" cy="37" r=".85" />
              </svg>
            </span>
          </span>
        </button>
      </div>
      {penMenu ? (
        <div
          aria-label="笔的动效"
          className={styles.penMenu}
          data-reader-pen-menu
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setPenMenu(undefined)
              rightButtonRef.current?.focus()
              return
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
            event.preventDefault()
            const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')]
            const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
            const step = event.key === 'ArrowDown' ? 1 : -1
            items[(currentIndex + step + items.length) % items.length]?.focus()
          }}
          role="menu"
          style={penMenu}
        >
          <button aria-checked={penMotion} onClick={() => choosePenMotion(true)} role="menuitemradio" type="button">运动</button>
          <button aria-checked={!penMotion} onClick={() => choosePenMotion(false)} role="menuitemradio" type="button">静止</button>
        </div>
      ) : null}
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

function HandwrittenCount({ count }: { readonly count: number }) {
  const characters = String(Math.max(0, count))
  const width = characters.length * 18 + Math.max(0, characters.length - 1) * 3
  return (
    <span className={styles.penNumber} data-reader-pen-number>
      <svg viewBox={`0 0 ${width} 24`}>
        {characters.split('').flatMap((character, characterIndex) =>
          (digitStrokes[character] ?? digitStrokes['0']).map((path, pathIndex) => (
            <path
              d={path}
              key={`${characterIndex}-${pathIndex}`}
              pathLength="1"
              style={{ animationDelay: `${characterIndex * 0.35 + pathIndex * 0.2}s` }}
              transform={`translate(${characterIndex * 21} 0)`}
            />
          )),
        )}
      </svg>
    </span>
  )
}
