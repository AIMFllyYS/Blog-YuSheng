import { RopeNavigation } from '@/features/navigation'
import { DailyBriefIndexView } from './daily-brief-index-view'
import styles from './daily-brief.module.css'
import type { BriefEntry } from './types'

/** `/daily/` 目录页外壳（Server Component）：绳挂 + 页头 + 视图容器 / 空状态 */
export function DailyBriefIndex({ briefs }: { briefs: readonly BriefEntry[] }) {
  return (
    <main className={styles.page} data-daily-index>
      <RopeNavigation />
      <div className={styles.room}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>折晓早报 · 日课卷藏</p>
            <h1 className={styles.title}>小日报</h1>
          </div>
          <p className={styles.intro}>
            每天清晨由电子分身折好的一份 AI 早报：按月归档、按周翻阅，最新一期总在头版。
          </p>
        </header>

        {briefs.length > 0 ? (
          <DailyBriefIndexView briefs={briefs} />
        ) : (
          <section aria-label="日报台历">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionLabel}>报亭台历</span>
              <span className={styles.sectionCount}>0 个月 · 0 份在册</span>
            </div>
            <div className={styles.empty} data-daily-empty>
              <p className={styles.kicker}>报亭待印</p>
              <h2 className={styles.emptyTitle}>第一份日报还在排版</h2>
              <p className={styles.emptyText}>清晨的第一版会自动送到这里。</p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
