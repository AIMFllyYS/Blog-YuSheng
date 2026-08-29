'use client'

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'

export function ViewportImport<P extends object>({
  fallback,
  load,
  props,
}: {
  readonly fallback: ReactNode
  readonly load: () => Promise<ComponentType<P>>
  readonly props: P
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [Comp, setComp] = useState<ComponentType<P>>()

  useEffect(() => {
    const element = ref.current
    if (!element) return
    let cancelled = false
    const start = () => {
      void load().then((loaded) => {
        if (!cancelled) setComp(() => loaded)
      })
    }
    const Observer = window.IntersectionObserver
    if (typeof Observer !== 'function') {
      const timeout = window.setTimeout(start, 0)
      return () => {
        cancelled = true
        window.clearTimeout(timeout)
      }
    }
    const root = element.closest('[data-reader-center]')
    const observer = new Observer(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        start()
      },
      {
        root: root instanceof Element ? root : null,
        rootMargin: '200px 0px',
      },
    )
    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [load])

  if (!Comp) {
    return (
      <div ref={ref} role="status">
        {fallback}
      </div>
    )
  }
  return <Comp {...props} />
}
