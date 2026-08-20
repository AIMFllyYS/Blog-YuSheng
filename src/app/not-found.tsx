import Link from 'next/link'

const actionClassName =
  'mt-6 inline-flex min-h-11 items-center justify-center rounded-sm border border-[var(--line)] bg-[var(--accent)] px-4 text-sm font-semibold tracking-[0.12em] text-[var(--bg-elevated)] transition-colors duration-[var(--dur-fast)] ease-out hover:border-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 py-16 text-[var(--ink)]">
      <section className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-elevated)] p-8 shadow-[0_24px_60px_var(--shadow-color)]">
        <p className="text-xs font-semibold tracking-[0.28em] text-[var(--accent)]">
          羽升书房
        </p>
        <h1 className="mt-4 [font-family:var(--font-serif)] text-4xl font-semibold tracking-[0.18em]">
          404
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">
          页面不存在。也许写错了路径，也许这页还没装订。
        </p>
        <Link className={actionClassName} href="/" prefetch={false}>
          返回首页
        </Link>
      </section>
    </div>
  )
}
