'use client'

import { useEffect, useState } from 'react'
import styles from './blog-index.module.css'
import type { ShelfBook } from './create-shelf-books'
import { ShelfStack } from './shelf-stack'
import { TreeIndex } from './tree-index'

const VIEW_STORAGE_KEY = 'blog-yusheng:blog-index-view:v1'

type ViewMode = 'pending' | 'shelf' | 'tree'

/**
 * 博客目录视图容器：
 * - 桌面端（fine pointer + 无 reduced-motion）：「书库 / 目录」可切换，书库 = 叠放典籍（纯 CSS 3D）；
 * - 移动端 / coarse pointer / reduced-motion：固定目录树并附说明，不渲染 ShelfStack。
 */
export function BlogIndexView({
  books,
  totalPosts,
}: {
  books: readonly ShelfBook[]
  totalPosts: number
}) {
  const [view, setView] = useState<ViewMode>('pending')
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const pointerQuery = window.matchMedia('(pointer: coarse)')

    const resolveFallback = () =>
      reducedQuery.matches || mobileQuery.matches || pointerQuery.matches

    const apply = () => {
      const isFallback = resolveFallback()
      setFallback(isFallback)
      if (isFallback) {
        setView('tree')
        return
      }
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
      setView(stored === 'tree' ? 'tree' : 'shelf')
    }

    apply()
    reducedQuery.addEventListener('change', apply)
    mobileQuery.addEventListener('change', apply)
    pointerQuery.addEventListener('change', apply)
    return () => {
      reducedQuery.removeEventListener('change', apply)
      mobileQuery.removeEventListener('change', apply)
      pointerQuery.removeEventListener('change', apply)
    }
  }, [])

  const switchView = (next: Exclude<ViewMode, 'pending'>) => {
    setView(next)
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  return (
    <section aria-label="文章书架">
      <div className={styles.shelfHeading}>
        <span className={styles.shelfLabel}>文章书架</span>
        <span className={styles.shelfCount}>
          {books.length} 个方向 · {totalPosts} 卷在架
        </span>
        {!fallback && (
          <span className={styles.viewToggle} role="group" aria-label="视图切换">
            <button
              aria-pressed={view !== 'tree'}
              className={styles.viewButton}
              onClick={() => switchView('shelf')}
              type="button"
            >
              书库
            </button>
            <button
              aria-pressed={view === 'tree'}
              className={styles.viewButton}
              onClick={() => switchView('tree')}
              type="button"
            >
              目录
            </button>
          </span>
        )}
      </div>

      {fallback && (
        <p className={styles.treeNote}>立体书库需桌面端访问，这里为你展开完整目录。</p>
      )}

      {view === 'tree' ? (
        <TreeIndex books={books} />
      ) : (
        <ShelfStack books={books} />
      )}
    </section>
  )
}
