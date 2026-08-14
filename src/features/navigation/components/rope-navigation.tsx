'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { getThemeLabel, type ThemeName } from '@/lib/theme'
import { Hanger } from './hanger'
import { AudioIcon, SettingsIcon, ThemeIcon } from './navigation-icons'
import { SettingsPanel } from './settings-panel'

export type RopeNavigationProps = {
  audioEnabled: boolean
  compact?: boolean
  onAudioEnabledChange: (enabled: boolean) => void
  onCycleTheme: () => void
  onThemeChange: (theme: ThemeName) => void
  theme: ThemeName
}

const controlClassName =
  'grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--scroll-paper)] text-[var(--ink)] shadow-[0_7px_18px_var(--shadow-color)] transition-[transform,border-color,color] duration-[var(--dur-fast)] ease-out hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

export function RopeNavigation({
  audioEnabled,
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
            : 'grid-cols-[minmax(7rem,1.2fr)_minmax(5rem,0.8fr)_repeat(3,3.5rem)] gap-2 md:gap-5'
        }`}
      >
        <Hanger id="brand-scroll" ropeLength={compact ? '2.15rem' : '2.8rem'}>
          <div className="relative min-h-11 min-w-[5.5rem] border-x border-[var(--line)] bg-[var(--scroll-paper)] px-3 py-2 text-center text-[var(--ink)] shadow-[0_9px_24px_var(--shadow-color)]">
            <span
              aria-hidden="true"
              className="absolute -left-1.5 -right-1.5 -top-1 h-2 rounded-full border border-[var(--line)] bg-[var(--ink-muted)]"
            />
            <span className="[font-family:var(--font-serif)] text-base font-semibold tracking-[0.24em]">
              羽升
            </span>
          </div>
        </Hanger>

        {!compact && (
          <Hanger id="blog-bookmark" ropeLength="3.85rem">
            <Link
              className="flex min-h-11 min-w-20 items-center justify-center border border-[var(--line)] bg-[var(--accent)] px-4 py-2 [font-family:var(--font-serif)] text-sm font-semibold tracking-[0.18em] text-[var(--bg-elevated)] shadow-[0_9px_24px_var(--shadow-color)] transition-transform duration-[var(--dur-fast)] ease-out [clip-path:polygon(0_0,100%_0,100%_82%,50%_100%,0_82%)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
