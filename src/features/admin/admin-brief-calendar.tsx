'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'
import styles from '@/features/admin/admin.module.css'
import type {
  AdminCalendarMonth,
  AdminRow,
} from '@/features/admin/admin-catalog-helpers'

const WEEKDAY_HEADS = ['一', '二', '三', '四', '五', '六', '日'] as const

export function AdminBriefCalendar({
  months,
  selected,
  writeDisabled,
  onToggleSelect,
  onSetHidden,
}: {
  readonly months: readonly AdminCalendarMonth[]
  readonly selected: ReadonlySet<string>
  readonly writeDisabled: boolean
  readonly onToggleSelect: (key: string) => void
  readonly onSetHidden: (targets: readonly AdminRow[], hidden: boolean) => void
}) {
  const [activeMonthKey, setActiveMonthKey] = useState<string | undefined>(
    months[0]?.key,
  )
  const [liftedWeek, setLiftedWeek] = useState<string | null>(null)

  const resolvedIndex = Math.max(
    0,
    months.findIndex((m) => m.key === activeMonthKey),
  )
  const currentMonth = months[resolvedIndex] ?? months[0]

  if (!currentMonth) return null

  const goToMonth = (index: number) => {
    const target = months[index]
    if (!target) return
    setLiftedWeek(null)
    setActiveMonthKey(target.key)
  }

  return (
    <div className={styles.briefCalendarRoot} data-admin-brief-calendar>
      <div className={styles.subStageBar}>
        <span className={styles.subStageHint}>
          3D 螺旋铜圈报亭台历 · 点击左侧「周次」可抽出整周折报放大检阅 · 右侧竖签可切换归档月份
        </span>
        <span className={styles.subStageMeta}>
          当前月：{currentMonth.label}（在架 {currentMonth.visibleCount} / 封存{' '}
          {currentMonth.hiddenCount}）
        </span>
      </div>

      {/* 3D 书桌 + 螺旋铜圈台历舞台 */}
      <div className={styles.calendarDeskWrap}>
        <div aria-hidden="true" className={styles.calendarDesk} />

        <div className={styles.calendarBody}>
          <div aria-hidden="true" className={styles.calendarBackboard} />

          {/* 顶部 7 枚金属螺旋铜圈 */}
          <div aria-hidden="true" className={styles.calendarRings}>
            {Array.from({ length: 7 }, (_, index) => (
              <span className={styles.calendarRing} key={index} />
            ))}
          </div>

          <div className={styles.calendarPageStack}>
            <div aria-hidden="true" className={styles.calendarSheetBackOne} />
            <div aria-hidden="true" className={styles.calendarSheetBackTwo} />

            {/* 当前月台历纸面 */}
            <div className={styles.calendarMonthFace}>
              <div className={styles.calendarMonthHead}>
                <div>
                  <h3 className={styles.calendarMonthTitle}>
                    {currentMonth.label} · 折晓早报
                  </h3>
                  <span className={styles.calendarMonthSub}>
                    共收录 {currentMonth.count} 期日报 · 在架 {currentMonth.visibleCount}{' '}
                    期 · 封存 {currentMonth.hiddenCount} 期
                  </span>
                </div>

                <div className={styles.calendarNavArrows}>
                  <button
                    aria-label="上一月（更新）"
                    className={styles.calendarArrow}
                    disabled={resolvedIndex <= 0}
                    onClick={() => goToMonth(resolvedIndex - 1)}
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    aria-label="下一月（更早）"
                    className={styles.calendarArrow}
                    disabled={resolvedIndex >= months.length - 1}
                    onClick={() => goToMonth(resolvedIndex + 1)}
                    type="button"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className={styles.calendarWeekdays}>
                <span>周次</span>
                {WEEKDAY_HEADS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className={styles.calendarGrid}>
                {currentMonth.weeks.map((week) => {
                  const isLifted = liftedWeek === week.key
                  const isDimmed = liftedWeek !== null && !isLifted
                  return (
                    <div
                      className={`${styles.calendarRow} ${
                        isLifted ? styles.calendarRowLifted : ''
                      } ${isDimmed ? styles.calendarRowDim : ''}`}
                      key={week.key}
                    >
                      <button
                        aria-pressed={isLifted}
                        className={styles.calendarWeekTab}
                        onClick={() =>
                          setLiftedWeek((prev) => (prev === week.key ? null : week.key))
                        }
                        title="点击抽出或折回本周日报"
                        type="button"
                      >
                        <span>第{week.weekNumber}周</span>
                        <span className={styles.calendarWeekCount}>
                          {week.briefRows.length}期
                        </span>
                      </button>

                      {week.days.map((cell) => {
                        if (!cell.inMonth || !cell.row) {
                          return (
                            <div
                              className={`${styles.calendarCell} ${
                                !cell.inMonth ? styles.calendarCellOutside : ''
                              }`}
                              key={cell.date}
                            >
                              <span className={styles.calendarCellDay}>{cell.day}</span>
                            </div>
                          )
                        }

                        const row = cell.row
                        const isSelected = selected.has(row.key)

                        return (
                          <div
                            className={`${styles.calendarPaper} ${
                              row.hidden ? styles.calendarPaperHidden : ''
                            } ${isSelected ? styles.calendarPaperSelected : ''}`}
                            key={cell.date}
                          >
                            <div className={styles.calendarPaperTop}>
                              <span className={styles.calendarPaperDay}>{cell.day}</span>
                              <span
                                className={`${styles.calendarPaperStamp} ${
                                  row.hidden
                                    ? styles.calendarPaperStampHidden
                                    : styles.calendarPaperStampVisible
                                }`}
                              >
                                {row.hidden ? '封' : '在'}
                              </span>
                            </div>

                            <button
                              aria-label={`${row.title}（点击勾选）`}
                              className={styles.calendarPaperTitleBtn}
                              onClick={() => onToggleSelect(row.key)}
                              title={row.title}
                              type="button"
                            >
                              <span className={styles.calendarPaperTitle}>
                                {row.title}
                              </span>
                            </button>

                            <div className={styles.calendarPaperQuickBar}>
                              <button
                                className={styles.calendarQuickToggle}
                                disabled={writeDisabled}
                                onClick={() => onSetHidden([row], !row.hidden)}
                                type="button"
                              >
                                {row.hidden ? '设为显示' : '设为隐藏'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              <div className={styles.calendarMonthFoot}>
                <span>SPIRAL ARCHIVE CALENDAR · 折晓早报检校司</span>
                <span>点按日格标题可加入批量勾选 · 点按底部按钮立改显隐</span>
              </div>
            </div>
          </div>

          {/* 右侧错落 3D 竖排月份索引侧签 */}
          {months.length > 1 ? (
            <div
              aria-label="月份索引页签"
              className={styles.calendarTabs}
              role="tablist"
            >
              {months.map((month, idx) => {
                const active = idx === resolvedIndex
                const tabStyle = {
                  '--tab-lift': active ? 2 : Math.max(0, 1 - idx * 0.2),
                  '--tab-depth': idx,
                } as CSSProperties

                return (
                  <button
                    aria-selected={active}
                    className={`${styles.calendarTab} ${
                      active ? styles.calendarTabActive : ''
                    }`}
                    key={month.key}
                    onClick={() => goToMonth(idx)}
                    role="tab"
                    style={tabStyle}
                    type="button"
                  >
                    {month.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* 台历下方：早报检校签条明细（完整保留选择复选框与「显示 / 隐藏」双按钮） */}
      <div className={styles.ledgerSheet} style={{ marginTop: '1.6rem' }}>
        <ul className={styles.ledgerList}>
          {months.flatMap((m) => m.rows).map((row) => (
            <li
              className={`${styles.ledgerRow} ${
                row.hidden ? styles.ledgerRowHidden : ''
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
              <span
                aria-hidden="true"
                className={styles.ledgerSpineBar}
                style={{ background: row.spineColor }}
              />
              <span className={styles.ledgerMain}>
                <span className={styles.ledgerTitleRow}>
                  <span
                    className={`${styles.sealBadge} ${
                      row.hidden ? styles.sealHidden : styles.sealVisible
                    }`}
                  >
                    {row.hidden ? '封存' : '在架'}
                  </span>
                  <span className={styles.ledgerTitle}>{row.title}</span>
                </span>
                <span className={styles.ledgerMeta}>{row.meta}</span>
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
                <span className={styles.previewLink}>已隐入内库</span>
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
      </div>
    </div>
  )
}
