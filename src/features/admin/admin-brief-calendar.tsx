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
  focusedKey,
  selected,
  writeDisabled,
  onFocusRow,
  onToggleSelect,
  onToggleBatchKeys,
  onSetHidden,
}: {
  readonly months: readonly AdminCalendarMonth[]
  readonly focusedKey?: string
  readonly selected: ReadonlySet<string>
  readonly writeDisabled: boolean
  readonly onFocusRow: (row: AdminRow) => void
  readonly onToggleSelect: (key: string) => void
  readonly onToggleBatchKeys: (keys: readonly string[], checked: boolean) => void
  readonly onSetHidden: (targets: readonly AdminRow[], hidden: boolean) => void
}) {
  const [activeMonthKey, setActiveMonthKey] = useState<string | undefined>(
    months[0]?.key,
  )
  const [liftedWeek, setLiftedWeek] = useState<string | null>(null)
  const [ledgerScope, setLedgerScope] = useState<'month' | 'all'>('month')

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

  const allBriefRows = months.flatMap((m) => m.rows)
  const displayedRows =
    ledgerScope === 'month' ? currentMonth.rows : allBriefRows
  const selectedInMonth = currentMonth.rows.filter((r) => selected.has(r.key))
  const allMonthSelected =
    currentMonth.rows.length > 0 &&
    selectedInMonth.length === currentMonth.rows.length

  return (
    <div className={styles.briefCalendarRoot} data-admin-brief-calendar>
      {/* 顶部月份快切与当月批处理条 */}
      <div className={styles.subStageBar}>
        <div className={styles.monthPillsBar} role="tablist" aria-label="月份快切">
          {months.map((month, idx) => {
            const active = idx === resolvedIndex
            return (
              <button
                aria-selected={active}
                className={`${styles.monthQuickPill} ${
                  active ? styles.monthQuickPillActive : ''
                }`}
                key={month.key}
                onClick={() => goToMonth(idx)}
                role="tab"
                type="button"
              >
                <span>{month.label}</span>
                <span className={styles.monthQuickCount}>
                  {month.visibleCount}/{month.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className={styles.subStageActions}>
          <button
            className={styles.tomeActionMiniBtn}
            onClick={() =>
              onToggleBatchKeys(
                currentMonth.rows.map((r) => r.key),
                !allMonthSelected,
              )
            }
            type="button"
          >
            {allMonthSelected ? '取消全选本月' : '全选本月'}
          </button>
          <button
            className={styles.tomeActionMiniBtn}
            disabled={writeDisabled || currentMonth.hiddenCount === 0}
            onClick={() => onSetHidden(currentMonth.rows, false)}
            type="button"
          >
            本月全显
          </button>
          <button
            className={styles.tomeActionMiniBtn}
            disabled={writeDisabled || currentMonth.visibleCount === 0}
            onClick={() => onSetHidden(currentMonth.rows, true)}
            type="button"
          >
            本月全隐
          </button>
        </div>
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
                    共收录 {currentMonth.count} 期日报 · 在架{' '}
                    {currentMonth.visibleCount} 期 · 封存{' '}
                    {currentMonth.hiddenCount} 期
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
                          setLiftedWeek((prev) =>
                            prev === week.key ? null : week.key,
                          )
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
                              <span className={styles.calendarCellDay}>
                                {cell.day}
                              </span>
                            </div>
                          )
                        }

                        const row = cell.row
                        const isSelected = selected.has(row.key)
                        const isFocused = focusedKey === row.key

                        return (
                          <div
                            className={`${styles.calendarPaper} ${
                              row.hidden ? styles.calendarPaperHidden : ''
                            } ${isSelected ? styles.calendarPaperSelected : ''} ${
                              isFocused ? styles.calendarPaperFocused : ''
                            }`}
                            key={cell.date}
                            onClick={() => onFocusRow(row)}
                          >
                            <div className={styles.calendarPaperTop}>
                              <span className={styles.calendarPaperDay}>
                                {cell.day}
                              </span>
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
                              aria-label={`${row.title}（点击检视并勾选）`}
                              className={styles.calendarPaperTitleBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                onFocusRow(row)
                                onToggleSelect(row.key)
                              }}
                              title={row.title}
                              type="button"
                            >
                              <span className={styles.calendarPaperTitle}>
                                {row.title}
                              </span>
                            </button>

                            <div
                              className={styles.calendarPaperQuickBar}
                              onClick={(e) => e.stopPropagation()}
                            >
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
                <span>
                  点按日格可检视并勾选 · 点按底部按钮立改显隐 · 点击左侧「第N周」放大整周
                </span>
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

      {/* 台历下方：同步当月/全量早报多列检校签条网格 */}
      <div className={styles.calendarLedgerSection}>
        <div className={styles.calendarLedgerHeader}>
          <span className={styles.calendarLedgerTitle}>
            {ledgerScope === 'month'
              ? `${currentMonth.label} · 早报明细（${currentMonth.rows.length} 期）`
              : `全部筛选早报明细（${allBriefRows.length} 期）`}
          </span>
          {months.length > 1 ? (
            <span className={styles.viewToggle} role="group">
              <button
                aria-pressed={ledgerScope === 'month'}
                className={styles.viewButton}
                onClick={() => setLedgerScope('month')}
                type="button"
              >
                仅看当月 ({currentMonth.rows.length})
              </button>
              <button
                aria-pressed={ledgerScope === 'all'}
                className={styles.viewButton}
                onClick={() => setLedgerScope('all')}
                type="button"
              >
                全部月份 ({allBriefRows.length})
              </button>
            </span>
          ) : null}
        </div>

        <div className={styles.ledgerSheet}>
          <ul className={styles.ledgerGridList}>
            {displayedRows.map((row) => (
              <li
                className={`${styles.ledgerRow} ${
                  row.hidden ? styles.ledgerRowHidden : ''
                } ${focusedKey === row.key ? styles.ledgerRowFocused : ''}`}
                key={row.key}
                onClick={() => onFocusRow(row)}
              >
                <input
                  aria-label={`选择 ${row.title}`}
                  checked={selected.has(row.key)}
                  className="size-4"
                  onChange={() => onToggleSelect(row.key)}
                  onClick={(e) => e.stopPropagation()}
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
                    <span className={styles.ledgerTitle} title={row.title}>
                      {row.title}
                    </span>
                  </span>
                  <span className={styles.ledgerMeta}>{row.meta}</span>
                </span>
                {!row.hidden ? (
                  <Link
                    className={styles.previewLink}
                    href={row.href}
                    onClick={(e) => e.stopPropagation()}
                    prefetch={false}
                    target="_blank"
                  >
                    阅览 ↗
                  </Link>
                ) : (
                  <span className={styles.previewLink}>已隐入内库</span>
                )}
                <span
                  className={styles.choiceGroup}
                  onClick={(e) => e.stopPropagation()}
                >
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
    </div>
  )
}
