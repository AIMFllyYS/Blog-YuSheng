'use client'

import Link from 'next/link'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useFallingToast } from '@/components/ui/falling-toast'
import { getThemeLabel, type ThemeName } from '@/lib/theme'
import { Hanger } from './hanger'
import {
  AudioIcon,
  GithubIcon,
  SettingsIcon,
  ShareIcon,
  ThemeIcon,
} from './navigation-icons'
import { ExportMenu } from '@/features/export-service/export-menu'
import { SettingsPanel } from './settings-panel'

export type RopeNavigationProps = {
  audioEnabled: boolean
  brandHref?: string
  compact?: boolean
  onAudioEnabledChange: (enabled: boolean) => void
  onCycleTheme: () => void
  onThemeChange: (theme: ThemeName) => void
  theme: ThemeName
  variant?: 'home' | 'reader'
}

const controlClassName =
  'grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--scroll-paper)] text-[var(--ink)] shadow-[0_7px_18px_var(--shadow-color)] transition-[transform,border-color,color] duration-[var(--dur-fast)] ease-out hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

function HomeRopeNavigation({
  audioEnabled,
  brandHref,
  compact = false,
  onAudioEnabledChange,
  onCycleTheme,
  onThemeChange,
  theme,
}: RopeNavigationProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const panelId = useId()
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const firstThemeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!settingsOpen) return

    firstThemeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setSettingsOpen(false)
      settingsButtonRef.current?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen])

  const closeSettings = () => {
    setSettingsOpen(false)
    settingsButtonRef.current?.focus()
  }

  return (
    <nav
      aria-label="绳挂主导航"
      className="absolute inset-x-0 top-0 z-[var(--z-nav)] px-2 md:px-6"
      data-rope-navigation
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-7 w-full fill-none stroke-[var(--ink-muted)] drop-shadow-[0_3px_3px_var(--shadow-color)]"
        preserveAspectRatio="none"
        viewBox="0 0 1000 36"
      >
        <path d="M-20 4 C170 31 330 5 500 17 C670 29 830 5 1020 22" strokeWidth="5" />
        <path d="M-20 7 C170 34 330 8 500 20 C670 32 830 8 1020 25" strokeWidth="1" />
      </svg>

      <div
        className={`mx-auto grid max-w-5xl items-start ${
          compact
            ? 'grid-cols-[minmax(5.5rem,1fr)_repeat(3,3.25rem)] gap-1'
            : 'grid-cols-[minmax(7rem,1.2fr)_minmax(5rem,0.8fr)_repeat(3,3.5rem)] gap-2 max-[420px]:grid-cols-[4.5rem_4rem_repeat(3,2.75rem)] max-[420px]:gap-0 md:gap-5'
        }`}
      >
        <Hanger id="brand-scroll" ropeLength={compact ? '2.15rem' : '2.8rem'}>
          {brandHref ? (
            <Link
              aria-label="回到首页"
              className="relative block min-h-11 min-w-[5.5rem] border-x border-[var(--line)] bg-[var(--scroll-paper)] px-3 py-2 text-center text-[var(--ink)] shadow-[0_9px_24px_var(--shadow-color)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] max-[420px]:min-w-[4.5rem] max-[420px]:px-2"
              href={brandHref}
              prefetch={false}
            >
              <span
                aria-hidden="true"
                className="absolute -left-1.5 -right-1.5 -top-1 h-2 rounded-full border border-[var(--line)] bg-[var(--ink-muted)]"
              />
              <span className="[font-family:var(--font-serif)] text-base font-semibold tracking-[0.24em]">
                羽升
              </span>
            </Link>
          ) : (
            <div className="relative min-h-11 min-w-[5.5rem] border-x border-[var(--line)] bg-[var(--scroll-paper)] px-3 py-2 text-center text-[var(--ink)] shadow-[0_9px_24px_var(--shadow-color)] max-[420px]:min-w-[4.5rem] max-[420px]:px-2">
            <span
              aria-hidden="true"
              className="absolute -left-1.5 -right-1.5 -top-1 h-2 rounded-full border border-[var(--line)] bg-[var(--ink-muted)]"
            />
            <span className="[font-family:var(--font-serif)] text-base font-semibold tracking-[0.24em]">
              羽升
            </span>
            </div>
          )}
        </Hanger>

        {!compact && (
          <Hanger id="blog-bookmark" ropeLength="3.85rem">
            <Link
              className="flex min-h-11 min-w-20 items-center justify-center border border-[var(--line)] bg-[var(--accent)] px-4 py-2 [font-family:var(--font-serif)] text-sm font-semibold tracking-[0.18em] text-[var(--bg-elevated)] shadow-[0_9px_24px_var(--shadow-color)] transition-transform duration-[var(--dur-fast)] ease-out [clip-path:polygon(0_0,100%_0,100%_82%,50%_100%,0_82%)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] max-[420px]:min-w-16 max-[420px]:px-2"
              href="/blog/"
              prefetch={false}
            >
              博客
            </Link>
          </Hanger>
        )}

        <Hanger id="theme-charm" ropeLength={compact ? '3.1rem' : '2.35rem'}>
          <button
            aria-label={`切换主题，当前为${getThemeLabel(theme)}`}
            className={controlClassName}
            onClick={onCycleTheme}
            title={`当前主题：${getThemeLabel(theme)}`}
            type="button"
          >
            <ThemeIcon />
          </button>
        </Hanger>

        <Hanger id="audio-charm" ropeLength={compact ? '2.4rem' : '3.2rem'}>
          <button
            aria-label={audioEnabled ? '关闭音效偏好' : '开启音效偏好'}
            aria-pressed={audioEnabled}
            className={controlClassName}
            onClick={() => onAudioEnabledChange(!audioEnabled)}
            title={audioEnabled ? '音效偏好：开' : '音效偏好：关'}
            type="button"
          >
            <AudioIcon className={audioEnabled ? 'text-[var(--accent)]' : ''} />
          </button>
        </Hanger>

        <Hanger id="settings-charm" ropeLength={compact ? '3.35rem' : '2.65rem'}>
          <button
            aria-controls={panelId}
            aria-expanded={settingsOpen}
            aria-label={settingsOpen ? '关闭设置' : '打开设置'}
            className={controlClassName}
            onClick={() => setSettingsOpen((open) => !open)}
            ref={settingsButtonRef}
            type="button"
          >
            <SettingsIcon />
          </button>
        </Hanger>
      </div>

      {settingsOpen && (
        <SettingsPanel
          audioEnabled={audioEnabled}
          onAudioEnabledChange={onAudioEnabledChange}
          onClose={closeSettings}
          onThemeChange={onThemeChange}
          panelId={panelId}
          ref={firstThemeRef}
          theme={theme}
        />
      )}
    </nav>
  )
}

function ReaderExportPanel({ panelId }: { readonly panelId: string }) {
  const panelRef = useRef<HTMLElement>(null)
  const [position, setPosition] = useState({ left: 12, top: 96 })

  useLayoutEffect(() => {
    const place = () => {
      const panel = panelRef.current
      const anchor = document.querySelector<HTMLElement>(
        `[aria-controls="${CSS.escape(panelId)}"]`,
      )
      if (!panel || !anchor) return
      const anchorRect = anchor.getBoundingClientRect()
      const width = panel.offsetWidth
      const height = panel.offsetHeight
      const left = Math.max(
        12,
        Math.min(
          anchorRect.left + anchorRect.width / 2 - width / 2,
          window.innerWidth - width - 12,
        ),
      )
      const preferredTop = anchorRect.bottom + 10
      const top =
        preferredTop + height > window.innerHeight - 12
          ? Math.max(12, anchorRect.top - height - 10)
          : preferredTop
      setPosition({ left, top })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [panelId])

  return (
    <section
      aria-label="导出"
      className="pointer-events-auto fixed z-[var(--z-overlay)] w-[min(22rem,calc(100vw-1.5rem))] origin-top rounded border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-[var(--ink)] shadow-[0_24px_60px_var(--shadow-color)] animate-[reader-pop_var(--dur-pop)_var(--ease-pop)_both]"
      id={panelId}
      ref={panelRef}
      role="dialog"
      style={position}
    >
      <ExportMenu />
    </section>
  )
}

function ReaderRopeNavigation({
  audioEnabled,
  onAudioEnabledChange,
  onCycleTheme,
  onThemeChange,
  theme,
}: RopeNavigationProps) {
  const [visible, setVisible] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const exportButtonRef = useRef<HTMLButtonElement>(null)
  const firstThemeRef = useRef<HTMLButtonElement>(null)
  const settingsId = useId()
  const exportId = useId()
  const { notify } = useFallingToast()
  const menuOpen = settingsOpen || exportOpen

  useEffect(() => {
    const show = () => {
      if (document.body.classList.contains('reader-in-footer')) {
        setVisible(false)
        return
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setVisible(true)
    }
    const hide = (delay = 320) => {
      if (menuOpen) return
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setVisible(false), delay)
    }
    const move = (event: MouseEvent) => {
      const center = document.querySelector<HTMLElement>('[data-reader-center]')
      const bounds = center?.getBoundingClientRect()
      const inCenter = !bounds || (event.clientX >= bounds.left && event.clientX <= bounds.right)
      if (event.clientY <= 88 && inCenter) {
        show()
        return
      }
      if (event.target instanceof Element && event.target.closest('[data-rope-navigation]')) return
      hide()
    }
    const blur = () => hide(200)
    const scroll = () => {
      if (menuOpen) return
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setVisible(false)
    }
    document.addEventListener('mousemove', move)
    const center = document.querySelector<HTMLElement>('[data-reader-center]')
    center?.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('blur', blur)
    window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      document.removeEventListener('mousemove', move)
      center?.removeEventListener('scroll', scroll)
      window.removeEventListener('blur', blur)
      window.removeEventListener('scroll', scroll)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    if (settingsOpen) firstThemeRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (settingsOpen) {
        setSettingsOpen(false)
        settingsButtonRef.current?.focus()
      } else {
        setExportOpen(false)
        exportButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    const pointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (
        target.closest(`#${CSS.escape(settingsId)}, #${CSS.escape(exportId)}`) ||
        target.closest(`[aria-controls="${CSS.escape(settingsId)}"], [aria-controls="${CSS.escape(exportId)}"]`)
      ) {
        return
      }
      setSettingsOpen(false)
      setExportOpen(false)
    }
    document.addEventListener('pointerdown', pointerDown)
    return () => {
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('pointerdown', pointerDown)
    }
  }, [exportId, exportOpen, menuOpen, settingsId, settingsOpen])

  const controlEvents = visible ? 'pointer-events-auto' : 'pointer-events-none'
  const closeSettings = () => {
    setSettingsOpen(false)
    settingsButtonRef.current?.focus()
  }
  const share = async () => {
    const data = { title: document.title, url: window.location.href }
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share(data)
        notify('已打开系统分享')
      } else {
        await navigator.clipboard.writeText(data.url)
        notify('已复制文章链接')
      }
    } catch {
      notify('暂时无法分享，请稍后再试')
    }
  }

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-nav)] h-[88px]" data-reader-nav-sensor />
      <nav
        aria-label="绳挂主导航"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[var(--z-nav)] overflow-visible pb-3.5 transition-[opacity,transform] duration-[var(--dur-base)] ease-out ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-3.5 opacity-0'
        }`}
        data-nav-visible={visible}
        data-rope-navigation
        onFocusCapture={() => setVisible(true)}
      >
        <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[30px] w-full fill-none stroke-[var(--ink-muted)] drop-shadow-[0_3px_3px_var(--shadow-color)]" preserveAspectRatio="none" viewBox="0 0 1000 36">
          <path d="M-20 4 C170 31 330 5 500 17 C670 29 830 5 1020 22" strokeWidth="5" />
          <path d="M-20 7 C170 34 330 8 500 20 C670 32 830 8 1020 25" strokeWidth="1" />
        </svg>
        <div className="pointer-events-none flex items-start gap-3 pl-[calc(var(--w-left)+23px)] pr-[calc(var(--w-right)+47px)] max-[1024px]:px-4">
          <Hanger id="reader-brand" ropeLength="30px">
            <Link className={`${controlEvents} relative min-h-[42px] border-x border-[var(--line)] bg-[var(--scroll-paper)] px-3.5 py-2 text-[15px] font-semibold tracking-[0.22em] text-[var(--ink)] shadow-[0_9px_24px_var(--shadow-color)]`} data-tip="回到首页" href="/" prefetch={false}>羽升</Link>
          </Hanger>
          <Hanger className="max-[520px]:hidden" id="reader-blog" ropeLength="42px">
            <Link className={`${controlEvents} flex min-h-11 items-center justify-center bg-[var(--accent)] px-4 pb-3 pt-2 text-[13px] font-semibold tracking-[0.16em] text-[var(--bg-elevated)] [clip-path:polygon(0_0,100%_0,100%_78%,50%_100%,0_78%)]`} data-tip="文章列表" href="/blog/" prefetch={false}>博客</Link>
          </Hanger>
          <span className="pointer-events-none flex-1" />
          <Hanger id="reader-export" ropeLength="36px">
            <button aria-controls={exportId} aria-expanded={exportOpen} className={`${controlEvents} min-h-11 bg-[var(--scroll-paper)] px-4 pb-3 pt-2 text-[13px] font-semibold tracking-[0.16em] text-[var(--ink)] shadow-[0_9px_24px_var(--shadow-color)] [clip-path:polygon(0_0,100%_0,100%_78%,50%_100%,0_78%)]`} data-tip="导出本文" onClick={() => { setVisible(true); setExportOpen((open) => !open); setSettingsOpen(false) }} ref={exportButtonRef} type="button">导出</button>
          </Hanger>
          <Hanger className="max-[520px]:hidden" id="reader-share" ropeLength="38px">
            <button aria-label="分享本文" className={`${controlClassName} ${controlEvents}`} data-tip="复制分享链接" onClick={() => void share()} type="button"><ShareIcon /></button>
          </Hanger>
          <Hanger id="reader-github" ropeLength="32px">
            <a aria-label="GitHub 仓库" className={`${controlClassName} ${controlEvents}`} data-tip="打开 GitHub 仓库" href="https://github.com/AIMFllyYS/Blog-YuSheng" rel="noreferrer" target="_blank"><GithubIcon /></a>
          </Hanger>
          <Hanger id="reader-theme" ropeLength="26px">
            <button aria-label={`切换主题，当前为${getThemeLabel(theme)}`} className={`${controlClassName} ${controlEvents}`} data-tip="切换阅读主题" onClick={onCycleTheme} type="button"><ThemeIcon /></button>
          </Hanger>
          <Hanger className="max-[520px]:hidden" id="reader-audio" ropeLength="40px">
            <button aria-label={audioEnabled ? '关闭音效偏好' : '开启音效偏好'} aria-pressed={audioEnabled} className={`${controlClassName} ${controlEvents}`} data-tip="界面音效开关" onClick={() => onAudioEnabledChange(!audioEnabled)} type="button"><AudioIcon className={audioEnabled ? 'text-[var(--accent)]' : ''} /></button>
          </Hanger>
          <Hanger id="reader-settings" ropeLength="28px">
            <button aria-controls={settingsId} aria-expanded={settingsOpen} aria-label="设置" className={`${controlClassName} ${controlEvents}`} data-tip="主题与音效" onClick={() => { setVisible(true); setSettingsOpen((open) => !open); setExportOpen(false) }} ref={settingsButtonRef} type="button"><SettingsIcon /></button>
          </Hanger>
        </div>
        {exportOpen && (
          <ReaderExportPanel panelId={exportId} />
        )}
        {settingsOpen && (
          <SettingsPanel audioEnabled={audioEnabled} onAudioEnabledChange={onAudioEnabledChange} onClose={closeSettings} onThemeChange={onThemeChange} panelId={settingsId} ref={firstThemeRef} theme={theme} />
        )}
      </nav>
    </>
  )
}

export function RopeNavigation(props: RopeNavigationProps) {
  return props.variant === 'reader' ? (
    <ReaderRopeNavigation {...props} />
  ) : (
    <HomeRopeNavigation {...props} />
  )
}
