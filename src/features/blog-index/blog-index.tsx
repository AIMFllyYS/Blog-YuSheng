import Link from 'next/link'

export function BlogIndex() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-16 text-[var(--ink)] md:px-10 md:py-24">
      <div className="mx-auto max-w-4xl">
        <Link
          className="inline-flex min-h-11 items-center border-b border-[var(--line)] text-sm tracking-[0.16em] text-[var(--accent)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          href="/"
        >
          ← 返回众妙之门
        </Link>

        <header className="mt-16 border-y border-[var(--line)] py-12 md:py-16">
          <p className="text-xs font-semibold tracking-[0.34em] text-[var(--accent)]">
            卷一 · 长文
          </p>
          <h1 className="mt-5 [font-family:var(--font-serif)] text-5xl font-semibold tracking-[0.18em] md:text-7xl">
            博客
          </h1>
          <p className="mt-6 max-w-2xl [font-family:var(--font-serif)] text-base leading-8 text-[var(--ink-muted)] md:text-lg">
            这里将收录关于 AI、技术判断、创作方法与个人成长的长思考。
          </p>
        </header>

        <section
          aria-labelledby="empty-shelf-title"
          className="mt-12 border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-6 py-12 shadow-[0_18px_56px_var(--shadow-color)] md:px-10"
        >
          <p className="text-xs tracking-[0.28em] text-[var(--ink-faint)]">
            书架状态 · 编目中
          </p>
          <h2
            className="mt-4 [font-family:var(--font-serif)] text-2xl font-semibold tracking-[0.12em]"
            id="empty-shelf-title"
          >
            第一篇文章正在落墨
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--ink-muted)]">
            入口已经可达；内容仓库接入后，文章会在这里按卷展开。
          </p>
        </section>
      </div>
    </main>
  )
}
