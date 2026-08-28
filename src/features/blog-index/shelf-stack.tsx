'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './blog-index.module.css'
import type { ShelfBook } from './create-shelf-books'

const CHAPTER_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
})

function hash(input: string): number {
  let value = 0
  for (const char of input) {
    value = (value * 31 + char.charCodeAt(0)) % 1000
  }
  return value
}

/** 按原型 09：hex 向明/暗偏移（percent -1..1） */
function shade(hex: string, percent: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const target = percent < 0 ? 0 : 255
  const amount = Math.abs(percent)
  const channel = (shift: number) => {
    const current = (value >> shift) & 255
    return Math.round(current + (target - current) * amount)
  }
  return `#${((1 << 24) + (channel(16) << 16) + (channel(8) << 8) + channel(0))
    .toString(16)
    .slice(1)}`
}

type TomeProps = {
  readonly book: ShelfBook
  readonly open: boolean
  readonly onToggle: (slug: string | null) => void
}

type BookmarkTip = {
  readonly left: number
  readonly top: number
  readonly title: string
  readonly meta: string
}

/** 单本「方向书」：左窄书脊 + 右侧书页，点击后书页绕左书脊平转 174°，露出文章书脊架 */
function Tome({ book, open, onToggle }: TomeProps) {
  const [entered, setEntered] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const [tip, setTip] = useState<BookmarkTip | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const spinesRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)

  // 收合时重置入场态（render 期调整 state，避免 effect 级联渲染）
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setEntered(false)
  }

  // 翻开后逐本入场（原型：380ms 起、每本间隔 55ms）
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setEntered(true), 380)
    return () => window.clearTimeout(timer)
  }, [open])

  // 横向滚动两端渐隐提示
  const updateFades = useCallback(() => {
    const spines = spinesRef.current
    const mask = maskRef.current
    if (!spines || !mask) return
    const max = spines.scrollWidth - spines.clientWidth
    mask.classList.toggle(styles.canLeft, spines.scrollLeft > 4)
    mask.classList.toggle(styles.canRight, spines.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    if (!open) return
    const spines = spinesRef.current
    if (!spines) return
    spines.scrollLeft = 0
    const raf = requestAnimationFrame(updateFades)
    spines.addEventListener('scroll', updateFades, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      spines.removeEventListener('scroll', updateFades)
    }
  }, [open, updateFades])

  // 滚轮转横向（原型：deltaY > deltaX 时 preventDefault）
  useEffect(() => {
    if (!open) return
    const spines = spinesRef.current
    if (!spines) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault()
        spines.scrollLeft += event.deltaY
      }
    }
    spines.addEventListener('wheel', onWheel, { passive: false })
    return () => spines.removeEventListener('wheel', onWheel)
  }, [open])

  const latest = book.chapters.at(-1)
  const dateLabel = latest
    ? CHAPTER_DATE_FORMATTER.format(new Date(latest.frontmatter.publishedAt))
    : null

  // 悬浮书脊 → 下落书签提示完整标题（渲染在 tome 层，逃逸滚动容器的 overflow 裁剪）
  const showTip = useCallback(
    (anchor: HTMLElement, chapterIndex: number) => {
      const root = rootRef.current
      const chapter = book.chapters[chapterIndex]
      if (!root || !chapter) return
      const rect = anchor.getBoundingClientRect()
      const rootRect = root.getBoundingClientRect()
      const half = 96 // 书签最大半宽，钳制不越出书册
      setTip({
        left: Math.min(
          Math.max(rect.left - rootRect.left + rect.width / 2, half),
          rootRect.width - half,
        ),
        top: rect.top - rootRect.top,
        title: chapter.frontmatter.title,
        meta: `${CHAPTER_DATE_FORMATTER.format(
          new Date(chapter.frontmatter.publishedAt),
        )} · 第${chapterIndex + 1}篇`,
      })
    },
    [book.chapters],
  )
  const hideTip = useCallback(() => setTip(null), [])

  return (
    <div
      className={`${styles.tome} ${open ? styles.tomeOpen : ''}`}
      data-book-slug={book.slug}
      onClick={() => onToggle(open ? null : book.slug)}
      ref={rootRef}
      style={
        {
          '--c': book.color,
          '--c-dark': shade(book.color, -0.22),
        } as React.CSSProperties
      }
    >
      <div className={styles.tomeInner}>
        {/* 左侧窄书脊（翻页轴） */}
        <div className={styles.spine}>
          <span className={styles.spineTitle}>{book.title}</span>
          <span className={styles.spineCount}>{book.chapters.length} 篇</span>
        </div>

        {/* 右侧书页：正面内容 + 背面素色，绕左书脊 rotateY(-174deg) */}
        <div className={styles.bookPage}>
          <div className={styles.pageInner}>
            <div className={`${styles.face} ${styles.faceFront}`}>
              <div className={styles.pageContent}>
                <div>
                  <div className={styles.metaTop}>
                    {dateLabel && <time>{dateLabel}</time>}
                    <span>预计阅读 {book.totalReadingMinutes} 分钟</span>
                  </div>
                  <h2 className={styles.titleBig}>{book.title}</h2>
                  {book.summary && <p className={styles.desc}>{book.summary}</p>}
                </div>
                <div className={styles.tags}>
                  {Array.from(
                    new Set(
                      book.chapters.flatMap(
                        (entry) => entry.frontmatter.tags ?? [],
                      ),
                    ),
                  )
                    .slice(0, 3)
                    .map((tag) => (
                      <span className={styles.tag} key={tag}>
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
              <div className={styles.arrow}>↗</div>
            </div>
            <div className={`${styles.face} ${styles.faceBack}`} />
          </div>
        </div>

        {/* 翻开后：文章书脊架（原地，右侧面板） */}
        <div className={styles.bookshelf}>
          <div className={styles.bookshelfInner}>
            <div className={styles.spinesMask} ref={maskRef}>
              <div className={styles.spines} ref={spinesRef}>
                {book.chapters.map((chapter, index) => {
                  const tint = shade(
                    book.color,
                    ((hash(chapter.slug) % 30) - 15) / 100,
                  )
                  const darker = shade(tint, -0.16)
                  const height = 200 + (hash(chapter.slug) % 4) * 7
                  return (
                    <Link
                      className={`${styles.articleSpine} ${
                        entered ? styles.articleSpineIn : ''
                      }`}
                      href={`/blog/${chapter.slug}/`}
                      key={chapter.slug}
                      onBlur={hideTip}
                      onFocus={(event) => showTip(event.currentTarget, index)}
                      onMouseEnter={(event) =>
                        showTip(event.currentTarget, index)
                      }
                      onMouseLeave={hideTip}
                      prefetch={false}
                      style={{
                        height: `${height}px`,
                        transitionDelay: `${0.04 * index}s`,
                      }}
                    >
                      <span className={styles.edge} />
                      <span
                        className={styles.front}
                        style={{
                          background: `linear-gradient(90deg,${darker},${tint} 55%,${shade(
                            tint,
                            0.08,
                          )} 82%,${darker})`,
                        }}
                      />
                      <span className={styles.cap} />
                      <span className={styles.foot} />
                      <span className={`${styles.band} ${styles.bandT}`} />
                      <span className={`${styles.band} ${styles.bandB}`} />
                      <span className={styles.stitle}>
                        {chapter.frontmatter.title}
                      </span>
                      <span className={styles.stag}>第{index + 1}篇</span>
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className={styles.shelfRail} />
          </div>
        </div>
      </div>

      {/* 悬浮书签：下落展示章节完整标题（pointer-events 关闭，不影响点击） */}
      {open && tip && (
        <div
          className={styles.bookmarkTip}
          role="tooltip"
          style={{ left: `${tip.left}px`, top: `${tip.top}px` }}
        >
          <div className={styles.bookmarkTipBody}>
            <span className={styles.bookmarkTipTitle}>{tip.title}</span>
            <span className={styles.bookmarkTipMeta}>{tip.meta}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 文章书架：方向书垂直堆叠，点击翻开露出该方向的文章书脊架。
 * 交互严格复刻原型 09：一次只展开一册、点空白/其他方向/Esc 收合、书多横向滚动（滚动条隐藏）。
 */
export function ShelfStack({ books }: { books: readonly ShelfBook[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  const closeAll = useCallback(() => setOpenSlug(null), [])

  // 点击空白处收合 + Esc 收合（在 document 侧判断命中，不依赖 stopPropagation）
  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-book-slug]')
      ) {
        return
      }
      closeAll()
    }
    document.addEventListener('click', onDocClick)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [closeAll])

  // hash 深链：#<section-slug> 直达对应册
  useEffect(() => {
    const syncFromHash = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, ''))
      setOpenSlug(books.some((book) => book.slug === slug) ? slug : null)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [books])

  const handleToggle = useCallback(
    (slug: string | null) => {
      setOpenSlug((current) => {
        const next = slug === null || current === slug ? null : slug
        // updater 必须是纯函数：pushState 挪到 effect 里执行一次
        queueMicrotask(() => {
          window.history.pushState(
            null,
            '',
            next
              ? `#${encodeURIComponent(next)}`
              : window.location.pathname + window.location.search,
          )
        })
        return next
      })
    },
    [],
  )

  return (
    <div className={styles.stack}>
      {books.map((book) => (
        <Tome
          book={book}
          key={book.slug}
          onToggle={handleToggle}
          open={book.slug === openSlug}
        />
      ))}
      <p className={styles.persistHint}>
        一次只展开一册 · 点击空白处或其他方向自动收合 · 书多时可横向滚动（滚动条隐藏）
      </p>
    </div>
  )
}
