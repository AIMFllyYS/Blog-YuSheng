'use client'

import { useEffect, useMemo, useState } from 'react'
import { BriefList } from './brief-list'
import styles from './daily-brief.module.css'
import { DeskCalendar } from './desk-calendar'
import { FrontPageHero } from './front-page-hero'
import { groupBriefsByMonth } from './group-briefs'
import type { BriefEntry } from './types'

const VIEW_STORAGE_KEY = 'blog-yusheng:daily-index-view:v1'

type ViewMode = 'pending' | 'calendar' | 'list'

/**
 * 小日报目录视图容器（判定与博客目录一致）：
 * - 桌面端 fine pointer + 无 reduced-motion：「台历 / 清单」可切换，台历 = 纯 CSS 3D 报亭台历；
 * - 移动端 / coarse pointer / reduced-motion：固定清单并附说明，不渲染 DeskCalendar。
 */
export function DailyBriefIndexView({ briefs }: { briefs: readonly BriefEntry[] }) {
  const [view, setView] = useState<ViewMode>('pending')
  const [fallback, setFallback] = useState(false)
  const months = useMemo(() => groupBriefsByMonth(briefs), [briefs])
  const latest = briefs[0]

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const pointerQuery = window.matchMedia('(pointer: coarse)')

    const apply = () => {
      const isFallback = reducedQuery.matches || mobileQuery.matches || pointerQuery.matches
      setFallback(isFallback)
      if (isFallback) {
        setView('list')
        return
      }
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
      setView(stored === 'list' ? 'list' : 'calendar')
    }

    apply()
    reducedQuery.addEventListener('change', apply)
    mobileQuery.addEventListener('change', apply)
    pointerQuery.addEventListener('change', apply)
    return () => {
      reducedQuery.removeEventListener('change', apply)
      mobileQuery.removeEventListener('change', apply)
      pointerQuery.removeEventListener('change', apply)
    }
  }, [])

  const switchView = (next: Exclude<ViewMode, 'pending'>) => {
    setView(next)
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  return (
    <section aria-label="日报台历" data-daily-view={view}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionLabel}>报亭台历</span>
        <span className={styles.sectionCount}>
          {months.length} 个月 · {briefs.length} 份在册
        </span>
        {!fallback && view !== 'pending' && (
          <span aria-label="视图切换" className={styles.viewToggle} role="group">
            <button
              aria-pressed={view === 'calendar'}
              className={styles.viewButton}
              onClick={() => switchView('calendar')}
              type="button"
            >
              台历
            </button>
            <button
              aria-pressed={view === 'list'}
              className={styles.viewButton}
              onClick={() => switchView('list')}
              type="button"
            >
              清单
            </button>
          </span>
        )}
      </div>

      {fallback && (
        <p className={styles.note}>立体台历需桌面端访问，这里为你按月按周列出全部日报。</p>
      )}

      {view === 'list' ? (
        <BriefList months={months} />
      ) : view === 'calendar' && latest ? (
        <div className={styles.stage}>
          <FrontPageHero brief={latest} issue={briefs.length} />
          <DeskCalendar latestDate={latest.date} months={months} />
        </div>
      ) : null}
    </section>
  )
}
