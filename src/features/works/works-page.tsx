import { RopeNavigation } from '@/features/navigation'

export function WorksPage() {
  return (
    <main className="relative min-h-[100svh] bg-[var(--bg)] px-6 pb-16 pt-44 text-[var(--ink)]">
      <RopeNavigation />
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold tracking-[0.28em] text-[var(--ink-muted)]">
          卷三 · 造物
        </p>
        <h1 className="mt-4 [font-family:var(--font-serif)] text-4xl font-semibold tracking-[0.18em]">
          作品集
        </h1>
        <p className="mt-4 text-sm font-semibold tracking-[0.16em] text-[var(--accent)]">
          建设中
        </p>
        <p className="mt-6 text-sm leading-7 text-[var(--ink-muted)]">
          这里以后会放可以点开、可以演示、还可以继续生长的项目与作品。现在只先占住这个地址，方便顶部绳挂连上。
        </p>
      </div>
    </main>
  )
}
