'use client'

import Link from 'next/link'
import { useCallback, useRef, useState, type CSSProperties } from 'react'
import styles from '@/features/admin/admin.module.css'
import {
  hashString,
  shadeColor,
  type AdminBookGroup,
  type AdminRow,
} from '@/features/admin/admin-catalog-helpers'

type SpineTip = {
  readonly left: number
  readonly top: number
  readonly title: string
  readonly index: number
  readonly hidden: boolean
  readonly publishedLabel: string
}

function AdminSpineBookmarkTip({ tip }: { readonly tip: SpineTip }) {
  return (
    <div
      className={styles.bookmarkTip}
      role="tooltip"
      style={{ left: `${tip.left}px`, top: `${tip.top}px` }}
    >
      <div className={styles.bookmarkTipBody}>
        <div className={styles.bookmarkTipFrame}>
          <span className={styles.bookmarkTipTitle}>{tip.title}</span>
          <span
            className={`${styles.bookmarkTipSeal} ${
              tip.hidden ? styles.bookmarkTipSealHidden : styles.bookmarkTipSealVisible
            }`}
          >
            {tip.hidden ? '封' : tip.index + 1}
          </span>
        </div>
      </div>
    </div>
  )
}

function AdminTome({
  book,
  open,
  onToggleOpen,
  selected,
  writeDisabled,
  onToggleSelect,
  onSetHidden,
}: {
  readonly book: AdminBookGroup
  readonly open: boolean
  readonly onToggleOpen: (slug: string) => void
  readonly selected: ReadonlySet<string>
  readonly writeDisabled: boolean
  readonly onToggleSelect: (key: string) => void
  readonly onSetHidden: (targets: readonly AdminRow[], hidden: boolean) => void
}) {
  const [tip, setTip] = useState<SpineTip | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const spinesRef = useRef<HTMLDivElement>(null)

  const showTip = useCallback(
    (anchor: HTMLElement, index: number) => {
      const root = rootRef.current
      const post = book.posts[index]
      if (!root || !post) return
      const rect = anchor.getBoundingClientRect()
      const rootRect = root.getBoundingClientRect()
      const half = 24
      setTip({
        left: Math.min(
          Math.max(rect.left - rootRect.left + rect.width / 2, half),
          rootRect.width - half,
        ),
        top: rect.top - rootRect.top,
        title: post.title,
        index,
        hidden: post.hidden,
        publishedLabel: post.publishedLabel,
      })
    },
    [book.posts],
  )

  const hideTip = useCallback(() => setTip(null), [])

  const selectedInBook = book.posts.filter((row) => selected.has(row.key))

  return (
    <article
      aria-label={`典籍 · ${book.title}`}
      className={styles.tomeCard}
      style={
        {
          '--c': book.color,
          '--c-dark': book.colorDark,
        } as CSSProperties
      }
    >
      {/* 顶部典籍折页状态条 */}
      <div className={styles.tomeControlBar}>
        <div className={styles.tomeControlLeft}>
          <span
            aria-hidden="true"
            className={styles.tomeColorPip}
            style={{ background: book.color }}
          />
          <span className={styles.tomeSectionTitle}>{book.title}</span>
          <span className={styles.tomeStatsBadge}>
            在架 {book.visibleCount} · 封存 {book.hiddenCount}
          </span>
        </div>

        <div className={styles.tomeControlRight}>
          {selectedInBook.length > 0 ? (
            <span className={styles.tomeSelectedHint}>
              本册已选 {selectedInBook.length} 篇
            </span>
          ) : null}
          <button
            aria-expanded={open}
            className={styles.tomeFlipBtn}
            onClick={() => onToggleOpen(book.slug)}
            type="button"
          >
            {open ? '合拢典籍封面' : '翻开 3D 书脊架'}
          </button>
        </div>
      </div>

      {/* 3D 典籍主体（1:1 复刻原型 09：左书脊 + 右封面 rotateY(-174deg) + 原地实木书架） */}
      <div
        className={`${styles.tomeStage} ${open ? styles.tomeStageOpen : ''}`}
        ref={rootRef}
      >
        <div className={styles.tomeInner}>
          {/* 左侧窄书脊（点击可翻合典籍） */}
          <button
            aria-label={`${open ? '合拢' : '翻开'}《${book.title}》典籍`}
            className={styles.tomeSpine}
            onClick={() => onToggleOpen(book.slug)}
            type="button"
          >
            <span className={styles.tomeSpineTitle}>{book.title}</span>
            <span className={styles.tomeSpineCount}>{book.posts.length} 篇</span>
          </button>

          {/* 右侧可翻转书页封面（合拢时展示，点击翻开） */}
          <div
            className={styles.tomeBookPage}
            onClick={() => {
              if (!open) onToggleOpen(book.slug)
            }}
          >
            <div className={styles.tomePageInner}>
              <div className={`${styles.tomeFace} ${styles.tomeFaceFront}`}>
                <div className={styles.tomePageContent}>
                  <div>
                    <div className={styles.tomeMetaTop}>
                      {book.latestDateLabel ? (
                        <span>最近更新 {book.latestDateLabel}</span>
                      ) : null}
                      <span>
                        共 {book.posts.length} 篇（公开 {book.visibleCount} / 封存{' '}
                        {book.hiddenCount}）
                      </span>
                    </div>
                    <h3 className={styles.tomeTitleBig}>{book.title}</h3>
                    <p className={styles.tomeDesc}>
                      点击翻开此册封面，在实木书架上检阅全部文章书脊与公开状态。
                    </p>
                  </div>
                  <div className={styles.tomeSealRow}>
                    <span className={styles.sealBadge + ' ' + styles.sealVisible}>
                      在架 {book.visibleCount}
                    </span>
                    {book.hiddenCount > 0 ? (
                      <span className={styles.sealBadge + ' ' + styles.sealHidden}>
                        封存 {book.hiddenCount}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.tomeArrow}>↗</div>
              </div>
              <div className={`${styles.tomeFace} ${styles.tomeFaceBack}`} />
            </div>
          </div>

          {/* 翻开后：原地实木文章书脊架 */}
          <div className={styles.tomeBookshelf}>
            <div className={styles.tomeBookshelfInner}>
              <div className={styles.tomeSpinesMask}>
                <div
                  className={styles.tomeSpines}
                  onWheel={(event) => {
                    const container = spinesRef.current
                    if (!container) return
                    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                      event.preventDefault()
                      container.scrollLeft += event.deltaY
                    }
                  }}
                  ref={spinesRef}
                >
                  {book.posts.map((post, index) => {
                    const tint = shadeColor(
                      book.color,
                      ((hashString(post.id) % 30) - 15) / 100,
                    )
                    const darker = shadeColor(tint, -0.18)
                    const height = 186 + (hashString(post.id) % 4) * 7
                    const isSelected = selected.has(post.key)

                    return (
                      <button
                        aria-label={`${post.title}（${post.hidden ? '已隐藏' : '显示中'}，点击勾选）`}
                        aria-pressed={isSelected}
                        className={`${styles.adminArticleSpine} ${
                          open ? styles.adminArticleSpineIn : ''
                        } ${post.hidden ? styles.adminArticleSpineHidden : ''} ${
                          isSelected ? styles.adminArticleSpineSelected : ''
                        }`}
                        key={post.key}
                        onBlur={hideTip}
                        onClick={() => onToggleSelect(post.key)}
                        onFocus={(event) => showTip(event.currentTarget, index)}
                        onMouseEnter={(event) => showTip(event.currentTarget, index)}
                        onMouseLeave={hideTip}
                        style={{
                          height: `${height}px`,
                          transitionDelay: `${0.03 * Math.min(index, 12)}s`,
                        }}
                        type="button"
                      >
                        <span className={styles.spineEdge3d} />
                        <span
                          className={styles.spineFront3d}
                          style={{
                            background: `linear-gradient(90deg,${darker},${tint} 55%,${shadeColor(
                              tint,
                              0.08,
                            )} 82%,${darker})`,
                          }}
                        />
                        <span className={styles.spineCapTop} />
                        <span className={styles.spineCapFoot} />
                        <span className={`${styles.spineBand} ${styles.spineBandT}`} />
                        <span className={`${styles.spineBand} ${styles.spineBandB}`} />
                        {post.hidden ? (
                          <span className={styles.spineSealedTag}>封</span>
                        ) : null}
                        <span className={styles.spineVerticalTitle}>{post.title}</span>
                        <span className={styles.spineIndexTag}>
                          {post.hidden ? '已隐' : `第${index + 1}篇`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={styles.tomeShelfRail} />
            </div>
          </div>
        </div>

        {open && tip ? <AdminSpineBookmarkTip tip={tip} /> : null}
      </div>

      {/* 典籍下沿：篇章检校签条栏（保留完整复选框与「显示 / 隐藏」快控按钮） */}
      <ul className={styles.tomeChapterSlips}>
        {book.posts.map((row, index) => (
          <li
            className={`${styles.tomeSlipRow} ${
              row.hidden ? styles.tomeSlipRowHidden : ''
            }`}
            key={row.key}
          >
            <input
              aria-label={`选择 ${row.title}`}
              checked={selected.has(row.key)}
              className="size-4"
              onChange={() => onToggleSelect(row.key)}
              type="checkbox"
            />
            <span className={styles.tomeSlipIndex}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span
              className={`${styles.sealBadge} ${
                row.hidden ? styles.sealHidden : styles.sealVisible
              }`}
            >
              {row.hidden ? '封存' : '在架'}
            </span>
            <span className={styles.tomeSlipMain}>
              <span className={styles.tomeSlipTitle}>{row.title}</span>
              <span className={styles.tomeSlipMeta}>
                {row.publishedLabel} · {row.id}
              </span>
            </span>
            {!row.hidden ? (
              <Link
                className={styles.previewLink}
                href={row.href}
                prefetch={false}
                target="_blank"
              >
                阅览 ↗
              </Link>
            ) : (
              <span className={styles.previewLink}>内库封存</span>
            )}
            <span className={styles.choiceGroup}>
              <button
                aria-pressed={!row.hidden}
                className={`${styles.choiceBtn} ${
                  !row.hidden ? styles.choiceBtnActiveVisible : ''
                }`}
                disabled={writeDisabled}
                onClick={() => onSetHidden([row], false)}
                type="button"
              >
                显示
              </button>
              <button
                aria-pressed={row.hidden}
                className={`${styles.choiceBtn} ${
                  row.hidden ? styles.choiceBtnActiveHidden : ''
                }`}
                disabled={writeDisabled}
                onClick={() => onSetHidden([row], true)}
                type="button"
              >
                隐藏
              </button>
            </span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function AdminTomeShelf({
  books,
  selected,
  writeDisabled,
  onToggleSelect,
  onSetHidden,
}: {
  readonly books: readonly AdminBookGroup[]
  readonly selected: ReadonlySet<string>
  readonly writeDisabled: boolean
  readonly onToggleSelect: (key: string) => void
  readonly onSetHidden: (targets: readonly AdminRow[], hidden: boolean) => void
}) {
  // 默认翻开所有典籍（或单册时直接翻开），方便一目了然检阅书脊，也可随时合拢体验 3D 翻页
  const [closedSlugs, setClosedSlugs] = useState<ReadonlySet<string>>(new Set())

  const toggleBook = useCallback((slug: string) => {
    setClosedSlugs((current) => {
      const next = new Set(current)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }, [])

  const allOpen = closedSlugs.size === 0

  return (
    <div className={styles.tomeShelfStack} data-admin-tome-shelf>
      <div className={styles.subStageBar}>
        <span className={styles.subStageHint}>
          3D 藏书典籍架 · 悬停书脊滑出竖排题签 · 点击书脊可勾选，封存篇目自动退入暗影并加盖红印
        </span>
        {books.length > 1 ? (
          <button
            className={styles.subStageToggleBtn}
            onClick={() =>
              setClosedSlugs(
                allOpen ? new Set(books.map((book) => book.slug)) : new Set(),
              )
            }
            type="button"
          >
            {allOpen ? '全部合拢封面' : '全部翻开书脊'}
          </button>
        ) : null}
      </div>

      {books.map((book) => (
        <AdminTome
          book={book}
          key={book.slug}
          onSetHidden={onSetHidden}
          onToggleOpen={toggleBook}
          onToggleSelect={onToggleSelect}
          open={!closedSlugs.has(book.slug)}
          selected={selected}
          writeDisabled={writeDisabled}
        />
      ))}
    </div>
  )
}
