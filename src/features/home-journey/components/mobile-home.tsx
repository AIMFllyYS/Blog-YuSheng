'use client'

import Link from 'next/link'
import { RopeNavigation } from '@/features/navigation'
import { HOME_DESTINATIONS, JOURNEY_CONTENT } from '../content'

function MobileDestination({
  destination,
  index,
}: {
  destination: (typeof HOME_DESTINATIONS)[number]
  index: number
}) {
  const cardClassName =
    'relative flex min-h-36 w-full flex-col justify-between overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] p-5 text-left shadow-[0_14px_36px_var(--shadow-color)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
  const content = (
    <>
      <span className="flex items-center justify-between gap-4">
        <span className="text-[0.65rem] font-semibold tracking-[0.24em] text-[var(--ink-muted)]">
          {destination.eyebrow}
        </span>
        <span className="[font-family:var(--font-serif)] text-xs text-[var(--ink-faint)]">
          0{index + 1}
        </span>
      </span>
      <span>
        <span className="block [font-family:var(--font-serif)] text-2xl font-semibold tracking-[0.12em] text-[var(--ink)]">
          {destination.label}
        </span>
        <span className="mt-2 block text-sm leading-6 text-[var(--ink-muted)]">
          {destination.description}
        </span>
      </span>
      <span className="mt-4 flex min-h-11 items-center justify-between border-t border-[var(--line)] pt-3 text-xs font-semibold tracking-[0.14em] text-[var(--accent)]">
        {destination.available ? '前往阅读' : '筹备中'}
        <span aria-hidden="true">{destination.available ? '→' : '—'}</span>
      </span>
    </>
  )

  if (destination.available) {
    return (
      <Link
        className={`${cardClassName} transition-[transform,border-color] duration-[var(--dur-fast)] ease-out active:translate-y-0.5`}
        data-home-destination={destination.id}
        href={destination.href}
        prefetch={false}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      aria-disabled="true"
      className={`${cardClassName} cursor-not-allowed border-dashed`}
      data-home-destination={destination.id}
      role="link"
    >
      {content}
    </div>
  )
}

export function MobileHome() {
  return (
    <main
      className="relative min-h-[100svh] bg-[var(--bg)] px-4 pb-10 pt-40 text-[var(--ink)] transition-colors duration-[var(--dur-slow)] ease-out"
      data-journey-mode="mobile"
      data-testid="mobile-home"
    >
      <RopeNavigation compact />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-6 w-px bg-[var(--line)] opacity-40"
      />

      <div className="relative mx-auto max-w-lg pl-4">
        <header className="border-b border-[var(--line)] pb-7">
          <p className="text-[0.68rem] font-semibold tracking-[0.32em] text-[var(--accent)]">
            羽升 · 随身书匣
          </p>
          <h1 className="mt-4 [font-family:var(--font-serif)] text-4xl font-semibold tracking-[0.18em]">
            {JOURNEY_CONTENT.title}
          </h1>
          <p className="mt-4 text-sm tracking-[0.16em] text-[var(--ink-muted)]">
            {JOURNEY_CONTENT.motto}
          </p>
          <p className="mt-5 max-w-md [font-family:var(--font-serif)] text-sm leading-7 text-[var(--ink-muted)]">
            {JOURNEY_CONTENT.narrative}
          </p>
        </header>

        <section aria-labelledby="mobile-destinations-title" className="mt-7">
          <div className="mb-4 flex items-center gap-3">
            <h2
              className="shrink-0 text-xs font-semibold tracking-[0.24em] text-[var(--ink-muted)]"
              id="mobile-destinations-title"
            >
              四卷入口
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-[var(--line)]" />
          </div>
          <div className="grid gap-4">
            {HOME_DESTINATIONS.map((destination, index) => (
              <MobileDestination
                destination={destination}
                index={index}
                key={destination.id}
              />
            ))}
          </div>
        </section>

        <footer className="mt-8 border-t border-[var(--line)] pt-5 text-center [font-family:var(--font-serif)] text-xs tracking-[0.18em] text-[var(--ink-faint)]">
          {JOURNEY_CONTENT.gateLine}
        </footer>
      </div>
    </main>
  )
}
