import type { ReactNode } from 'react'
import { ReaderDivider } from './reader-divider'
import { ReaderChrome } from './reader-chrome'
import { ReaderLayoutInteractions } from './reader-layout-interactions'
import styles from './reader-layout.module.css'

type ReaderLayoutProps = {
  readonly article: ReactNode
  readonly description: string
  readonly publishedAt: string
}

const wavePaths = {
  back: 'M0 50 C180 28 360 70 540 44 C720 20 900 68 1080 40 C1140 32 1180 36 1200 38 L1200 80 L0 80 Z',
  front: 'M0 40 C200 22 420 64 640 42 C860 22 1040 60 1200 36 L1200 80 L0 80 Z',
  line: 'M0 40 C200 22 420 64 640 42 C860 22 1040 60 1200 36',
} as const

function ReaderWave({ className }: { readonly className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      viewBox="0 0 1200 80"
    >
      <path className={styles.waveBack} d={wavePaths.back} />
      <path className={styles.waveFront} d={wavePaths.front} />
      <path className={styles.waveLine} d={wavePaths.line} />
    </svg>
  )
}

export function ReaderLayout({ article, description, publishedAt }: ReaderLayoutProps) {
  return (
    <main className={styles.readerPage} data-reader-page>
      <ReaderChrome />
      <section className={styles.shell} data-reader-shell>
        <aside
          className={`${styles.column} ${styles.leftColumn}`}
          aria-label="文章目录"
          data-reader-column="left"
          id="reader-left-drawer"
          tabIndex={-1}
        >
          <div className={styles.panelHeading}>
            <span className={styles.hangingLabel}>目录</span>
          </div>
          <div className={styles.placeholderPanel}>
            <p>文章目录</p>
            <span>目录结构将在下一阶段由正文大纲生成。</span>
          </div>
        </aside>

        <ReaderDivider side="left" />

        <section
          className={`${styles.column} ${styles.centerColumn}`}
          data-reader-center
        >
          <div className={styles.article} data-reader-article>
            <header className={styles.articleMeta}>
              <span>{publishedAt}</span>
              <p>{description}</p>
            </header>
            {article}
          </div>
        </section>

        <ReaderDivider side="right" />

        <aside
          className={`${styles.column} ${styles.rightColumn}`}
          aria-label="阅读工作区"
          data-reader-column="right"
          id="reader-right-drawer"
          tabIndex={-1}
        >
          <div className={styles.panelHeading}>
            <span className={styles.workspaceTab}>注释</span>
            <span>评论</span>
            <span>Agent</span>
          </div>
          <div className={styles.placeholderPanel}>
            <p>边读边记</p>
            <span>工作区将在后续阶段接入注释、评论与电子分身。</span>
          </div>
        </aside>
      </section>

      <ReaderWave className={styles.shellHem} />

      <section
        aria-label="文章评论"
        className={styles.footerComments}
        data-reader-footer
      >
        <ReaderWave className={styles.footerWave} />
        <div className={styles.footerInner}>
          <div className={styles.footerHeading}>
            <h2>评论</h2>
            <span>文章级</span>
          </div>
          <p>
            这里会与右栏「评论」共享同一份文章级数据。评论功能即将开放。
          </p>
          <div className={styles.comingSoon} role="status">
            <span aria-hidden="true">卷</span>
            <div>
              <strong>评论功能即将开放</strong>
              <small>当前仅保留完整页尾外壳，不提供不可用的假输入框。</small>
            </div>
          </div>
        </div>
      </section>

      <ReaderLayoutInteractions />
    </main>
  )
}
