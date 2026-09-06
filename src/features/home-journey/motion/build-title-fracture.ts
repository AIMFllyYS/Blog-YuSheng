import gsap from 'gsap'
import type { MotionBuildContext } from './use-web-gsap-timeline'

function value(target: HTMLElement, key: string) {
  return Number(target.dataset[key] ?? 0)
}

function at(context: MotionBuildContext, progress: number) {
  return context.frames(Math.round((context.durationInFrames - 1) * progress))
}

function orbit(target: HTMLElement, angle: number, axis: 'x' | 'y') {
  const x = value(target, 'swirlX') - value(target, 'collapseX')
  const y = (value(target, 'swirlY') - value(target, 'collapseY')) / 0.44
  return axis === 'x'
    ? x * Math.cos(angle) - y * Math.sin(angle) + value(target, 'collapseX')
    : (x * Math.sin(angle) + y * Math.cos(angle)) * 0.44 + value(target, 'collapseY')
}

/** The full glyph and its source windows exchange at identical paint coordinates. */
export function buildTitleFracture(
  context: MotionBuildContext,
  glyphs: HTMLElement[],
  fragments: HTMLElement[],
) {
  const sourceState = {
    autoAlpha: 0, x: 0, y: 0, z: 0, scale: 1,
    rotation: 0, rotationX: 0, rotationY: 0, force3D: true,
  }
  gsap.set(fragments, sourceState)
  context.timeline
    .set(fragments, sourceState, 0)
    .to(glyphs, {
      filter: 'brightness(1.18)',
      duration: at(context, 0.018),
      ease: 'power2.inOut',
    }, at(context, 0.082))
    .addLabel('scatter', at(context, 0.1))
    .set(fragments, { autoAlpha: 1 }, at(context, 0.1))
    .set(glyphs, { autoAlpha: 0 }, at(context, 0.1))
    .to(fragments, {
      x: (_index, target: HTMLElement) => value(target, 'scatterX'),
      y: (_index, target: HTMLElement) => value(target, 'scatterY'),
      z: (_index, target: HTMLElement) => value(target, 'scatterZ'),
      rotation: (_index, target: HTMLElement) => value(target, 'scatterRotation'),
      rotationX: (_index, target: HTMLElement) => value(target, 'scatterTiltX'),
      rotationY: (_index, target: HTMLElement) => value(target, 'scatterTiltY'),
      scale: 0.92,
      duration: at(context, 0.086),
      stagger: { amount: context.frames(6), from: 'center' },
      ease: 'power3.inOut',
    }, at(context, 0.104))
    .to(fragments, {
      x: (_index, target: HTMLElement) => orbit(target, -0.85, 'x'),
      y: (_index, target: HTMLElement) => orbit(target, -0.85, 'y'),
      z: (_index, target: HTMLElement) => value(target, 'scatterZ') * 0.45,
      rotation: (_index, target: HTMLElement) => value(target, 'scatterRotation') + 52,
      rotationX: 0,
      rotationY: 0,
      scale: 0.76,
      duration: at(context, 0.023),
      ease: 'power2.inOut',
    }, at(context, 0.2))
    .to(fragments, {
      x: (_index, target: HTMLElement) => orbit(target, -0.4, 'x'),
      y: (_index, target: HTMLElement) => orbit(target, -0.4, 'y'),
      rotation: (_index, target: HTMLElement) => value(target, 'scatterRotation') + 78,
      duration: at(context, 0.014),
      ease: 'none',
    }, at(context, 0.223))
    .to(fragments, {
      x: (_index, target: HTMLElement) => value(target, 'swirlX'),
      y: (_index, target: HTMLElement) => value(target, 'swirlY'),
      rotation: (_index, target: HTMLElement) => value(target, 'scatterRotation') + 101,
      duration: at(context, 0.013),
      ease: 'power1.out',
    }, at(context, 0.237))
    .addLabel('scatter-end', at(context, 0.25))
    .to(fragments, {
      x: (_index, target: HTMLElement) => value(target, 'collapseX'),
      y: (_index, target: HTMLElement) => value(target, 'collapseY'),
      z: 0,
      rotation: (_index, target: HTMLElement) => value(target, 'scatterRotation') + 228,
      scale: 0.08,
      autoAlpha: 0,
      duration: at(context, 0.07),
      ease: 'power4.in',
    }, at(context, 0.25))
}
