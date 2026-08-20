import { RopeNavigation } from '@/features/navigation'

export function NotesPage() {
  return (
    <main className="relative min-h-[100svh] bg-[var(--bg)] px-6 pb-16 pt-44 text-[var(--ink)]">
      <RopeNavigation />
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold tracking-[0.28em] text-[var(--ink-muted)]">
          卷二 · 片语
        </p>
        <h1 className="mt-4 [font-family:var(--font-serif)] text-4xl font-semibold tracking-[0.18em]">
          随笔
        </h1>
        <p className="mt-4 text-sm font-semibold tracking-[0.16em] text-[var(--accent)]">
          建设中
        </p>
        <p className="mt-6 text-sm leading-7 text-[var(--ink-muted)]">
          这里以后会放不成文的短内容、生活记录和尚未长成文章的念头，按时间流慢慢堆上去。现在只先占住这个地址，方便顶部绳挂连上。
        </p>
      </div>
    </main>
  )
}
