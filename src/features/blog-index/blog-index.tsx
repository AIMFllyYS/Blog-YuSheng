import { BlogIndexChrome } from './blog-index-chrome'
import styles from './blog-index.module.css'
import { BlogIndexView } from './blog-index-view'
import type { ShelfBook } from './create-shelf-books'

export function BlogIndex({
  books,
  totalPosts,
}: {
  books: readonly ShelfBook[]
  totalPosts: number
}) {
  return (
    <main className={styles.page} data-blog-index>
      <BlogIndexChrome />
      <div className={styles.room}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>羽升书房 · 长文卷藏</p>
            <h1 className={styles.title}>博客</h1>
          </div>
          <p className={styles.intro}>
            把 AI、技术判断、创作方法与个人成长，装订成可以慢慢翻阅的长思考。
          </p>
        </header>

        {totalPosts > 0 ? (
          <BlogIndexView books={books} totalPosts={totalPosts} />
        ) : (
          <section aria-label="文章书架">
            <div className={styles.shelfHeading}>
              <span className={styles.shelfLabel}>文章书架</span>
              <span className={styles.shelfCount}>0 个方向 · 0 卷在架</span>
            </div>
            <div className={styles.empty} data-blog-empty>
              <div aria-hidden="true" className={styles.emptyBooks}>
                <span className={styles.emptyBook} />
                <span className={styles.emptyBook} />
                <span className={styles.emptyBook} />
              </div>
              <p className={styles.emptyEyebrow}>空架待卷</p>
              <h2 className={styles.emptyTitle}>第一篇文章正在落墨</h2>
              <p className={styles.emptyText}>墨迹未干，过些时候再来翻阅。</p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
