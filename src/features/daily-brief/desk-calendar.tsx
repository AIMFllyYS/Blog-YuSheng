'use client'

import gsap from 'gsap'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from 'react'
import {
  formatMonthCn,
  formatWeekdayShortCn,
  formatYearCn,
} from './brief-date'
import styles from './daily-brief.module.css'
import {
  formatWeekRange,
  type BriefDayCell,
  type BriefMonthPage,
  type BriefWeekRow,
} from './group-briefs'
import { createBriefPrefetcher } from './prefetch-brief'

const WEEKDAY_HEADS = ['一', '二', '三', '四', '五', '六', '日'] as const
const CURL_STRIPS = 6

type Flip = {
  readonly to: number
  /** away：当前页向上卷过螺旋圈；fromAbove：目标页从圈上展开落下 */
  readonly kind: 'away' | 'fromAbove'
}

/**
 * 帐篷式台历（CSS 3D + GSAP 卷页）：
 * - 月页拆成水平纸带，绕顶部螺旋圈依次卷过 / 展开；
 * - 右侧索引页签直达任一月；URL hash `#YYYY-MM` 记忆当前月；
 * - 周轨点击整行抽出（translateZ + rotateX），行内小报展开成大卡；Esc / 再点折回；
 * - 日格悬停 / 聚焦时 router.prefetch，禁止视口批量预取。
 */
export function DeskCalendar({
  months,
  latestDate,
}: {
  months: readonly BriefMonthPage[]
  latestDate: string | undefined
}) {
  const router = useRouter()
  const prefetch = useMemo(
    () => createBriefPrefetcher((href) => router.prefetch(href)),
    [router],
  )
  const [monthIndex, setMonthIndex] = useState(0)
  const [hashApplied, setHashApplied] = useState(false)
  const [flip, setFlip] = useState<Flip | null>(null)
  const [liftedWeek, setLiftedWeek] = useState<string | null>(null)
  const curlRef = useRef<HTMLDivElement | null>(null)
  const shadeRef = useRef<HTMLDivElement | null>(null)

  const current = months[monthIndex]
  const target = flip ? months[flip.to] : undefined

  // 首次挂载：从 `#YYYY-MM` 恢复月份（服务端始终渲染最新月，避免水合不一致）
  useEffect(() => {
    const restore = () => {
      const wanted = window.location.hash.replace(/^#/u, '')
      const index = months.findIndex((month) => month.key === wanted)
      if (index > 0) setMonthIndex(index)
      setHashApplied(true)
    }
    restore()
  }, [months])

  useEffect(() => {
    if (!current || !hashApplied) return
    const hash = `#${current.key}`
    if (window.location.hash === hash) return
    window.history.replaceState(null, '', `${window.location.pathname}${hash}`)
  }, [current, hashApplied])

  const goTo = useCallback(
    (to: number) => {
      if (flip || to === monthIndex || !months[to]) return
      setLiftedWeek(null)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setMonthIndex(to)
        return
      }
      // months 最新在前：索引变小 = 更新的月份 = 当前页卷走
      setFlip({ to, kind: to < monthIndex ? 'away' : 'fromAbove' })
    },
    [flip, monthIndex, months],
  )

  useLayoutEffect(() => {
    if (!flip) return
    const root = curlRef.current
    if (!root) return
    const strips = root.querySelectorAll<HTMLElement>('[data-curl-strip]')
    const away = flip.kind === 'away'
    const settleFlip = () => {
      setMonthIndex(flip.to)
      setFlip(null)
    }
    const ctx = gsap.context(() => {
      gsap.set(strips, {
        rotateX: away ? 0 : -180,
        transformPerspective: 1800,
        transformOrigin: 'top center',
        force3D: true,
      })
      const order = away ? [...strips].reverse() : [...strips]
      const timeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: settleFlip,
      })
      timeline.to(order, {
        rotateX: away ? -180 : 0,
        duration: 0.68,
        stagger: 0.075,
      })
      timeline.fromTo(
        root,
        { rotateZ: 0 },
        { rotateZ: away ? -2.2 : 2.2, duration: 0.34, yoyo: true, repeat: 1, ease: 'sine.inOut' },
        0,
      )
      if (shadeRef.current) {
        timeline.fromTo(
          shadeRef.current,
          { opacity: 0 },
          { opacity: 0.42, duration: 0.32 },
          0,
        )
        timeline.to(shadeRef.current, { opacity: 0, duration: 0.28 }, 0.62)
      }
    }, root)
    return () => ctx.revert()
  }, [flip])

  const toggleWeek = (key: string) =>
    setLiftedWeek((state) => (state === key ? null : key))

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && liftedWeek) {
      event.preventDefault()
      setLiftedWeek(null)
    }
  }

  if (!current) return null

  const underMonth = flip?.kind === 'away' && target ? target : current
  const curlMonth = flip?.kind === 'fromAbove' && target ? target : current

  return (
    <div className={styles.deskWrap} data-catalog-calendar onKeyDown={onKeyDown}>
      <div aria-hidden="true" className={styles.desk} />
      <div className={styles.calendar} data-calendar-month={current.key}>
        <div aria-hidden="true" className={styles.backboard} />
        <div aria-hidden="true" className={styles.rings}>
          {Array.from({ length: 11 }, (_, index) => (
            <span className={styles.ring} key={index} />
          ))}
        </div>

        <div className={styles.pageStack}>
          <div aria-hidden="true" className={styles.sheet} />
          <div aria-hidden="true" className={styles.sheet} />

          {flip ? (
            <div
              aria-hidden="true"
              className={styles.underPage}
              data-calendar-layer="under"
              inert
            >
              <MonthFace
                interactive={false}
                latestDate={latestDate}
                liftedWeek={null}
                month={underMonth}
                onArrow={goTo}
                onPrefetch={prefetch}
                onToggleWeek={toggleWeek}
                position={{ index: months.indexOf(underMonth), total: months.length }}
              />
              <div className={styles.curlShade} ref={shadeRef} />
            </div>
          ) : null}

          <div
            className={styles.flipPage}
            data-calendar-layer="flip"
            data-flip-state={flip ? 'running' : 'rest'}
          >
            {flip ? (
              <CurlStack month={curlMonth} stackRef={curlRef} />
            ) : (
              <MonthFace
                interactive
                latestDate={latestDate}
                liftedWeek={liftedWeek}
                month={curlMonth}
                onArrow={goTo}
                onPrefetch={prefetch}
                onToggleWeek={toggleWeek}
                position={{ index: months.indexOf(curlMonth), total: months.length }}
              />
            )}
          </div>
        </div>

        <nav aria-label="按月索引" className={styles.tabs}>
          {months.map((month, index) => (
            <button
              aria-pressed={index === monthIndex}
              className={styles.tab}
              data-month-tab={month.key}
              key={month.key}
              onClick={() => goTo(index)}
              style={
                {
                  '--tab-depth': index,
                  '--tab-lift': months.length - 1 - index,
                } as CSSProperties
              }
              type="button"
            >
              {month.year !== current.year ? `${month.year} ` : ''}
              {formatMonthCn(month.month)}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function CurlStack({
  month,
  stackRef,
}: {
  month: BriefMonthPage
  stackRef: Ref<HTMLDivElement>
}) {
  return (
    <div
      className={styles.curlStack}
      ref={stackRef}
      style={{ '--strip-count': CURL_STRIPS } as CSSProperties}
    >
      {Array.from({ length: CURL_STRIPS }, (_, index) => (
        <div
          className={styles.curlStrip}
          data-curl-strip={index}
          key={index}
          style={
            {
              top: `${(index * 100) / CURL_STRIPS}%`,
              '--strip-i': index,
              '--strip-count': CURL_STRIPS,
            } as CSSProperties
          }
        >
          <div className={`${styles.curlFace} ${styles.curlFront}`}>
            <div className={styles.curlClone}>
              <MonthFace
                interactive={false}
                latestDate={undefined}
                liftedWeek={null}
                month={month}
                onArrow={() => undefined}
                onPrefetch={() => undefined}
                onToggleWeek={() => undefined}
                position={{ index: 0, total: 1 }}
              />
            </div>
          </div>
          <div aria-hidden="true" className={`${styles.curlFace} ${styles.curlBack}`} />
        </div>
      ))}
    </div>
  )
}

function MonthFace({
  month,
  position,
  latestDate,
  liftedWeek,
  interactive,
  onArrow,
  onToggleWeek,
  onPrefetch,
}: {
  month: BriefMonthPage
  position: { index: number; total: number }
  latestDate: string | undefined
  liftedWeek: string | null
  interactive: boolean
  onArrow: (to: number) => void
  onToggleWeek: (key: string) => void
  onPrefetch: (href: string) => void
}) {
  const newer = position.index - 1
  const older = position.index + 1
  return (
    <section
      aria-label={`${month.year} 年 ${month.month} 月`}
      className={styles.monthFace}
      data-month-face={month.key}
    >
      <header className={styles.monthHead}>
        <div>
          <h2 className={styles.monthTitle}>
            {formatYearCn(month.year)} · {formatMonthCn(month.month)}
          </h2>
          <span className={styles.monthSub}>折晓早报 · 本月 {month.count} 份</span>
        </div>
        <div className={styles.arrows}>
          <button
            aria-label="更早一月"
            className={styles.arrow}
            disabled={!interactive || older >= position.total}
            onClick={() => onArrow(older)}
            type="button"
          >
            ←
          </button>
          <button
            aria-label="更近一月"
            className={styles.arrow}
            disabled={!interactive || newer < 0}
            onClick={() => onArrow(newer)}
            type="button"
          >
            →
          </button>
        </div>
      </header>

      <div aria-hidden="true" className={styles.weekdays}>
        <span>周</span>
        {WEEKDAY_HEADS.map((head) => (
          <span key={head}>{head}</span>
        ))}
      </div>

      <div className={styles.grid} role="list">
        {month.weeks.map((week) => (
          <WeekRow
            interactive={interactive}
            key={week.key}
            latestDate={latestDate}
            onPrefetch={onPrefetch}
            onToggle={() => onToggleWeek(week.key)}
            state={liftedWeek === null ? 'rest' : liftedWeek === week.key ? 'lifted' : 'dim'}
            week={week}
          />
        ))}
      </div>

      <footer className={styles.monthFoot}>
        <span>{month.key}</span>
        <span>点周号抽出整周 · Esc 折回</span>
      </footer>
    </section>
  )
}

function WeekRow({
  week,
  state,
  latestDate,
  interactive,
  onToggle,
  onPrefetch,
}: {
  week: BriefWeekRow
  state: 'rest' | 'lifted' | 'dim'
  latestDate: string | undefined
  interactive: boolean
  onToggle: () => void
  onPrefetch: (href: string) => void
}) {
  const className = [
    styles.row,
    state === 'lifted' ? styles.rowLifted : '',
    state === 'dim' ? styles.rowDim : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={className} data-week-row={week.key} data-week-state={state} role="listitem">
      <button
        aria-label={`第 ${week.isoWeek} 周，${formatWeekRange(week)}，${week.count} 份`}
        aria-pressed={state === 'lifted'}
        className={styles.weekTab}
        onClick={onToggle}
        tabIndex={interactive ? 0 : -1}
        type="button"
      >
        <span>W{String(week.isoWeek).padStart(2, '0')}</span>
        <span className={styles.weekTabCount}>{week.count > 0 ? `${week.count} 份` : '—'}</span>
      </button>
      {week.days.map((cell) => (
        <DayCell
          cell={cell}
          expanded={state === 'lifted'}
          interactive={interactive}
          isLatest={cell.date === latestDate}
          key={cell.date}
          onPrefetch={onPrefetch}
        />
      ))}
    </div>
  )
}

function DayCell({
  cell,
  expanded,
  isLatest,
  interactive,
  onPrefetch,
}: {
  cell: BriefDayCell
  expanded: boolean
  isLatest: boolean
  interactive: boolean
  onPrefetch: (href: string) => void
}) {
  if (!cell.brief) {
    return (
      <div
        className={`${styles.cell} ${cell.inMonth ? '' : styles.cellOutside}`}
        data-day-cell={cell.date}
      >
        <span className={styles.cellDay}>{cell.day}</span>
      </div>
    )
  }
  const brief = cell.brief
  const prefetch = () => onPrefetch(brief.href)
  return (
    <Link
      aria-label={`${brief.date} ${brief.headline}`}
      className={`${styles.paper} ${cell.inMonth ? '' : styles.cellOutside}`}
      data-brief-date={brief.date}
      data-day-cell={cell.date}
      data-tip={expanded ? undefined : brief.headline}
      href={brief.href}
      onFocus={prefetch}
      onMouseEnter={prefetch}
      prefetch={false}
      tabIndex={interactive ? 0 : -1}
    >
      <span className={styles.paperDay}>{cell.day}</span>
      <span className={styles.paperWeekday}>周{formatWeekdayShortCn(cell.weekday)}</span>
      {isLatest && (
        <span aria-hidden="true" className={styles.paperStamp}>
          今
        </span>
      )}
      <span className={styles.paperTitle}>{brief.headline}</span>
      {brief.thesis && <span className={styles.paperThesis}>{brief.thesis}</span>}
    </Link>
  )
}
