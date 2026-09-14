'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatMonthCn, formatWeekdayCn, formatYearCn } from './brief-date'
import styles from './daily-brief.module.css'
import { formatWeekRange, type BriefMonthPage } from './group-briefs'

/**
 * 清单视图（降级）：月 → 周 → 日三层，手风琴语义与博客目录树一致。
 * 最新月默认展开。
 */
export function BriefList({ months }: { months: readonly BriefMonthPage[] }) {
  const [open, setOpen] = useState<string | null>(months[0]?.key ?? null)

  return (
    <div className={styles.list} data-brief-list>
      {months.map((month) => {
        const expanded = open === month.key
        const panelId = `brief-month-${month.key}`
        return (
          <section className={styles.listMonth} id={month.key} key={month.key}>
            <h2 style={{ margin: 0 }}>
              <button
                aria-controls={panelId}
                aria-expanded={expanded}
                className={styles.listMonthButton}
                onClick={() => setOpen(expanded ? null : month.key)}
                type="button"
              >
                <span>
                  {formatYearCn(month.year)} · {formatMonthCn(month.month)}
                </span>
                <span className={styles.listMonthCount}>{month.count} 份</span>
              </button>
            </h2>
            {expanded && (
              <div className={styles.listWeeks} id={panelId}>
                {month.weeks
                  .filter((week) => week.count > 0)
                  .map((week) => (
                    <div className={styles.listWeek} key={week.key}>
                      <p className={styles.listWeekLabel}>
                        W{String(week.isoWeek).padStart(2, '0')} · {formatWeekRange(week)}
                      </p>
                      <ul className={styles.listDays}>
                        {week.days
                          .filter((cell) => cell.inMonth && cell.brief)
                          .map((cell) => {
                            const brief = cell.brief!
                            return (
                              <li key={cell.date}>
                                <Link
                                  className={styles.listDay}
                                  data-day-cell={cell.date}
                                  href={brief.href}
                                  prefetch={false}
                                >
                                  <span className={styles.listDate}>{brief.date}</span>
                                  <span className={styles.listWeekday}>
                                    {formatWeekdayCn(brief.weekday)}
                                  </span>
                                  <span className={styles.listHeadline}>{brief.headline}</span>
                                </Link>
                              </li>
                            )
                          })}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
