'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import styles from '@/features/admin/admin.module.css'
import {
  shadeColor,
  type AdminMonthSummary,
  type AdminRow,
  type AdminSectionSummary,
  type CategoryId,
} from '@/features/admin/admin-catalog-helpers'

export function AdminOverviewStage({
  rows,
  sections,
  months,
  focusedKey,
  selected,
  writeDisabled,
  onSelectCategory,
  onFocusRow,
  onToggleSelect,
  onSetHidden,
}: {
  readonly rows: readonly AdminRow[]
  readonly sections: readonly AdminSectionSummary[]
  readonly months: readonly AdminMonthSummary[]
  readonly focusedKey?: string
  readonly selected: ReadonlySet<string>
  readonly writeDisabled: boolean
  readonly onSelectCategory: (id: CategoryId) => void
  readonly onFocusRow: (row: AdminRow) => void
  readonly onToggleSelect: (key: string) => void
  readonly onSetHidden: (targets: readonly AdminRow[], hidden: boolean) => void
}) {
  return (
    <div className={styles.overviewRoot} data-admin-overview-stage>
      {/* 一、3D 藏书司双联舆图沙盘（左：长文各方向典籍，右：折晓早报各月份归档） */}
      <div className={styles.overviewDiptych}>
        <section aria-label="长文卷藏舆图" className={styles.diptychWing}>
          <div className={styles.diptychHeader}>
            <div>
              <p className={styles.kicker}>BLOG TOMES</p>
              <h3 className={styles.diptychTitle}>长文卷藏舆图</h3>
            </div>
            <button
              className={styles.diptychJumpBtn}
              onClick={() => onSelectCategory('posts')}
              type="button"
            >
              进入 3D 书脊架 →
            </button>
          </div>

          <ul className={styles.diptychList}>
            {sections.map((section) => {
              const ratio =
                section.count > 0
                  ? Math.round((section.visibleCount / section.count) * 100)
                  : 100
              return (
                <li key={section.slug}>
                  <button
                    className={styles.diptychItemBtn}
                    onClick={() => onSelectCategory(`post:${section.slug}`)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={styles.diptychSpinePip}
                      style={{ background: section.color }}
                    />
                    <span className={styles.diptychItemMain}>
                      <span className={styles.diptychItemTop}>
                        <span className={styles.diptychItemName}>
                          {section.title}
                        </span>
                        <span className={styles.diptychItemNums}>
                          {section.visibleCount}/{section.count} 在架
                          {section.hiddenCount > 0
                            ? ` · 封存 ${section.hiddenCount}`
                            : ''}
                        </span>
                      </span>
                      <span className={styles.diptychBarTrack}>
                        <span
                          className={styles.diptychBarFill}
                          style={{
                            width: `${ratio}%`,
                            background: section.color,
                          }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-label="折晓早报司历" className={styles.diptychWing}>
          <div className={styles.diptychHeader}>
            <div>
              <p className={styles.kicker}>DAILY BRIEFS</p>
              <h3 className={styles.diptychTitle}>折晓早报司历</h3>
            </div>
            <button
              className={styles.diptychJumpBtn}
              onClick={() => onSelectCategory('briefs')}
              type="button"
            >
              进入 3D 报亭台历 →
            </button>
          </div>

          <ul className={styles.diptychList}>
            {months.map((month) => {
              const ratio =
                month.count > 0
                  ? Math.round((month.visibleCount / month.count) * 100)
                  : 100
              return (
                <li key={month.month}>
                  <button
                    className={styles.diptychItemBtn}
                    onClick={() => onSelectCategory(`brief:${month.month}`)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={styles.diptychSpinePip}
                      style={{ background: '#73573b' }}
                    />
                    <span className={styles.diptychItemMain}>
                      <span className={styles.diptychItemTop}>
                        <span className={styles.diptychItemName}>
                          {month.label}
                        </span>
                        <span className={styles.diptychItemNums}>
                          {month.visibleCount}/{month.count} 在架
                          {month.hiddenCount > 0
                            ? ` · 封存 ${month.hiddenCount}`
                            : ''}
                        </span>
                      </span>
                      <span className={styles.diptychBarTrack}>
                        <span
                          className={styles.diptychBarFill}
                          style={{ width: `${ratio}%`, background: '#73573b' }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {/* 二、全站立体藏书案陈列架（高密度多列自适应书卷网格） */}
      <div className={styles.stageViewport}>
        <ul className={styles.stageGrid}>
          {rows.map((row) => {
            const isSelected = selected.has(row.key)
            const isFocused = focusedKey === row.key
            const spineStyle = {
              '--spine-color': row.spineColor,
              '--spine-dark': shadeColor(row.spineColor, -0.24),
            } as CSSProperties

            return (
              <li className={styles.volumeSlot} key={row.key}>
                <div
                  className={`${styles.volumeObject} ${
                    row.hidden ? styles.volumeHidden : styles.volumeVisible
                  } ${isSelected ? styles.volumeSelected : ''} ${
                    isFocused ? styles.volumeFocused : ''
                  }`}
                  onClick={() => onFocusRow(row)}
                  style={spineStyle}
                >
                  <div aria-hidden="true" className={styles.volumeTopEdge} />
                  <div aria-hidden="true" className={styles.volumeSpine}>
                    <span
                      className={`${styles.volumeSpineCap} ${styles.volumeSpineCapTop}`}
                    />
                    <span className={styles.volumeSpineText}>
                      {row.kind === 'posts' ? '长文卷' : '折晓报'}
                    </span>
                    <span
                      className={`${styles.volumeSpineCap} ${styles.volumeSpineCapBottom}`}
                    />
                  </div>

                  <div className={styles.volumeCover}>
                    {row.kind === 'briefs' ? (
                      <div aria-hidden="true" className={styles.briefRings}>
                        <span className={styles.briefRing} />
                        <span className={styles.briefRing} />
                        <span className={styles.briefRing} />
                        <span className={styles.briefRing} />
                      </div>
                    ) : null}

                    {row.hidden ? (
                      <span aria-hidden="true" className={styles.sealedRibbon}>
                        封存内库
                      </span>
                    ) : null}

                    <div className={styles.volumeHeader}>
                      <label
                        className={styles.volumeCheckWrap}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          aria-label={`选择 ${row.title}`}
                          checked={isSelected}
                          className="size-4"
                          onChange={() => onToggleSelect(row.key)}
                          type="checkbox"
                        />
                        <span className={styles.volumeKindTag}>{row.badge}</span>
                      </label>
                      <span
                        className={`${styles.sealBadge} ${
                          row.hidden ? styles.sealHidden : styles.sealVisible
                        }`}
                      >
                        {row.hidden ? '封存' : '在架'}
                      </span>
                    </div>

                    <div className={styles.volumeBody}>
                      <h3 className={styles.volumeTitle} title={row.title}>
                        {row.title}
                      </h3>
                      <span className={styles.volumeMeta} title={row.meta}>
                        {row.meta}
                      </span>
                    </div>

                    <div
                      className={styles.volumeFooter}
                      onClick={(e) => e.stopPropagation()}
                    >
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
                    </div>
                  </div>
                </div>
                <div aria-hidden="true" className={styles.shelfLedge} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
