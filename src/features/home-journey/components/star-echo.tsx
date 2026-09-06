import gsap from 'gsap'
import { useEffect, useRef } from 'react'

/** A finite echo, drawn only on discovery. Decorative stars stay batched in
 * WebGL; the four semantic hotspots are the only DOM hit targets. */
export function StarEcho({ left, top, variant }: { left: number; top: number; variant: number }) {
  const rootRef = useRef<SVGSVGElement>(null)
  const direction = left > 50 ? -1 : 1
  const x = left * 10
  const y = top * 10
  const dots = Array.from({ length: 7 }, (_, index) => ({
    x: x + direction * (28 + index * 24),
    y: y + Math.sin(index * 0.87 + variant) * 34 - index * 9,
  }))
  const path = `M ${x} ${y} ${dots.map((dot) => `L ${dot.x} ${dot.y}`).join(' ')}`

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const context = gsap.context(() => {
      gsap.timeline()
        .fromTo('[data-echo-wave]', { attr: { r: 1 }, opacity: 0.8 }, { attr: { r: 74 }, opacity: 0, duration: 1.8, ease: 'power3.out' }, 0)
        .fromTo('[data-echo-path]', { strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 0.62, duration: 1.15, ease: 'power2.inOut' }, 0.12)
        .fromTo('[data-echo-dot]', { opacity: 0 }, { opacity: 0.9, duration: 0.45, stagger: 0.1, ease: 'power2.out' }, 0.28)
        .to('[data-echo-path], [data-echo-dot]', { opacity: 0, duration: 1.35, ease: 'power2.in' }, 2.2)
    }, root)
    return () => context.revert()
  }, [])

  return (
    <svg ref={rootRef} data-star-echo className="journey-star-echo" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <circle data-echo-wave cx={x} cy={y} r="1" fill="none" stroke="currentColor" strokeWidth="0.65" />
      <path data-echo-path d={path} pathLength="1" strokeDasharray="1" strokeDashoffset="1" fill="none" stroke="currentColor" strokeWidth="0.75" />
      {dots.map((dot, index) => <circle key={index} data-echo-dot cx={dot.x} cy={dot.y} r={index % 3 === 0 ? 1.8 : 1.05} fill="currentColor" opacity="0" />)}
    </svg>
  )
}
