'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useFallingToast } from '@/components/ui/falling-toast'
import { useDiscussionRuntime } from '@/features/discussions/runtime'
import type { SelectionMappingResult } from '@/features/doc-engine/selection'

import { ANNOTATE_SELECTION_EVENT } from './annotate-selection-event'
import { mapBrowserSelection } from './dom-selection'
import { computeSelBarPosition } from './sel-bar-position'
import styles from './selection-toolbar.module.css'

type ToolbarSession = {
  readonly mapping: SelectionMappingResult
  readonly selectedText: string
  readonly range: SelBarRangeSnapshot
}

type SelBarRangeSnapshot = {
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly width: number
}

export function SelectionToolbar() {
  const { selectionIndex: index } = useDiscussionRuntime()
  const { notify } = useFallingToast()
  const barRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<ToolbarSession | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<SelBarRangeSnapshot | undefined>(undefined)
  const [coords, setCoords] = useState({ left: 0, top: 0 })

  const hide = () => {
    sessionRef.current = undefined
    setRange(undefined)
    setOpen(false)
  }

  useLayoutEffect(() => {
    const bar = barRef.current
    if (!open || !bar || !range) return
    setCoords(computeSelBarPosition(range, {
      width: bar.offsetWidth,
      height: bar.offsetHeight,
    }, window.innerWidth))
  }, [open, range])

  useEffect(() => {
    const isToolbarEvent = (event: Event) => {
      const target = event.target
      return target instanceof Element && Boolean(target.closest('[data-sel-bar]'))
    }

    const evaluate = () => {
      const article = document.querySelector('[data-reader-article]')
      const selection = document.getSelection()
      if (!article || !selection) {
        hide()
        return
      }
      const mapping = mapBrowserSelection(selection, index, article)
      if (mapping.status === 'rejected') {
        if (mapping.reason === 'collapsed' || mapping.reason === 'outside-article') {
          hide()
          return
        }
      }
      if (selection.rangeCount === 0) {
        hide()
        return
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect()
      const nextRange = {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
      }
      sessionRef.current = {
        mapping,
        selectedText: selection.toString(),
        range: nextRange,
      }
      setRange(nextRange)
      setOpen(true)
    }

    const onPointerUp = (event: Event) => {
      if (isToolbarEvent(event)) return
      window.setTimeout(evaluate, 0)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }

    const center = document.querySelector('[data-reader-center]')
    document.addEventListener('mouseup', onPointerUp)
    document.addEventListener('touchend', onPointerUp)
    document.addEventListener('keydown', onKeyDown)
    center?.addEventListener('scroll', hide, { passive: true })
    return () => {
      document.removeEventListener('mouseup', onPointerUp)
      document.removeEventListener('touchend', onPointerUp)
      document.removeEventListener('keydown', onKeyDown)
      center?.removeEventListener('scroll', hide)
    }
  }, [index])

  const copyText = (session: ToolbarSession) => (
    session.mapping.status === 'ok' ? session.mapping.exact : session.selectedText
  )

  const handleCopy = async () => {
    const session = sessionRef.current
    if (!session) return
    try {
      await navigator.clipboard.writeText(copyText(session))
    } catch {
      // Toast still confirms the user action; clipboard may be denied.
    }
    notify('已复制')
    hide()
  }

  const handleAnnotate = () => {
    const session = sessionRef.current
    if (!session) return
    if (session.mapping.status !== 'ok') {
      notify(
        session.mapping.reason === 'cross-block'
          ? '不可跨段落/块注释'
          : '此内容不可注释',
      )
      return
    }
    if (document.body.classList.contains('reader-right-collapsed')) {
      window.dispatchEvent(new Event('reader:workspace-toggle'))
    }
    window.dispatchEvent(new CustomEvent(ANNOTATE_SELECTION_EVENT, {
      detail: {
        exact: session.mapping.exact,
        headingPath: session.mapping.headingPath,
        mapping: session.mapping,
      },
    }))
    hide()
  }

  return (
    <div
      aria-label="划词操作"
      className={`${styles.selBar} sel-bar${open ? ' is-on' : ''}`}
      data-sel-bar
      ref={barRef}
      role="toolbar"
      style={{ left: `${coords.left}px`, top: `${coords.top}px` }}
    >
      <button onClick={() => void handleCopy()} type="button">
        复制
      </button>
      <span aria-hidden="true" className={styles.sep} />
      <button onClick={handleAnnotate} type="button">
        注释
      </button>
    </div>
  )
}
