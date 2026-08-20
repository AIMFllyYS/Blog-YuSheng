'use client'

import { DEFAULT_THEME, getJourneyStyle, getThemeStyle } from '@/lib/theme'
import './globals.css'

const actionClassName =
  'mt-6 inline-flex min-h-11 items-center justify-center rounded-sm border border-[var(--line)] bg-[var(--accent)] px-4 text-sm font-semibold tracking-[0.12em] text-[var(--bg-elevated)] transition-colors duration-[var(--dur-fast)] ease-out hover:border-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html
      data-theme={DEFAULT_THEME}
      lang="zh-CN"
      style={{ ...getThemeStyle(DEFAULT_THEME), ...getJourneyStyle() }}
    >
      <body className="antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 py-16 text-[var(--ink)]">
          <section className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-elevated)] p-8 shadow-[0_24px_60px_var(--shadow-color)]">
            <p className="text-xs font-semibold tracking-[0.28em] text-[var(--accent)]">
              羽升书房
            </p>
            <h2 className="mt-4 [font-family:var(--font-serif)] text-3xl font-semibold tracking-[0.12em]">
              系统错误
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">
              {error.message}
            </p>
            <button className={actionClassName} onClick={reset} type="button">
              重试
            </button>
          </section>
        </div>
      </body>
    </html>
  )
}
