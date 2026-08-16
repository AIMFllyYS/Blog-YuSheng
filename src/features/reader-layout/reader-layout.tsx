import type { ReactNode } from 'react'
import { FallingToastProvider } from '@/components/ui/falling-toast'
import { AnnotationHighlights } from '@/features/annotations/highlights'
import { SelectionToolbar } from '@/features/annotations/selection'
import { DiscussionRuntimeProvider } from '@/features/discussions/runtime'
import type { MemoryDiscussionSeed } from '@/features/discussions/repository'
import type { CompiledDocument } from '@/features/doc-engine/core'
import type { SelectionDocumentIndex } from '@/features/doc-engine/selection'
import type { DocumentOutline } from '@/features/doc-engine/toc'
import { ExportRuntimeProvider } from '@/features/export-service/export-runtime'
import { ArticleToc, HashDeepLink } from '@/features/toc'
import { ReaderDivider } from './reader-divider'
import { ReaderChrome } from './reader-chrome'
import { ReaderLayoutInteractions } from './reader-layout-interactions'
import { ReaderWorkspace } from './reader-workspace'
import styles from './reader-layout.module.css'

type ReaderLayoutProps = {
  readonly article: ReactNode
  readonly articleSlug: string
  readonly assetManifest?: readonly unknown[]
  readonly description: string
  readonly discussionSeed?: MemoryDiscussionSeed
  readonly document: CompiledDocument
  readonly outline: DocumentOutline
  readonly publishedAt: string
  readonly selectionIndex: SelectionDocumentIndex
  readonly title: string
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

export function ReaderLayout({
  article,
  articleSlug,
  assetManifest = [],
  description,
  discussionSeed,
  document,
  outline,
  publishedAt,
  selectionIndex,
  title,
}: ReaderLayoutProps) {
  return (
    <FallingToastProvider>
      <ExportRuntimeProvider
        articleSlug={articleSlug}
        assetManifest={assetManifest}
        document={document}
      >
      <DiscussionRuntimeProvider
        articleSlug={articleSlug}
        seed={discussionSeed}
        selectionIndex={selectionIndex}
      >
        <main className={styles.readerPage} data-reader-page>
        <ReaderChrome />
        <HashDeepLink />
        <SelectionToolbar index={selectionIndex} />
        <section className={styles.shell} data-reader-shell>
          <aside
            className={`${styles.column} ${styles.leftColumn}`}
            aria-label="文章目录"
            data-reader-column="left"
            id="reader-left-drawer"
            tabIndex={-1}
          >
            <ArticleToc articleSlug={articleSlug} outline={outline} />
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
            <ReaderWorkspace articleTitle={title} />
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

        <AnnotationHighlights />
        <ReaderLayoutInteractions />
        </main>
      </DiscussionRuntimeProvider>
      </ExportRuntimeProvider>
    </FallingToastProvider>
  )
}
