'use client'

import Link from 'next/link'
import { RopeNavigation } from '@/features/navigation'
import { HOME_DESTINATIONS, JOURNEY_CONTENT } from '../content'
import { DestinationObject } from './destination-object'

export type HomeShellProps = {
  mode: 'cinematic' | 'reduced'
  discoveryRef?: (element: HTMLDivElement | null) => void
}

const backdropStyle = {
  backgroundImage:
    'radial-gradient(circle at 50% 2%, color-mix(in srgb, var(--journey-nebula) 58%, transparent) 0%, color-mix(in srgb, var(--journey-bg) 84%, transparent) 66%, transparent 100%), linear-gradient(180deg, color-mix(in srgb, var(--journey-bg) 38%, transparent), transparent 70%)',
}

function DestinationEntry({
  destination,
  index,
}: {
  destination: (typeof HOME_DESTINATIONS)[number]
  index: number
}) {
  const content = (
    <>
      <DestinationObject kind={destination.id} />
      <span className="text-[0.68rem] font-semibold tracking-[0.28em] text-[var(--ink-muted)]">
        {destination.eyebrow}
      </span>
      <span className="mt-5 block [font-family:var(--font-serif)] text-2xl font-semibold tracking-[0.12em] text-[var(--ink)]">
        {destination.label}
      </span>
      <span className="mt-3 block max-w-sm text-sm leading-7 text-[var(--ink-muted)]">
        {destination.description}
      </span>
      <span className="mt-7 flex min-h-11 items-center justify-between border-t border-[var(--line)] pt-3 text-xs font-semibold tracking-[0.16em] text-[var(--accent)]">
        <span>{destination.available ? '入卷阅读' : '筹备中'}</span>
        <span aria-hidden="true">{destination.available ? '↗' : `0${index + 1}`}</span>
      </span>
    </>
  )

  const className =
    'journey-destination-card group relative block min-h-[15.5rem] overflow-hidden border border-[var(--line)] bg-[var(--scroll-paper)] p-5 text-left shadow-[0_22px_58px_var(--shadow-color)] transition-[transform,border-color,box-shadow] duration-[var(--dur-slow)] before:absolute before:inset-y-4 before:left-0 before:w-1 before:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]'

  if (destination.available) {
    return (
      <Link
        className={`${className} hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_26px_68px_var(--shadow-color)]`}
        data-home-destination={destination.id}
        data-home-reveal
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
      className={`${className} cursor-not-allowed border-dashed`}
      data-home-destination={destination.id}
      data-home-reveal
      role="link"
    >
      {content}
    </div>
  )
}

export function HomeShell({ mode, discoveryRef }: HomeShellProps) {
  return (
    <section
      className="relative min-h-[100svh] bg-transparent px-4 pb-16 pt-44 text-[var(--journey-paper)] transition-colors duration-[var(--dur-slow)] ease-out md:px-8 md:pt-52"
      data-journey-mode={mode}
      data-testid="home-shell"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={backdropStyle}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[8%] top-24 h-px bg-[var(--journey-line)] opacity-60"
      />
      <RopeNavigation />

      <div className="relative mx-auto max-w-6xl">
        <header className="grid gap-8 border-b border-[var(--journey-line)] pb-10 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)] md:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.38em] text-[var(--journey-accent)]">
              众妙之门 · 已启
            </p>
            <h1 className="mt-5 [font-family:var(--font-serif)] text-5xl font-semibold tracking-[0.2em] text-[var(--journey-paper)] md:text-7xl">
              {JOURNEY_CONTENT.title}
            </h1>
            <p className="mt-5 text-sm tracking-[0.24em] text-[var(--journey-ink-muted)] md:text-base">
              {JOURNEY_CONTENT.motto}
            </p>
          </div>
          <blockquote className="border-l border-[var(--journey-accent)] pl-5 [font-family:var(--font-serif)] text-lg leading-9 text-[var(--journey-ink-muted)]">
            {JOURNEY_CONTENT.narrative}
          </blockquote>
        </header>

        <div className="mt-10 flex items-center justify-between gap-4">
          <p className="text-xs tracking-[0.28em] text-[var(--journey-ink-muted)]">
            择一卷，继续向里走
          </p>
          <span
            aria-hidden="true"
            className="h-px min-w-10 flex-1 bg-[var(--journey-line)]"
          />
          <span className="[font-family:var(--font-serif)] text-sm text-[var(--journey-accent)]">
            {JOURNEY_CONTENT.gateLine}
          </span>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_DESTINATIONS.map((destination, index) => (
            <DestinationEntry
              destination={destination}
              index={index}
              key={destination.id}
            />
          ))}
        </div>
        {mode === 'cinematic' ? <div ref={discoveryRef} data-home-star-slot className="relative mt-8 h-32" /> : null}
      </div>
    </section>
  )
}
