'use client'

/**
 * 绳挂卷轴导航（D10 navigation 模块；首页尾声与后续博客页顶部共用）。
 * 视觉：绳索自顶部垂落，卷轴纸片挂件随风轻摆（轻量摆动，GSAP 管，不引物理引擎）。
 * 布局恒为终态；揭示动效由调用方（home-journey 主时间线）驱动 data 属性完成，
 * reduced-motion 下本组件不播放入场与摆动。
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'

type ThemeId = 'paper' | 'mist' | 'snow' | 'night'
const THEME_ORDER: ThemeId[] = ['paper', 'mist', 'snow', 'night']
const THEME_LABEL: Record<ThemeId, string> = {
  paper: '宣纸',
  mist: '雾青',
  snow: '米白',
  night: '夜',
}

interface NavEntry {
  id: string
  label: string
  href?: string
}

/** 路由项（routing.md 三）：博客为现役，其余为 D13 预留挂位 */
const NAV_LINKS: NavEntry[] = [
  { id: 'blog', label: '博客', href: '/blog/' },
  { id: 'notes', label: '随笔' },
  { id: 'works', label: '作品' },
  { id: 'about', label: '关于' },
]

export function RopeNav() {
  const rootRef = useRef<HTMLElement>(null)
  // 惰性初始化读取当前主题（组件仅在客户端树上使用；SSR 兜底 'paper'）
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof document === 'undefined') return 'paper'
    const current = document.documentElement.dataset.theme
    return current === 'mist' || current === 'snow' || current === 'night' ? current : 'paper'
  })
  const [soundOn, setSoundOn] = useState(false)

  // 挂件摆动（L2 GSAP；reduced-motion 停摆，frontend-design 3.3）
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = rootRef.current?.querySelectorAll<HTMLElement>('[data-rope-item]')
    if (!items || items.length === 0) return
    const tweens = [...items].map((el, i) =>
      gsap.to(el, {
        rotation: i % 2 === 0 ? 2.2 : -2.2,
        transformOrigin: 'top center',
        duration: 2.6 + (i % 3) * 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.35,
      }),
    )
    return () => tweens.forEach((t) => t.kill())
  }, [])

  const cycleTheme = () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]
    setTheme(next)
    document.documentElement.dataset.theme = next
  }

  return (
    <nav ref={rootRef} aria-label="主导航" className="pointer-events-none absolute inset-x-0 top-0">
      <ul className="flex items-start justify-center gap-5 px-4 sm:gap-8">
        {NAV_LINKS.map((entry) => (
          <li key={entry.id} data-rope-item className="pointer-events-auto">
            <RopeTag>
              {entry.href ? (
                <Link href={entry.href} className="block px-4 py-2 text-sm font-medium text-ink">
                  {entry.label}
                </Link>
              ) : (
                <span
                  className="block cursor-default px-4 py-2 text-sm text-ink-faint"
                  title="板块筹备中（D13 预留挂位）"
                  aria-disabled
                >
                  {entry.label}
                </span>
              )}
            </RopeTag>
          </li>
        ))}
        {/* 挂件项：主题与音效（就地切换，非路由） */}
        <li data-rope-item className="pointer-events-auto">
          <RopeTag>
            <button
              type="button"
              onClick={cycleTheme}
              className="block px-4 py-2 text-sm text-ink"
              aria-label={`切换主题，当前：${THEME_LABEL[theme]}`}
            >
              {THEME_LABEL[theme]}
            </button>
          </RopeTag>
        </li>
        <li data-rope-item className="pointer-events-auto">
          <RopeTag>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-pressed={soundOn}
              aria-label="音效开关（默认关闭）"
              className="block px-4 py-2 text-sm text-ink"
            >
              {soundOn ? '音·开' : '音·关'}
            </button>
          </RopeTag>
        </li>
      </ul>
    </nav>
  )
}

/** 绳索 + 卷轴纸片挂件（颜色全部走主题 token，D11 挂件随主题） */
function RopeTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <svg width="2" height="56" viewBox="0 0 2 56" aria-hidden className="text-line">
        <path d="M1 0 C 0.4 18, 1.6 38, 1 56" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <circle cx="1" cy="55" r="2.2" fill="currentColor" />
      </svg>
      <div className="-mt-1 rounded-md border border-line bg-scroll-paper/95 shadow-[0_6px_24px_-8px_var(--shadow-color)] backdrop-blur-sm">
        {children}
      </div>
    </div>
  )
}
