'use client'

/**
 * 尾声 · 主页本体（storyboard 95–100%）：
 * 光散后呈现 —— 绳挂导航 + 板块入口 + 落款。基调仍是深夜星空：
 * - 在完整叙事中，星空由 GL 画布提供（本组件透明底，由主时间线驱动揭示）；
 * - reduced-motion 下独立使用，staticBackdrop 提供纯 CSS 静态星空。
 * 挂件颜色全部走主题 token（D11）。
 */
import Link from 'next/link'
import { JOURNEY_COPY, SECTION_ENTRIES } from '../constants'
import { RopeNav } from '../../navigation/rope-nav'

export function EpilogueHome({ staticBackdrop = false }: { staticBackdrop?: boolean }) {
  return (
    <div data-epilogue-root className="absolute inset-0 overflow-hidden">
      {staticBackdrop ? <CssStarBackdrop /> : null}

      <div data-epilogue className="relative flex h-full flex-col">
        <RopeNav />

        <main className="flex flex-1 flex-col items-center justify-center px-6 pt-24">
          <header className="mb-12 text-center" data-entry>
            <h1 className="text-4xl font-semibold tracking-wide text-accent sm:text-5xl">
              {JOURNEY_COPY.title}
            </h1>
            <p className="mt-3 text-sm tracking-[0.4em] text-ink-faint">{JOURNEY_COPY.subtitle}</p>
          </header>

          <section
            aria-label="板块入口"
            className="grid w-full max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {SECTION_ENTRIES.map((entry) =>
              entry.href ? (
                <Link
                  key={entry.id}
                  data-entry
                  href={entry.href}
                  className="group rounded-lg border border-line bg-scroll-paper/90 p-5 shadow-[0_10px_36px_-12px_var(--shadow-color)] backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1"
                >
                  <EntryBody title={entry.title} desc={entry.desc} tag={entry.tag} />
                </Link>
              ) : (
                <div
                  key={entry.id}
                  data-entry
                  aria-disabled
                  className="rounded-lg border border-line/60 bg-scroll-paper/60 p-5 opacity-75 backdrop-blur-sm"
                >
                  <EntryBody title={entry.title} desc={entry.desc} tag={entry.tag} />
                </div>
              ),
            )}
          </section>
        </main>

        <footer data-entry className="pb-6 text-center text-xs text-ink-faint">
          <p>© 2026 羽升 YuSheng · 羽化成蝶，升生不息</p>
        </footer>
      </div>
    </div>
  )
}

function EntryBody({ title, desc, tag }: { title: string; desc: string; tag: string }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink sm:text-lg">{title}</h2>
        <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
          {tag}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted sm:text-sm">{desc}</p>
    </>
  )
}

/** 纯 CSS 静态星空（reduced-motion 终态背景；不动、无脚本） */
function CssStarBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundColor: '#05070f',
        backgroundImage: [
          'radial-gradient(1.6px 1.6px at 12% 22%, rgba(242,239,231,0.9) 50%, transparent 51%)',
          'radial-gradient(1.2px 1.2px at 34% 68%, rgba(242,239,231,0.7) 50%, transparent 51%)',
          'radial-gradient(2px 2px at 58% 14%, rgba(216,173,87,0.85) 50%, transparent 51%)',
          'radial-gradient(1.3px 1.3px at 76% 46%, rgba(242,239,231,0.75) 50%, transparent 51%)',
          'radial-gradient(1.1px 1.1px at 90% 78%, rgba(242,239,231,0.6) 50%, transparent 51%)',
          'radial-gradient(1.8px 1.8px at 45% 88%, rgba(216,173,87,0.7) 50%, transparent 51%)',
          'radial-gradient(1.4px 1.4px at 5% 55%, rgba(242,239,231,0.65) 50%, transparent 51%)',
          'radial-gradient(1.5px 1.5px at 68% 92%, rgba(242,239,231,0.6) 50%, transparent 51%)',
          'radial-gradient(ellipse 60% 45% at 50% 110%, rgba(216,173,87,0.12), transparent 70%)',
          'radial-gradient(ellipse 45% 35% at 82% -8%, rgba(88,72,160,0.16), transparent 70%)',
        ].join(', '),
        backgroundSize: '100% 100%',
      }}
    />
  )
}
