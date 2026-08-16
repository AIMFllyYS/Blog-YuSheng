'use client'

import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import styles from './falling-toast.module.css'

const TOAST_COOLDOWN_MS = 1_000
const TOAST_START_Y = 56
const CLIPS = [
  'polygon(0% 0%,54% 0%,47% 18%,58% 36%,12% 48%,0% 28%)',
  'polygon(54% 0%,100% 0%,100% 22%,86% 40%,61% 28%,47% 18%)',
  'polygon(100% 22%,100% 68%,78% 82%,64% 54%,86% 40%)',
  'polygon(100% 68%,100% 100%,56% 100%,48% 78%,78% 82%)',
  'polygon(56% 100%,0% 100%,0% 62%,22% 70%,48% 78%)',
  'polygon(0% 28%,12% 48%,36% 58%,22% 70%,0% 62%)',
  'polygon(58% 36%,61% 28%,86% 40%,64% 54%,36% 58%,12% 48%)',
] as const
const KICKS = [
  [-110, -36, -28],
  [96, -42, 24],
  [128, 18, 36],
  [88, 92, 20],
  [-102, 86, -24],
  [-74, 28, -16],
  [12, 64, 10],
] as const

type ToastItem = { readonly id: number; readonly message: string; readonly x: number }
type ToastApi = { readonly notify: (message: string) => boolean }

const ToastContext = createContext<ToastApi>({ notify: () => false })

function FallingToast({
  item,
  onRemove,
}: {
  readonly item: ToastItem
  readonly onRemove: (id: number) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const heldRef = useRef(false)
  const landedRef = useRef(false)
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tearTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [held, setHeld] = useState(false)
  const [fading, setFading] = useState(false)
  const [tearing, setTearing] = useState(false)
  const [shardsOut, setShardsOut] = useState(false)
  const scheduleRemoval = useCallback(() => {
    setFading(true)
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
    removeTimerRef.current = setTimeout(() => onRemove(item.id), 460)
  }, [item.id, onRemove])

  useEffect(() => {
    const element = rootRef.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      element.style.top = '92px'
      const timer = setTimeout(() => onRemove(item.id), 2_400)
      return () => clearTimeout(timer)
    }

    let frame = 0
    let previous = 0
    let age = 0
    let y = TOAST_START_Y
    let velocity = 0.45
    const baseRotation = -2.4 + Math.random() * 2.2
    const tick = (now: number) => {
      if (!heldRef.current) {
        const delta = Math.min(32, now - (previous || now)) / 16.67
        age += delta
        velocity = Math.min(3.2, velocity + 0.055 * delta)
        y += velocity * delta
        const floor = Math.max(24, window.innerHeight - element.offsetHeight - 56)
        if (y >= floor) {
          landedRef.current = true
          y = floor
          element.style.top = `${y}px`
          element.style.transform = `translateX(-50%) rotate(${baseRotation}deg)`
          scheduleRemoval()
          return undefined
        }
        element.style.top = `${y}px`
        element.style.transform = `translateX(-50%) rotate(${baseRotation + Math.sin(age * 0.1) * 2.6}deg)`
      }
      previous = now
      frame = requestAnimationFrame(tick)
      return undefined
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
      if (tearTimerRef.current) clearTimeout(tearTimerRef.current)
    }
  }, [item.id, onRemove, scheduleRemoval])

  const tear = () => {
    if (tearing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onRemove(item.id)
      return
    }
    heldRef.current = true
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
    setFading(false)
    setTearing(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setShardsOut(true)))
    tearTimerRef.current = setTimeout(() => onRemove(item.id), 780)
  }

  return (
    <div
      className={`${styles.toast} ${held ? styles.held : ''} ${fading ? styles.fading : ''}`}
      data-falling-toast={item.id}
      onClick={tear}
      onMouseEnter={() => {
        heldRef.current = true
        if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
        setHeld(true)
        setFading(false)
      }}
      onMouseLeave={() => {
        heldRef.current = false
        setHeld(false)
        if (landedRef.current && !tearing) scheduleRemoval()
      }}
      ref={rootRef}
      role="status"
      style={{ left: `${item.x}px` }}
      title="悬停暂停，点击撕碎"
    >
      <div className={styles.stage}>
        <div className={`${styles.sheet} ${tearing ? styles.hiddenSheet : ''}`}>
          <span className={styles.kicker}>通知</span>
          <p className={styles.body}>{item.message}</p>
        </div>
        {tearing &&
          CLIPS.map((clipPath, index) => {
            const [x, y, rotation] = KICKS[index]
            const style = {
              '--kick-r': `${rotation}deg`,
              '--kick-x': `${x}px`,
              '--kick-y': `${y}px`,
              clipPath,
            } as CSSProperties
            return (
              <div
                className={`${styles.sheet} ${styles.shard} ${shardsOut ? styles.shardOut : ''}`}
                data-toast-shard
                key={clipPath}
                style={style}
              >
                <span className={styles.kicker}>通知</span>
                <p className={styles.body}>{item.message}</p>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export function FallingToastProvider({ children }: { readonly children: ReactNode }) {
  const [items, setItems] = useState<readonly ToastItem[]>([])
  const lastToastAtRef = useRef(0)
  const nextIdRef = useRef(1)
  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])
  const notify = useCallback((message: string) => {
    const now = Date.now()
    if (now - lastToastAtRef.current < TOAST_COOLDOWN_MS) return false
    lastToastAtRef.current = now
    const width = Math.min(360, window.innerWidth * 0.92)
    const half = width / 2
    const min = 16 + half
    const max = window.innerWidth - 16 - half
    const id = nextIdRef.current
    nextIdRef.current += 1
    setItems((current) => {
      let x = window.innerWidth / 2
      let attempts = 0
      do {
        x = max <= min ? window.innerWidth / 2 : min + Math.random() * (max - min)
        attempts += 1
      } while (attempts < 8 && current.some((item) => Math.abs(item.x - x) < 96))
      return [...current, { id, message, x }]
    })
    return true
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className={styles.layer} data-toast-layer>
        {items.map((item) => (
          <FallingToast item={item} key={item.id} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useFallingToast(): ToastApi {
  return useContext(ToastContext)
}
