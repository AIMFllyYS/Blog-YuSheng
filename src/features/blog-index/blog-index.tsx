import Link from 'next/link'
import type { BlogIndexEntry } from './create-blog-index-entries'
import { BlogIndexChrome } from './blog-index-chrome'
import styles from './blog-index.module.css'

const PUBLISHED_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Shanghai',
})

export function BlogIndex({ posts }: { posts: readonly BlogIndexEntry[] }) {
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

        <section aria-label="文章书架">
          <div className={styles.shelfHeading}>
            <span className={styles.shelfLabel}>文章书架</span>
            <span className={styles.shelfCount}>{posts.length} 卷在架</span>
          </div>

          {posts.length > 0 ? (
            <>
              <div className={styles.volumes}>
                {posts.map(({ slug, frontmatter, readingMinutes }, index) => (
                  <Link
                    className={styles.volume}
                    data-book-volume
                    href={`/blog/${slug}/`}
                    key={slug}
                    prefetch={false}
                  >
                    <span className={styles.spine}>
                      <span className={styles.volumeNumber}>卷 {index + 1}</span>
                    </span>
                    <div className={styles.volumeBody}>
                      <span className={styles.meta}>
                        <time
                          className={styles.date}
                          dateTime={frontmatter.publishedAt}
                        >
                          {PUBLISHED_DATE_FORMATTER.format(
                            new Date(frontmatter.publishedAt),
                          )}
                        </time>
                        <span className={styles.readingTime}>
                          预计阅读 {readingMinutes} 分钟
                        </span>
                      </span>
                      <h2 className={styles.articleTitle}>
                        {frontmatter.title}
                      </h2>
                      <p className={styles.description}>
                        {frontmatter.description}
                      </p>
                      {(frontmatter.tags?.length ?? 0) > 0 && (
                        <ul className={styles.tags} aria-label="文章标签">
                          {frontmatter.tags?.map((tag) => (
                            <li className={styles.tag} key={tag}>
                              {tag}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span aria-hidden="true" className={styles.enterMark}>↗</span>
                  </Link>
                ))}
              </div>
              <div aria-hidden="true" className={styles.shelfRail} />
            </>
          ) : (
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
          )}
        </section>
      </div>
    </main>
  )
}
