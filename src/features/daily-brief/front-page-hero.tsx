import Link from 'next/link'
import {
  formatMonthDayCn,
  formatWeekdayCn,
  formatYearCn,
} from './brief-date'
import styles from './daily-brief.module.css'
import type { BriefEntry } from './types'

/**
 * 今日头版：最新一期的大幅纸张，进页时右半绕中缝展开（CSS 动画，reduced-motion 直接终态）。
 * 无状态、无 hooks，可被视图容器直接嵌入。
 */
export function FrontPageHero({
  brief,
  issue,
}: {
  brief: BriefEntry
  /** 第几期（从最早一期起算） */
  issue: number
}) {
  return (
    <article aria-labelledby="daily-hero-headline" className={styles.hero} data-brief-hero>
      <div className={styles.heroSheet}>
        <div className={`${styles.heroHalf} ${styles.heroLeft}`}>
          <div className={styles.heroBrand}>
            <span>折晓早报</span>
            <span className={styles.heroIssue}>No. {String(issue).padStart(3, '0')}</span>
          </div>
          <p className={styles.heroDate}>
            {formatMonthDayCn(brief.month, brief.day)}
            <span className={styles.heroWeekday}>
              {formatYearCn(brief.year)} · {formatWeekdayCn(brief.weekday)}
            </span>
          </p>
          <span aria-hidden="true" className={styles.heroStamp}>
            今
          </span>
        </div>
        <div className={`${styles.heroHalf} ${styles.heroRight}`}>
          <p className={styles.kicker}>今日头版</p>
          <h2 className={styles.heroHeadline} id="daily-hero-headline">
            {brief.headline}
          </h2>
          {brief.thesis && <p className={styles.heroThesis}>{brief.thesis}</p>}
          <p className={styles.heroMeta}>
            {brief.genre && <span>{brief.genre}</span>}
            {brief.style && <span>{brief.style}</span>}
            <span>{brief.date}</span>
          </p>
          <Link className={styles.heroCta} href={brief.href} prefetch={false}>
            <span>展开阅读</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
