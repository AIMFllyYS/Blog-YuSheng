'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { useFallingToast } from '@/components/ui/falling-toast'
import { useAudioPreference } from '@/lib/audio'
import { getThemeLabel, useThemePreference } from '@/lib/theme'
import {
  isActiveHref,
  resolveRopeProfile,
  type RopeProfile,
} from '../rope-profile'
import {
  slotDesktopClassName,
  slotRopeLength,
  visibleSlots,
  type RopeSlot,
} from '../rope-slots'
import { useRopeReveal } from '../use-rope-reveal'
import { ExportPopover } from './export-popover'
import { Hanger } from './hanger'
import {
  AudioIcon,
  GithubIcon,
  SettingsIcon,
  ShareIcon,
  ThemeIcon,
} from './navigation-icons'
import { SettingsPanel } from './settings-panel'

export type RopeNavigationProps = {
  compact?: boolean
}

const charmClassName =
  'grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--scroll-paper)] text-[var(--ink)] shadow-[0_7px_18px_var(--shadow-color)] transition-[transform,border-color,color] duration-[var(--dur-fast)] ease-out hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

function pointerClassName(profile: RopeProfile, visible: boolean) {
  if (profile === 'hub') return ''
  return visible ? 'pointer-events-auto' : 'pointer-events-none'
}

function ScrollFace({
  currentHome,
  hit,
  slot,
}: {
  currentHome: boolean
  hit: string
  slot: RopeSlot
}) {
  const face = (
    <>
      <span
        aria-hidden="true"
        className="absolute -left-1.5 -right-1.5 -top-1 h-2 rounded-full border border-[var(--line)] bg-[var(--ink-muted)]"
      />
      <span className="[font-family:var(--font-serif)] text-[15px] font-semibold tracking-[0.22em]">
        {slot.label}
      </span>
    </>
  )

  const className = `${hit} relative block min-h-[42px] min-w-[5.5rem] border-x border-[var(--line)] bg-[var(--scroll-paper)] px-3.5 py-2 text-center text-[var(--ink)] shadow-[0_9px_24px_var(--shadow-color)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] max-[420px]:min-w-[4.5rem] max-[420px]:px-2`

  if (!slot.href || currentHome) {
    return (
      <div className={className} data-tip={slot.tip}>
        {face}
      </div>
    )
  }

  return (
    <Link
      aria-label={slot.tip}
      className={className}
      data-tip={slot.tip}
      href={slot.href}
      prefetch={false}
    >
      {face}
    </Link>
  )
}

function BookmarkFace({
  current,
  exportId,
  exportOpen,
  exportRef,
  hit,
  onToggleExport,
  slot,
}: {
  current: boolean
  exportId: string
  exportOpen: boolean
  exportRef: Ref<HTMLButtonElement>
  hit: string
  onToggleExport: () => void
  slot: RopeSlot
}) {
  const className = `${hit} flex min-h-11 min-w-20 items-center justify-center px-4 pb-3 pt-2 [font-family:var(--font-serif)] text-[13px] font-semibold tracking-[0.16em] shadow-[0_9px_24px_var(--shadow-color)] transition-transform duration-[var(--dur-fast)] ease-out [clip-path:polygon(0_0,100%_0,100%_78%,50%_100%,0_78%)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] max-[420px]:min-w-16 max-[420px]:px-2 ${
    current
      ? 'bg-[var(--accent)] text-[var(--bg-elevated)]'
      : 'border border-[var(--line)] bg-[var(--scroll-paper)] text-[var(--ink)] hover:text-[var(--accent)]'
  }`

  if (slot.action === 'export') {
    return (
      <button
        aria-controls={exportId}
        aria-expanded={exportOpen}
        className={className}
        data-tip={slot.tip}
        onClick={onToggleExport}
        ref={exportRef}
        type="button"
      >
        {slot.label}
      </button>
    )
  }

  if (!slot.href) return null

  return (
    <Link
      aria-current={current ? 'page' : undefined}
      className={className}
      data-tip={slot.tip}
      href={slot.href}
      prefetch={false}
    >
      {slot.label}
    </Link>
  )
}

function CharmFace({
  audioEnabled,
  hit,
  onAudioToggle,
  onCycleTheme,
  onShare,
  onToggleSettings,
  profile,
  settingsId,
  settingsOpen,
  settingsRef,
  slot,
  themeLabel,
}: {
  audioEnabled: boolean
  hit: string
  onAudioToggle: () => void
  onCycleTheme: () => void
  onShare: () => void
  onToggleSettings: () => void
  profile: RopeProfile
  settingsId: string
  settingsOpen: boolean
  settingsRef: Ref<HTMLButtonElement>
  slot: RopeSlot
  themeLabel: string
}) {
  const className = `${charmClassName} ${hit}`

  if (slot.action === 'theme') {
    return (
      <button
        aria-label={`切换主题，当前为${themeLabel}`}
        className={className}
        data-tip={slot.tip}
        onClick={onCycleTheme}
        suppressHydrationWarning
        type="button"
      >
        <ThemeIcon />
      </button>
    )
  }

  if (slot.action === 'audio') {
    return (
      <button
        aria-label={audioEnabled ? '关闭音效偏好' : '开启音效偏好'}
        aria-pressed={audioEnabled}
        className={className}
        data-tip={slot.tip}
        onClick={onAudioToggle}
        type="button"
      >
        <AudioIcon className={audioEnabled ? 'text-[var(--accent)]' : ''} />
      </button>
    )
  }

  if (slot.action === 'settings') {
    return (
      <button
        aria-controls={settingsId}
        aria-expanded={settingsOpen}
        aria-label={
          profile === 'article'
            ? '设置'
            : settingsOpen
              ? '关闭设置'
              : '打开设置'
        }
        className={className}
        data-tip={slot.tip}
        onClick={onToggleSettings}
        ref={settingsRef}
        type="button"
      >
        <SettingsIcon />
      </button>
    )
  }

  if (slot.action === 'share') {
    return (
      <button
        aria-label="分享本文"
        className={className}
        data-tip={slot.tip}
        onClick={onShare}
        type="button"
      >
        <ShareIcon />
      </button>
    )
  }

  if (slot.href && slot.external) {
    return (
      <a
        aria-label="GitHub 仓库"
        className={className}
        data-tip={slot.tip}
        href={slot.href}
        rel="noreferrer"
        target="_blank"
      >
        <GithubIcon />
      </a>
    )
  }

  return null
}

function SlotFace({
  audioEnabled,
  current,
  currentHome,
  exportId,
  exportOpen,
  exportRef,
  hit,
  onAudioToggle,
  onCycleTheme,
  onShare,
  onToggleExport,
  onToggleSettings,
  profile,
  settingsId,
  settingsOpen,
  settingsRef,
  slot,
  themeLabel,
}: {
  audioEnabled: boolean
  current: boolean
  currentHome: boolean
  exportId: string
  exportOpen: boolean
  exportRef: Ref<HTMLButtonElement>
  hit: string
  onAudioToggle: () => void
  onCycleTheme: () => void
  onShare: () => void
  onToggleExport: () => void
  onToggleSettings: () => void
  profile: RopeProfile
  settingsId: string
  settingsOpen: boolean
  settingsRef: Ref<HTMLButtonElement>
  slot: RopeSlot
  themeLabel: string
}) {
  if (slot.kind === 'scroll') {
    return <ScrollFace currentHome={currentHome} hit={hit} slot={slot} />
  }

  if (slot.kind === 'bookmark') {
    return (
      <BookmarkFace
        current={current}
        exportId={exportId}
        exportOpen={exportOpen}
        exportRef={exportRef}
        hit={hit}
        onToggleExport={onToggleExport}
        slot={slot}
      />
    )
  }

  return (
    <CharmFace
      audioEnabled={audioEnabled}
      hit={hit}
      onAudioToggle={onAudioToggle}
      onCycleTheme={onCycleTheme}
      onShare={onShare}
      onToggleSettings={onToggleSettings}
      profile={profile}
      settingsId={settingsId}
      settingsOpen={settingsOpen}
      settingsRef={settingsRef}
      slot={slot}
      themeLabel={themeLabel}
    />
  )
}

function SlotRow({
  compact,
  pathname,
  profile,
  slots,
  visible,
  ...faceProps
}: {
  audioEnabled: boolean
  compact: boolean
  exportId: string
  exportOpen: boolean
  exportRef: Ref<HTMLButtonElement>
  onAudioToggle: () => void
  onCycleTheme: () => void
  onShare: () => void
  onToggleExport: () => void
  onToggleSettings: () => void
  pathname: string
  profile: RopeProfile
  settingsId: string
  settingsOpen: boolean
  settingsRef: Ref<HTMLButtonElement>
  slots: readonly RopeSlot[]
  themeLabel: string
  visible: boolean
}) {
  const hit = pointerClassName(profile, visible)
  const currentHome = isActiveHref('/', pathname)

  return (
    <>
      {slots.map((slot) => (
        <Hanger
          className={slotDesktopClassName(slot, profile)}
          id={slot.id}
          key={slot.id}
          ropeLength={slotRopeLength(slot, profile, compact)}
        >
          <SlotFace
            {...faceProps}
            current={Boolean(
              slot.href && !slot.external && isActiveHref(slot.href, pathname),
            )}
            currentHome={currentHome}
            hit={hit}
            profile={profile}
            slot={slot}
          />
        </Hanger>
      ))}
    </>
  )
}

export function RopeNavigation({ compact = false }: RopeNavigationProps) {
  const pathname = usePathname() ?? '/'
  const profile = resolveRopeProfile(pathname)
  const { theme, setTheme, cycleTheme } = useThemePreference()
  const { audioEnabled, setAudioEnabled } = useAudioPreference()
  const { notify } = useFallingToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const menuOpen = settingsOpen || exportOpen
  const { setVisible, visible } = useRopeReveal(profile === 'article', menuOpen)
  const settingsId = useId()
  const exportId = useId()
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const exportButtonRef = useRef<HTMLButtonElement>(null)
  const firstThemeRef = useRef<HTMLButtonElement>(null)
  const slots = visibleSlots(profile, compact)
  const leftSlots = slots.filter((slot) => slot.cluster === 'left')
  const rightSlots = slots.filter((slot) => slot.cluster === 'right')

  useEffect(() => {
    if (!menuOpen) return
    if (settingsOpen) firstThemeRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (settingsOpen) {
        setSettingsOpen(false)
        settingsButtonRef.current?.focus()
        return
      }
      setExportOpen(false)
      exportButtonRef.current?.focus()
    }
    const pointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (
        target.closest(
          `#${CSS.escape(settingsId)}, #${CSS.escape(exportId)}`,
        ) ||
        target.closest(
          `[aria-controls="${CSS.escape(settingsId)}"], [aria-controls="${CSS.escape(exportId)}"]`,
        )
      ) {
        return
      }
      setSettingsOpen(false)
      setExportOpen(false)
    }
    document.addEventListener('keydown', keydown)
    document.addEventListener('pointerdown', pointerDown)
    return () => {
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('pointerdown', pointerDown)
    }
  }, [exportId, menuOpen, settingsId, settingsOpen])

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

  const faceProps = {
    audioEnabled,
    exportId,
    exportOpen,
    exportRef: exportButtonRef,
    onAudioToggle: () => setAudioEnabled(!audioEnabled),
    onCycleTheme: cycleTheme,
    onShare: () => {
      void share()
    },
    onToggleExport: () => {
      setVisible(true)
      setExportOpen((open) => !open)
      setSettingsOpen(false)
    },
    onToggleSettings: () => {
      setVisible(true)
      setSettingsOpen((open) => !open)
      setExportOpen(false)
    },
    settingsId,
    settingsOpen,
    settingsRef: settingsButtonRef,
    themeLabel: getThemeLabel(theme),
  }

  const rowProps = {
    ...faceProps,
    compact,
    pathname,
    profile,
    visible: profile === 'hub' ? true : visible,
  }

  const navInner: ReactNode =
    profile === 'article' ? (
      <div className="pointer-events-none flex items-start gap-3 pl-[calc(var(--w-left)+23px)] pr-[calc(var(--w-right)+47px)] max-[1024px]:px-4">
        <SlotRow {...rowProps} slots={leftSlots} />
        <span className="pointer-events-none flex-1" />
        <SlotRow {...rowProps} slots={rightSlots} />
      </div>
    ) : (
      <div
        className={`mx-auto flex max-w-5xl items-start overflow-visible ${
          compact ? 'gap-1' : 'gap-2 max-[420px]:gap-0 md:gap-5'
        }`}
      >
        <SlotRow {...rowProps} slots={leftSlots} />
        <span className="pointer-events-none min-w-2 flex-1" />
        <SlotRow {...rowProps} slots={rightSlots} />
      </div>
    )

  return (
    <>
      {profile === 'article' ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-nav)] h-[88px]"
          data-reader-nav-sensor
        />
      ) : null}
      <nav
        aria-label="绳挂主导航"
        className={
          profile === 'article'
            ? `pointer-events-none fixed inset-x-0 top-0 z-[var(--z-nav)] overflow-visible pb-3.5 transition-[opacity,transform] duration-[var(--dur-base)] ease-out ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-3.5 opacity-0'
              }`
            : 'absolute inset-x-0 top-0 z-[var(--z-nav)] overflow-visible px-2 md:px-6'
        }
        data-nav-visible={profile === 'article' ? String(visible) : undefined}
        data-rope-navigation
        data-rope-profile={profile}
        onFocusCapture={
          profile === 'article' ? () => setVisible(true) : undefined
        }
      >
        <svg
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 w-full fill-none stroke-[var(--ink-muted)] drop-shadow-[0_3px_3px_var(--shadow-color)] ${
            profile === 'article' ? 'h-[30px]' : 'h-7'
          }`}
          preserveAspectRatio="none"
          viewBox="0 0 1000 36"
        >
          <path
            d="M-20 4 C170 31 330 5 500 17 C670 29 830 5 1020 22"
            strokeWidth="5"
          />
          <path
            d="M-20 7 C170 34 330 8 500 20 C670 32 830 8 1020 25"
            strokeWidth="1"
          />
        </svg>
        {navInner}
        {exportOpen && profile === 'article' ? (
          <ExportPopover panelId={exportId} />
        ) : null}
        {settingsOpen ? (
          <SettingsPanel
            audioEnabled={audioEnabled}
            onAudioEnabledChange={setAudioEnabled}
            onClose={closeSettings}
            onThemeChange={setTheme}
            panelId={settingsId}
            ref={firstThemeRef}
            theme={theme}
          />
        ) : null}
      </nav>
    </>
  )
}
