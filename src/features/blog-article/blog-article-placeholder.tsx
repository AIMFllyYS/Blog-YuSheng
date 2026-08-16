import Link from 'next/link'
import type { Post } from '@/server/content'

export function BlogArticlePlaceholder({ post }: { post: Post }) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-16 text-[var(--ink)] md:px-10 md:py-24">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm text-[var(--accent)]" href="/blog/">
          ← 返回博客
        </Link>
        <header className="mt-12 border-y border-[var(--line)] py-12">
          <p className="text-sm text-[var(--ink-faint)]">
            {post.frontmatter.publishedAt}
          </p>
          <h1 className="mt-4 [font-family:var(--font-serif)] text-4xl font-semibold md:text-6xl">
            {post.frontmatter.title}
          </h1>
          <p className="mt-5 max-w-2xl leading-8 text-[var(--ink-muted)]">
            {post.frontmatter.description}
          </p>
        </header>
        <section className="mt-12 border border-dashed border-[var(--line)] p-8 text-[var(--ink-muted)]">
          正文渲染器将在 M2 接入；当前静态页已完成文章读取与元信息生成。
        </section>
      </div>
    </main>
  )
}
