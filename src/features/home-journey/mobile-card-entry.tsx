'use client'

/**
 * 移动端首页（D12）：经典卡片式板块入口。
 * 不加载任何 3D 资源；同一 URL 内由客户端设备检测切换（routing.md 五.2）。
 * 全部颜色走主题 token（frontend-design 1.3）。
 */
import Link from 'next/link'
import { JOURNEY_COPY, SECTION_ENTRIES } from './constants'

export function MobileCardEntry() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <header className="px-6 pb-10 pt-20 text-center">
        <h1 className="text-5xl font-semibold tracking-wide text-accent">{JOURNEY_COPY.title}</h1>
        <p className="mt-4 text-sm tracking-[0.35em] text-ink-muted">{JOURNEY_COPY.subtitle}</p>
      </header>

      <section className="mx-auto grid max-w-md gap-4 px-6 pb-16">
        {SECTION_ENTRIES.map((entry) =>
          entry.href ? (
            <Link
              key={entry.id}
              href={entry.href}
              className="group rounded-xl border border-line bg-bg-elevated p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardBody title={entry.title} desc={entry.desc} tag={entry.tag} />
            </Link>
          ) : (
            <div
              key={entry.id}
              aria-disabled
              className="rounded-xl border border-line/60 bg-bg-elevated/60 p-5 opacity-70"
            >
              <CardBody title={entry.title} desc={entry.desc} tag={entry.tag} />
            </div>
          ),
        )}
      </section>

      <footer className="border-t border-line px-6 py-8 text-center text-xs text-ink-faint">
        <p>© 2026 羽升 YuSheng · 羽化成蝶，升生不息</p>
      </footer>
    </main>
  )
}

function CardBody({ title, desc, tag }: { title: string; desc: string; tag: string }) {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">{tag}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
    </>
  )
}
