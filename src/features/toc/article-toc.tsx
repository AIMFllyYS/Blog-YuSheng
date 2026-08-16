'use client'

import { createPortal } from 'react-dom'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import type { DocumentOutline, OutlineItem } from '@/features/doc-engine/toc'
import { createOutlineSkeletonMetrics } from './outline-skeleton'
import { scrollReaderToHeading } from './scroll-reader-to-heading'
import styles from './article-toc.module.css'

type TocMode = 'list' | 'graph'

type ArticleTocProps = {
  readonly articleSlug: string
  readonly outline: DocumentOutline
}

const MODE_DELAY_MS = 380
const FOLLOW_PAUSE_MS = 2_600
const MODE_STORAGE_KEY = 'reader-toc:mode'
const BAR_WIDTHS = [94, 86, 91, 70, 88, 78, 92] as const

export function ArticleToc({ articleSlug, outline }: ArticleTocProps) {
  const storagePrefix = `reader-toc:${articleSlug}`
  const listItems = useMemo(() => visibleRootItems(outline), [outline])
  const graphMetrics = useMemo(
    () => createOutlineSkeletonMetrics(outline.primarySections),
    [outline.primarySections],
  )
  const allHeadings = useMemo(() => flattenOutline(listItems), [listItems])
  const [mode, setMode] = useState<TocMode>('list')
  const [selectedMode, setSelectedMode] = useState<TocMode>('list')
  const [switching, setSwitching] = useState(false)
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())
  const [activeSlug, setActiveSlug] = useState(allHeadings[0]?.slug ?? '')
  const [viewportTop, setViewportTop] = useState(12)
  const [legendOpen, setLegendOpen] = useState(false)
  const [legendDragOffset, setLegendDragOffset] = useState(0)
  const [tooltip, setTooltip] = useState<{
    title: string
    slug: string
    left: number
    top: number
  }>()
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const followPausedUntilRef = useRef(0)
  const listRef = useRef<HTMLUListElement>(null)
  const graphNodesRef = useRef<HTMLUListElement>(null)
  const graphViewportRef = useRef<HTMLDivElement>(null)
  const legendDragRef = useRef<{ pointerId: number; startY: number } | undefined>(undefined)

  useEffect(() => {
    const storedMode = sessionStorage.getItem(MODE_STORAGE_KEY)
    const storedFolded = sessionStorage.getItem(`${storagePrefix}:folded`)
    let restoredFolded: ReadonlySet<string> | undefined
    if (storedFolded) {
      try {
        const values: unknown = JSON.parse(storedFolded)
        if (Array.isArray(values) && values.every((value) => typeof value === 'string')) {
          restoredFolded = new Set(values)
        }
      } catch {
        sessionStorage.removeItem(`${storagePrefix}:folded`)
      }
    }
    let active = true
    queueMicrotask(() => {
      if (!active) return
      if (storedMode === 'graph') {
        setMode('graph')
        setSelectedMode('graph')
      }
      setFolded(restoredFolded ?? new Set())
    })
    return () => {
      active = false
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current)
    }
  }, [storagePrefix])

  useEffect(() => {
    document.body.classList.toggle('reader-toc-graph', mode === 'graph')
    return () => document.body.classList.remove('reader-toc-graph')
  }, [mode])

  useEffect(() => {
    const navigation = document.querySelector<HTMLElement>('[data-rope-navigation]')
    if (!navigation) return
    const sync = () => {
      document.body.classList.toggle(
        'reader-nav-visible',
        navigation.dataset.navVisible === 'true',
      )
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(navigation, { attributes: true, attributeFilter: ['data-nav-visible'] })
    return () => {
      observer.disconnect()
      document.body.classList.remove('reader-nav-visible')
    }
  }, [])

  useEffect(() => {
    const center = document.querySelector<HTMLElement>('[data-reader-center]')
    if (!center) return
    let frame: number | undefined
    const sync = () => {
      frame = undefined
      const current = currentHeadingSlug(center, allHeadings)
      if (current) {
        setActiveSlug(current)
        if (Date.now() >= followPausedUntilRef.current) {
          listRef.current
            ?.querySelector<HTMLElement>(`[data-toc-slug="${CSS.escape(current)}"]`)
            ?.scrollIntoView({ block: 'nearest' })
        }
      }
      const nodes = graphNodesRef.current
      const viewport = graphViewportRef.current
      if (!nodes || !viewport) return
      const maxScroll = Math.max(0, center.scrollHeight - center.clientHeight)
      const ratio = maxScroll > 0 ? center.scrollTop / maxScroll : 0
      const travel = Math.max(0, nodes.offsetHeight - viewport.offsetHeight)
      setViewportTop(nodes.offsetTop + travel * ratio)
    }
    const schedule = () => {
      if (frame !== undefined) return
      frame = requestAnimationFrame(sync)
    }
    sync()
    center.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      center.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [allHeadings, mode])

  const switchMode = (nextMode: TocMode) => {
    if (nextMode === selectedMode || switching) return
    setSelectedMode(nextMode)
    const apply = () => {
      setTooltip(undefined)
      if (nextMode === 'list') {
        setLegendOpen(false)
        setLegendDragOffset(0)
        legendDragRef.current = undefined
      }
      setMode(nextMode)
      setSwitching(false)
      sessionStorage.setItem(MODE_STORAGE_KEY, nextMode)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply()
      return
    }
    setSwitching(true)
    switchTimerRef.current = setTimeout(apply, MODE_DELAY_MS)
  }

  const toggleFold = (slug: string) => {
    setFolded((current) => {
      const next = new Set(current)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      sessionStorage.setItem(`${storagePrefix}:folded`, JSON.stringify([...next]))
      return next
    })
  }

  const jumpTo = (slug: string) => {
    scrollReaderToHeading(slug)
  }

  const handleJumpKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.click()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const root = event.currentTarget.closest('[data-article-toc]')
    const controls = root
      ? [...root.querySelectorAll<HTMLButtonElement>('[data-toc-jump]')].filter(
          (control) => control.offsetParent !== null,
        )
      : []
    const index = controls.indexOf(event.currentTarget)
    const step = event.key === 'ArrowDown' ? 1 : -1
    controls[(index + step + controls.length) % controls.length]?.focus()
  }

  const pauseFollowing = () => {
    followPausedUntilRef.current = Date.now() + FOLLOW_PAUSE_MS
  }

  const placeTooltip = (item: OutlineItem, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    setTooltip({
      title: item.title,
      slug: item.slug,
      left: rect.right + 10,
      top: rect.top + rect.height / 2,
    })
  }

  const syncTooltipOnScroll = () => {
    setTooltip((current) => {
      if (!current) return current
      const element = graphNodesRef.current?.querySelector<HTMLElement>(
        `[data-toc-slug="${CSS.escape(current.slug)}"]`,
      )
      if (!element || element.offsetParent === null) return undefined
      const rect = element.getBoundingClientRect()
      return { ...current, left: rect.right + 10, top: rect.top + rect.height / 2 }
    })
  }

  const endLegendDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = legendDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    legendDragRef.current = undefined
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (event.clientY - drag.startY > 46) setLegendOpen(false)
    setLegendDragOffset(0)
  }

  return (
    <div className={styles.toc} data-article-toc data-toc-mode={mode}>
      <div aria-label="目录模式" className={styles.hangers} role="tablist">
        <div className={styles.hanger} style={{ '--rope': '20px' } as CSSProperties}>
          <button
            aria-selected={selectedMode === 'list'}
            className={styles.modeTag}
            onClick={() => switchMode('list')}
            role="tab"
            type="button"
          >
            目录
          </button>
        </div>
        <div className={styles.hanger} style={{ '--rope': '28px' } as CSSProperties}>
          <button
            aria-selected={selectedMode === 'graph'}
            className={styles.modeTag}
            onClick={() => switchMode('graph')}
            role="tab"
            type="button"
          >
            图形
          </button>
        </div>
      </div>

      <div
        className={styles.body}
        data-toc-body
        onPointerDown={pauseFollowing}
        onScroll={syncTooltipOnScroll}
        onWheel={pauseFollowing}
      >
        <ul className={styles.list} data-toc-list hidden={mode !== 'list'} ref={listRef}>
          {listItems.map((item) => (
            <OutlineTreeItem
              activeSlug={activeSlug}
              folded={folded}
              item={item}
              jumpTo={jumpTo}
              key={item.nodeId}
              onJumpKeyDown={handleJumpKeyDown}
              toggleFold={toggleFold}
            />
          ))}
        </ul>

        <div className={styles.graph} data-toc-graph hidden={mode !== 'graph'}>
          <div className={styles.graphCanvas}>
            <div
              aria-hidden="true"
              className={styles.graphViewport}
              data-graph-viewport
              ref={graphViewportRef}
              style={{ top: viewportTop }}
            />
            <ul className={styles.graphNodes} ref={graphNodesRef}>
              {graphMetrics.map((metric) => (
                <li key={metric.item.nodeId}>
                  <button
                    aria-label={metric.item.title}
                    className={`${styles.graphNode} ${activeSlugInSection(activeSlug, metric.item) ? styles.active : ''}`}
                    data-skeleton-bars={metric.barCount}
                    data-toc-jump
                    data-toc-slug={metric.item.slug}
                    onBlur={() => setTooltip(undefined)}
                    onClick={() => jumpTo(metric.item.slug)}
                    onFocus={(event) => placeTooltip(metric.item, event.currentTarget)}
                    onKeyDown={handleJumpKeyDown}
                    onMouseEnter={(event) => placeTooltip(metric.item, event.currentTarget)}
                    onMouseLeave={() => setTooltip(undefined)}
                    style={{ '--title-width': `${metric.titlePercent}%` } as CSSProperties}
                    type="button"
                  >
                    <span className={styles.graphHead}>
                      <span className={styles.dot} />
                      <span className={styles.titleBar} />
                      <EmbedMarkers item={metric.item} />
                    </span>
                    <span className={styles.graphBody}>
                      {Array.from({ length: metric.barCount }, (_, index) => (
                        <i
                          key={index}
                          style={{
                            width: `${
                              index === metric.barCount - 1
                                ? metric.lastBarPercent
                                : BAR_WIDTHS[index % BAR_WIDTHS.length]
                            }%`,
                          }}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          aria-hidden="true"
          className={`${styles.skeleton} ${switching ? styles.switching : ''}`}
          data-toc-skeleton
        >
          {[64, 86, 54, 78, 46, 70, 38].map((width) => (
            <i key={width} style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>

      <div className={`${styles.graphDock} ${legendOpen ? styles.legendOpen : ''}`}>
        <div
          className={styles.graphCard}
          id={`graph-legend-${articleSlug}`}
          onPointerCancel={endLegendDrag}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            setLegendDragOffset(0)
            legendDragRef.current = { pointerId: event.pointerId, startY: event.clientY }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const drag = legendDragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return
            const delta = event.clientY - drag.startY
            setLegendDragOffset(delta < 0 ? delta * 0.18 : delta)
          }}
          onPointerUp={endLegendDrag}
          style={legendDragOffset === 0 ? undefined : { transform: `translateY(${legendDragOffset}px)` }}
        >
          <span aria-hidden="true" className={styles.graphCardGrip} />
          <div className={styles.legend}>
            <span><i className={styles.legendViewport} />当前视窗</span>
            <span><i className={styles.legendTitle} />标题长度</span>
            <span><i className={styles.legendRibs}><i /><i /><i /></i>条数 = 篇幅</span>
          </div>
          <p>条数随该节正文篇幅增减。悬停浮出真实标题；虚线框跟随阅读位置。点击节点跳转正文。</p>
        </div>
        <button
          aria-controls={`graph-legend-${articleSlug}`}
          aria-expanded={legendOpen}
          aria-label="图形图例"
          className={styles.graphMark}
          onClick={() => setLegendOpen((current) => !current)}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 28 40">
            <path className={styles.markBody} d="M5.2 1.8h17.6c.9 0 1.6.7 1.6 1.6v32.2l-10.4-6.4-10.4 6.4V3.4c0-.9.7-1.6 1.6-1.6z" />
            <circle className={styles.markHole} cx="14" cy="8.2" r="2.1" />
            <path className={styles.markStitch} d="M9.2 14.2h9.6M9.2 18.2h9.6" />
          </svg>
        </button>
      </div>

      {tooltip
        ? createPortal(
            <div
              className={styles.tooltip}
              data-graph-tooltip
              style={{ left: tooltip.left, top: tooltip.top }}
            >
              {tooltip.title}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function OutlineTreeItem({
  activeSlug,
  folded,
  item,
  jumpTo,
  onJumpKeyDown,
  toggleFold,
}: {
  readonly activeSlug: string
  readonly folded: ReadonlySet<string>
  readonly item: OutlineItem
  readonly jumpTo: (slug: string) => void
  readonly onJumpKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  readonly toggleFold: (slug: string) => void
}) {
  const isFolded = folded.has(item.slug)
  const hasChildren = item.children.length > 0
  const isActiveBranch =
    item.slug === activeSlug ||
    (isFolded && item.children.some((child) => outlineContainsSlug(child, activeSlug)))
  return (
    <li className={styles.treeItem}>
      {hasChildren ? (
        <button
          aria-expanded={!isFolded}
          aria-label={`${isFolded ? '展开' : '折叠'}：${item.title}`}
          className={styles.fold}
          onClick={() => toggleFold(item.slug)}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      ) : null}
      <button
        className={`${styles.link} ${isActiveBranch ? styles.active : ''}`}
        data-toc-active={isActiveBranch}
        data-depth={item.depth}
        data-toc-jump
        data-toc-slug={item.slug}
        onClick={() => jumpTo(item.slug)}
        onKeyDown={onJumpKeyDown}
        title={item.title}
        type="button"
      >
        {item.title}
      </button>
      {hasChildren && !isFolded ? (
        <ul className={styles.children}>
          {item.children.map((child) => (
            <OutlineTreeItem
              activeSlug={activeSlug}
              folded={folded}
              item={child}
              jumpTo={jumpTo}
              key={child.nodeId}
              onJumpKeyDown={onJumpKeyDown}
              toggleFold={toggleFold}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function outlineContainsSlug(item: OutlineItem, slug: string): boolean {
  return item.slug === slug || item.children.some((child) => outlineContainsSlug(child, slug))
}

function EmbedMarkers({ item }: { readonly item: OutlineItem }) {
  if (!item.embeds.customTag && !item.embeds.image && !item.embeds.mindmap) return null
  return (
    <span className={styles.markers} data-outline-markers>
      {item.embeds.customTag ? (
        <span className={styles.customTag} title="自定义组件">
          <svg aria-hidden="true" viewBox="0 0 12 12">
            <rect height="7.2" rx="1.2" width="9.6" x="1.2" y="2.4" />
            <path d="M3.6 6.2l1.6 1.6 3.2-3.2" />
          </svg>
        </span>
      ) : null}
      {item.embeds.image ? (
        <span className={styles.image} title="图片">
          <svg aria-hidden="true" viewBox="0 0 12 12">
            <rect height="7.6" rx="1.2" width="9.6" x="1.2" y="2.2" />
            <path d="M1.8 8.2l2.4-2.4 1.8 1.8 1.4-1.4 3 2.8" />
            <circle cx="4.1" cy="4.6" r=".85" />
          </svg>
        </span>
      ) : null}
      {item.embeds.mindmap ? (
        <span className={styles.mindmap} title="思维导图">
          <svg aria-hidden="true" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="1.55" />
            <circle cx="2.2" cy="2.6" r="1" />
            <circle cx="9.8" cy="2.8" r="1" />
            <circle cx="2.3" cy="9.3" r="1" />
            <circle cx="9.7" cy="9.2" r="1" />
            <path d="M4.7 5.1L3 3.3M7.3 5.1L8.9 3.5M4.7 6.9L3.1 8.4M7.3 6.9L8.8 8.3" />
          </svg>
        </span>
      ) : null}
    </span>
  )
}

function visibleRootItems(outline: DocumentOutline): readonly OutlineItem[] {
  const root = outline.items[0]
  const primaryMatchesChildren =
    root?.children.length === outline.primarySections.length &&
    root.children.every(
      (child, index) => child.nodeId === outline.primarySections[index]?.nodeId,
    )
  return outline.items.length === 1 && root?.depth === 1 && primaryMatchesChildren
    ? outline.primarySections
    : outline.items
}

function flattenOutline(items: readonly OutlineItem[]): readonly OutlineItem[] {
  return items.flatMap((item) => [item, ...flattenOutline(item.children)])
}

function currentHeadingSlug(
  center: HTMLElement,
  headings: readonly OutlineItem[],
): string | undefined {
  const threshold = center.getBoundingClientRect().top + 120
  let current = headings[0]?.slug
  for (const heading of headings) {
    const element = document.getElementById(heading.slug)
    if (element && element.getBoundingClientRect().top <= threshold) current = heading.slug
  }
  return current
}

function activeSlugInSection(activeSlug: string, item: OutlineItem): boolean {
  return item.slug === activeSlug || flattenOutline(item.children).some((child) => child.slug === activeSlug)
}
