import gsap from 'gsap'
import type { MotionBuildContext } from './use-web-gsap-timeline'

function selectAll(scope: HTMLElement, selector: string) {
  const elements = Array.from(scope.querySelectorAll<HTMLElement>(selector))
  if (!elements.length) throw new Error(`Journey timeline requires ${selector}`)
  return elements
}
function selectOne(scope: HTMLElement, selector: string) {
  const element = scope.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`Journey timeline requires ${selector}`)
  return element
}

function motionValue(target: HTMLElement, key: string) {
  const value = Number(target.dataset[key])
  return Number.isFinite(value) ? value : 0
}

function at(context: MotionBuildContext, ratio: number) {
  return context.frames(Math.round((context.durationInFrames - 1) * ratio))
}

function span(context: MotionBuildContext, start: number, end: number) {
  return Math.max(context.frames(1), at(context, end) - at(context, start))
}

function seededDelay(
  seed: number,
  target: HTMLElement,
  channel: string,
  maxFrames: number,
  frames: (count: number) => number,
) {
  let hash = (seed >>> 0) ^ 0x811c9dc5
  const input = `${target.dataset.motionId ?? 'missing'}:${channel}`
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  return frames(Math.round(((hash >>> 0) / 0x100000000) * maxFrames))
}

function buildG04CipherEscalation(context: MotionBuildContext) {
  const glyphContainers = selectAll(context.scope, '[data-motto-glyph]')
  const resolvedGlyphs = selectAll(context.scope, '[data-motion-resolved-glyph]')
  const cipherGlyphs = selectAll(context.scope, '[data-motion-cipher-glyph]')
  const stagger = context.frames(1)

  context.timeline
    .to(
      resolvedGlyphs,
      {
        filter: 'brightness(1.8)',
        textShadow: '0 0 1.15em var(--journey-gold)',
        duration: span(context, 0, 0.03),
        stagger,
        ease: 'power3.out',
      },
      at(context, 0),
    )
    .fromTo(
      cipherGlyphs,
      { autoAlpha: 0, yPercent: 35, scaleY: 1.35 },
      {
        autoAlpha: 0.9,
        yPercent: 0,
        scaleY: 1,
        duration: span(context, 0.03, 0.08),
        stagger: (_index, target) =>
          seededDelay(
            context.seed,
            target,
            'G04-cipher-order',
            7,
            context.frames,
          ),
        ease: 'power3.out',
      },
      at(context, 0.03),
    )
    .to(
      resolvedGlyphs,
      {
        autoAlpha: 0,
        clipPath: 'inset(0 0 0 100%)',
        duration: span(context, 0.055, 0.1),
        stagger,
        ease: 'power4.in',
      },
      at(context, 0.055),
    )
    .to(
      glyphContainers,
      {
        x: (_index, target) => motionValue(target, 'scatterX'),
        y: (_index, target) => motionValue(target, 'scatterY'),
        rotation: (_index, target) => motionValue(target, 'scatterRotation'),
        scale: 0.76,
        duration: span(context, 0.08, 0.2),
        stagger: (_index, target) =>
          seededDelay(
            context.seed,
            target,
            'G04-scatter-order',
            9,
            context.frames,
          ),
        ease: 'power3.inOut',
      },
      at(context, 0.08),
    )
    .to(
      cipherGlyphs,
      {
        autoAlpha: 0,
        duration: span(context, 0.18, 0.235),
        ease: 'power3.in',
      },
      at(context, 0.18),
    )
}

function buildG33GlyphCover(context: MotionBuildContext) {
  const tiles = selectAll(context.scope, '[data-motion-tile]')

  context.timeline
    .fromTo(
      tiles,
      {
        x: (_index, target) => motionValue(target, 'entryX'),
        y: (_index, target) => motionValue(target, 'entryY'),
        rotation: (_index, target) => motionValue(target, 'entryRotation'),
        scale: 0.18,
        autoAlpha: 0,
      },
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        autoAlpha: 1,
        duration: span(context, 0.25, 0.32),
        stagger: context.frames(1),
        ease: 'power4.in',
      },
      at(context, 0.25),
    )
    .to(
      tiles,
      {
        x: (_index, target) => motionValue(target, 'exitX'),
        y: (_index, target) => motionValue(target, 'exitY'),
        rotation: (_index) => (_index % 2 === 0 ? -16 : 16),
        scale: 0.34,
        autoAlpha: 0,
        duration: span(context, 0.32, 0.42),
        stagger: (_index, target) =>
          seededDelay(
            context.seed,
            target,
            'G33-fragment-order',
            8,
            context.frames,
          ),
        ease: 'power4.out',
      },
      at(context, 0.32),
    )
}

export function buildJourneyTimeline(context: MotionBuildContext) {
  const titleGlyphs = selectAll(context.scope, '[data-title-glyph]')
  const titleFragments = selectAll(context.scope, '[data-title-fragment]')
  const scrollCue = selectOne(context.scope, '[data-scroll-cue]')
  const bookTitle = selectOne(context.scope, '[data-book-title]')
  const openGlyphs = selectAll(context.scope, '[data-open-glyph]')
  const narrativeLine = selectOne(context.scope, '[data-narrative-line]')
  const narrativeGlyphs = selectAll(context.scope, '[data-narrative-glyph]')
  const gateLine = selectOne(context.scope, '[data-gate-line]')
  const flash = selectOne(context.scope, '[data-journey-flash]')
  const homeShell = selectOne(context.scope, '[data-home-shell-layer]')
  const homeHangers = selectAll(context.scope, '[data-home-hanger]')
  const destinations = selectAll(context.scope, '[data-home-destination]')
  const skipButton = selectOne(context.scope, '[data-testid="journey-skip"]')
  const totalDuration = at(context, 1)

  context.timeline
    .addLabel('prologue', 0)
    .set('[data-motion-cipher-glyph]', { autoAlpha: 0 }, 0)
    .set(titleFragments, { autoAlpha: 0, scale: 0.35 }, 0)
    .set('[data-motion-tile]', { autoAlpha: 0 }, 0)
    .set(bookTitle, { autoAlpha: 0, y: 22, rotateZ: -3 }, 0)
    .set(openGlyphs, { autoAlpha: 0, scale: 0.45 }, 0)
    .set(narrativeLine, { autoAlpha: 0 }, 0)
    .set(narrativeGlyphs, { autoAlpha: 0, y: 24 }, 0)
    .set(gateLine, { autoAlpha: 0, clipPath: 'inset(0 50% 0 50%)' }, 0)
    .set(flash, { autoAlpha: 0 }, 0)
    .set(homeShell, { autoAlpha: 0, pointerEvents: 'none' }, 0)
    .set(homeHangers, { y: -120, rotation: -4, transformOrigin: '50% 0%' }, 0)
    .set(destinations, { autoAlpha: 0, y: 34 }, 0)
    .to(
      context.scope,
      {
        '--journey-timeline': 1,
        duration: totalDuration,
        ease: 'none',
      },
      0,
    )
    .to(
      scrollCue,
      {
        autoAlpha: 0,
        y: 12,
        duration: span(context, 0, 0.03),
        ease: 'power2.out',
      },
      0,
    )

  buildG04CipherEscalation(context)

  context.timeline
    .addLabel('scatter', at(context, 0.1))
    .to(
      titleGlyphs,
      {
        autoAlpha: 0,
        filter: 'blur(0.08em)',
        scale: 1.1,
        duration: span(context, 0.1, 0.2),
        stagger: context.frames(4),
        ease: 'power4.in',
      },
      at(context, 0.1),
    )
    .fromTo(
      titleFragments,
      { autoAlpha: 0, scale: 0.35 },
      {
        autoAlpha: 0.94,
        scale: 1,
        x: (_index, target) => motionValue(target, 'scatterX'),
        y: (_index, target) => motionValue(target, 'scatterY'),
        rotation: (_index, target) => motionValue(target, 'scatterRotation'),
        duration: span(context, 0.1, 0.2),
        stagger: (_index, target) =>
          seededDelay(
            context.seed,
            target,
            'title-fragment-order',
            8,
            context.frames,
          ),
        ease: 'power4.out',
      },
      at(context, 0.1),
    )
    .to(
      titleFragments,
      {
        x: (_index, target) => motionValue(target, 'swirlX'),
        y: (_index, target) => motionValue(target, 'swirlY'),
        rotation: '+=110',
        scale: 0.72,
        duration: span(context, 0.2, 0.25),
        ease: 'power3.inOut',
      },
      at(context, 0.2),
    )
    .addLabel('scatter-end', at(context, 0.25))
    .to(
      titleFragments,
      {
        x: 0,
        y: 0,
        scale: 0.14,
        autoAlpha: 0,
        duration: span(context, 0.25, 0.32),
        ease: 'power4.in',
      },
      at(context, 0.25),
    )

  buildG33GlyphCover(context)

  context.timeline
    .addLabel('gather', at(context, 0.32))
    .fromTo(
      bookTitle,
      { autoAlpha: 0, y: 22, rotateZ: -3 },
      {
        autoAlpha: 1,
        y: 0,
        rotateZ: 0,
        duration: span(context, 0.42, 0.48),
        ease: 'power4.out',
      },
      at(context, 0.42),
    )
    .addLabel('gather-end', at(context, 0.5))
    .to(
      bookTitle,
      {
        autoAlpha: 0,
        y: -18,
        duration: span(context, 0.5, 0.56),
        ease: 'power3.in',
      },
      at(context, 0.5),
    )
    .fromTo(
      openGlyphs,
      { autoAlpha: 0, x: 0, y: 0, scale: 0.45 },
      {
        autoAlpha: 0.88,
        x: (_index, target) => motionValue(target, 'floatX'),
        y: (_index, target) => motionValue(target, 'floatY'),
        scale: 1,
        duration: span(context, 0.56, 0.66),
        stagger: (_index, target) =>
          seededDelay(
            context.seed,
            target,
            'open-glyph-order',
            12,
            context.frames,
          ),
        ease: 'power3.out',
      },
      at(context, 0.56),
    )
    .to(
      openGlyphs.filter((_glyph, index) => index % 3 === 0),
      {
        y: (_index, target) => motionValue(target, 'rainY'),
        autoAlpha: 0,
        duration: span(context, 0.62, 0.72),
        ease: 'power2.in',
      },
      at(context, 0.62),
    )
    .set(narrativeLine, { autoAlpha: 1 }, at(context, 0.66))
    .fromTo(
      narrativeGlyphs,
      { autoAlpha: 0, y: 24, clipPath: 'inset(0 100% 0 0)' },
      {
        autoAlpha: 1,
        y: 0,
        clipPath: 'inset(0 0% 0 0)',
        duration: span(context, 0.66, 0.72),
        stagger: context.frames(1),
        ease: 'power4.out',
      },
      at(context, 0.66),
    )
    .addLabel('open-end', at(context, 0.75))
    .to(
      [narrativeLine, ...openGlyphs],
      {
        autoAlpha: 0,
        duration: span(context, 0.75, 0.82),
        ease: 'power3.in',
      },
      at(context, 0.75),
    )
    .to(
      flash,
      {
        autoAlpha: 0.7,
        duration: span(context, 0.75, 0.82),
        ease: 'power4.in',
      },
      at(context, 0.75),
    )
    .to(
      flash,
      {
        autoAlpha: 0.24,
        duration: span(context, 0.82, 0.88),
        ease: 'power3.out',
      },
      at(context, 0.82),
    )
    .fromTo(
      gateLine,
      { autoAlpha: 0, clipPath: 'inset(0 50% 0 50%)' },
      {
        autoAlpha: 1,
        clipPath: 'inset(0 0% 0 0)',
        duration: span(context, 0.82, 0.88),
        ease: 'power4.out',
      },
      at(context, 0.82),
    )
    .addLabel('gate', at(context, 0.88))
    .to(
      gateLine,
      {
        scale: 1.08,
        autoAlpha: 0,
        duration: span(context, 0.88, 0.95),
        ease: 'power4.in',
      },
      at(context, 0.88),
    )
    .to(
      flash,
      {
        autoAlpha: 0.92,
        duration: span(context, 0.88, 0.95),
        ease: 'power4.in',
      },
      at(context, 0.88),
    )
    .addLabel('gate-pass', at(context, 0.95))
    .set(homeShell, { pointerEvents: 'auto' }, at(context, 0.965))
    .to(
      homeShell,
      {
        autoAlpha: 1,
        duration: span(context, 0.95, 0.985),
        ease: 'power3.out',
      },
      at(context, 0.95),
    )
    .to(
      homeHangers,
      {
        y: 0,
        rotation: 0,
        duration: span(context, 0.955, 0.992),
        stagger: context.frames(3),
        ease: 'back.out(1.35)',
      },
      at(context, 0.955),
    )
    .to(
      destinations,
      {
        autoAlpha: 1,
        y: 0,
        duration: span(context, 0.965, 1),
        stagger: context.frames(3),
        ease: 'power4.out',
      },
      at(context, 0.965),
    )
    .to(
      flash,
      {
        autoAlpha: 0,
        duration: span(context, 0.95, 1),
        ease: 'power4.out',
      },
      at(context, 0.95),
    )
    .to(
      skipButton,
      {
        autoAlpha: 0,
        pointerEvents: 'none',
        duration: span(context, 0.95, 0.98),
        ease: 'power2.out',
      },
      at(context, 0.95),
    )
    .addLabel('epilogue', at(context, 1))
}

export function setPrologueWave(
  scope: HTMLElement,
  phase: number,
  timelineProgress: number,
) {
  if (timelineProgress > 0.025) return
  const titleGlyphs = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-title-glyph]'),
  )
  const mottoGlyphs = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-motto-glyph]'),
  )

  titleGlyphs.forEach((glyph, index) => {
    gsap.set(glyph, { y: Math.sin(phase * 0.72 + index * 1.1) * 4 })
  })
  mottoGlyphs.forEach((glyph, index) => {
    gsap.set(glyph, { y: Math.sin(phase * 0.9 + index * 0.72) * 2.5 })
  })
}
