'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import styles from './blog-index.module.css'
import {
  formatChapterDate,
  readCatalogHash,
  writeCatalogHash,
} from './catalog-helpers'
import type { ShelfBook } from './create-shelf-books'

/** 单册分组：组头可折叠（手风琴语义，多册可同时展开） */
function TreeGroup({ book }: { readonly book: ShelfBook }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // hash 深链：#<section-slug> 时本册默认展开并滚入视野
  useEffect(() => {
    const syncFromHash = () => {
      const slug = readCatalogHash()
      if (slug === book.slug) {
        setOpen(true)
        bodyRef.current?.closest('section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [book.slug])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      writeCatalogHash(book.slug)
      return
    }
    if (readCatalogHash() === book.slug) {
      writeCatalogHash(null)
    }
  }

  return (
    <section aria-label={book.title} className={styles.treeGroup} id={book.slug}>
      <button
        aria-expanded={open}
        className={styles.treeGroupHeader}
        onClick={toggle}
        type="button"
      >
        <div className={styles.treeGroupLead}>
          <p className={styles.chapterEyebrow}>一册</p>
          <h2 className={styles.treeGroupTitle}>{book.title}</h2>
          {book.summary && (
            <p className={styles.chapterSummary}>{book.summary}</p>
          )}
        </div>
        <span className={styles.treeGroupAside}>
          <span className={styles.chapterStats}>
            共 {book.chapters.length} 章 · 约 {book.totalReadingMinutes} 分钟
          </span>
          <span aria-hidden="true" className={styles.treeGroupChevron} />
        </span>
      </button>
      <div className={styles.treeGroupBody} data-open={open} ref={bodyRef}>
        <div className={styles.treeGroupInner}>
          <ol className={styles.chapters}>
            {book.chapters.map((entry, index) => (
              <li key={entry.slug}>
                <Link
                  className={styles.chapter}
                  href={`/blog/${entry.slug}/`}
                  prefetch={false}
                  tabIndex={open ? undefined : -1}
                >
                  <span className={styles.chapterIndex}>第{index + 1}章</span>
                  <span className={styles.chapterBody}>
                    <span className={styles.chapterTitle}>
                      {entry.frontmatter.title}
                    </span>
                    <span className={styles.chapterDescription}>
                      {entry.frontmatter.description}
                    </span>
                  </span>
                  <span className={styles.chapterMeta}>
                    <time dateTime={entry.frontmatter.publishedAt}>
                      {formatChapterDate(entry.frontmatter.publishedAt)}
                    </time>
                    <span>约 {entry.readingMinutes} 分钟</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/**
 * 目录树视图：手风琴分组的书卷列表。
 * 同时充当移动端 / coarse pointer / reduced-motion 的降级路径（不加载 3D）。
 */
export function TreeIndex({ books }: { books: readonly ShelfBook[] }) {
  return (
    <div className={styles.tree} data-blog-tree>
      {books.map((book) => (
        <TreeGroup book={book} key={book.slug} />
      ))}
    </div>
  )
}
