import Link from 'next/link'
import { RopeNavigation } from '@/features/navigation'
import { formatMonthDayCn, formatWeekdayCn, formatYearCn } from './brief-date'
import { BriefFrame } from './brief-frame'
import styles from './daily-brief.module.css'
import type { BriefEntry } from './types'

/**
 * `/daily/<date>/` 展报阅读台（Server Component）：
 * 绳挂之下一条报头条（品牌 / 期号 / 大号日期 / 原件标题 / 前后日与动作），
 * 下面整幅纸面交给 BriefFrame。
 */
export function BriefReader({
  brief,
  newer,
  older,
  issue,
}: {
  brief: BriefEntry
  /** 更近的一期（按存在的日期算，缺日自动跳过） */
  newer?: BriefEntry
  older?: BriefEntry
  /** 第几期（从最早一期起算） */
  issue: number
}) {
  return (
    <main className={styles.readerPage} data-brief-reader={brief.date}>
      <RopeNavigation />
      <div className={styles.lectern}>
        <header className={styles.masthead}>
          <div className={styles.mastBrand}>
            <span>折晓早报</span>
            <span className={styles.mastIssue}>No. {String(issue).padStart(3, '0')}</span>
          </div>
          <div className={styles.mastCenter}>
            <p className={styles.mastDate} style={{ margin: 0 }}>
              <span>{formatMonthDayCn(brief.month, brief.day)}</span>
              <span className={styles.mastWeekday}>
                {formatYearCn(brief.year)} · {formatWeekdayCn(brief.weekday)}
              </span>
            </p>
            <h1 className={styles.mastTitle} title={brief.title}>
              {brief.title}
            </h1>
          </div>
          <nav aria-label="日报导航" className={styles.mastActions}>
            <NeighbourLink brief={older} label="← 前一日" rel="prev" />
            <NeighbourLink brief={newer} label="后一日 →" rel="next" />
            <Link className={styles.action} href="/daily/" prefetch={false}>
              回台历
            </Link>
            <a
              className={styles.action}
              data-brief-original
              href={brief.publicUrl}
              rel="noreferrer"
              target="_blank"
            >
              原件 ↗
            </a>
          </nav>
        </header>

        <div className={styles.lecternStage}>
          <BriefFrame brief={brief} />
        </div>
      </div>
    </main>
  )
}

function NeighbourLink({
  brief,
  label,
  rel,
}: {
  brief: BriefEntry | undefined
  label: string
  rel: 'prev' | 'next'
}) {
  if (!brief) {
    return (
      <span aria-disabled="true" className={styles.action}>
        {label}
      </span>
    )
  }
  return (
    <Link
      className={styles.action}
      data-brief-neighbour={rel}
      href={brief.href}
      prefetch={false}
      rel={rel}
      title={`${brief.date} · ${brief.headline}`}
    >
      {label}
    </Link>
  )
}
