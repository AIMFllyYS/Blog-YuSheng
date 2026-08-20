import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { useLocalAuthorMode } from '@/features/discussions/domain/use-local-author-mode'
import { THEMES, type ThemeName } from '@/lib/theme'
import { CloseIcon } from './navigation-icons'

type SettingsPanelProps = {
  audioEnabled: boolean
  onAudioEnabledChange: (enabled: boolean) => void
  onClose: () => void
  onThemeChange: (theme: ThemeName) => void
  panelId: string
  theme: ThemeName
}

export const SettingsPanel = forwardRef<HTMLButtonElement, SettingsPanelProps>(
  function SettingsPanel(
    {
      audioEnabled,
      onAudioEnabledChange,
      onClose,
      onThemeChange,
      panelId,
      theme,
    },
    firstThemeRef,
  ) {
    const panelRef = useRef<HTMLElement>(null)
    const [position, setPosition] = useState({ left: 12, top: 96 })
    const { enabled: localAuthorMode, setEnabled: setLocalAuthorMode } =
      useLocalAuthorMode()

    useLayoutEffect(() => {
      const place = () => {
        const panel = panelRef.current
        if (!panel) return
        const anchorElement = document.querySelector<HTMLElement>(
          `[aria-controls="${CSS.escape(panelId)}"]`,
        )
        if (!anchorElement) return
        const anchorRect = anchorElement.getBoundingClientRect()
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
        aria-label="显示与声音设置"
        className="pointer-events-auto fixed z-[var(--z-overlay)] max-h-[calc(100vh-24px)] w-[min(20rem,calc(100vw-1.5rem))] origin-top overflow-auto rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-[var(--ink)] shadow-[0_24px_72px_var(--shadow-color)] animate-[reader-pop_var(--dur-pop)_var(--ease-pop)_both]"
        id={panelId}
        ref={panelRef}
        role="dialog"
        style={position}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-3">
          <div>
            <p className="[font-family:var(--font-serif)] text-base font-semibold tracking-[0.12em]">
              小憩设置
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              纸色与音效会记在这台浏览器里。本地作者模式同样写入本机。
            </p>
          </div>
          <button
            aria-label="关闭设置"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-muted)] transition-colors duration-[var(--dur-fast)] ease-out hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold tracking-[0.18em] text-[var(--ink-muted)]">
            纸色主题
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {THEMES.map((option, index) => (
              <button
                aria-pressed={theme === option.id}
                className="min-h-11 rounded-sm border border-[var(--line)] bg-[var(--scroll-paper)] px-3 py-2 text-left transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-out hover:-translate-y-px hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:shadow-[inset_3px_0_0_var(--accent)]"
                key={option.id}
                onClick={() => onThemeChange(option.id)}
                ref={index === 0 ? firstThemeRef : undefined}
                type="button"
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-[0.65rem] leading-4 text-[var(--ink-muted)]">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex min-h-12 items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
          <div>
            <p className="text-sm font-semibold">音效偏好</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              分镜音效尚待素材轮次
            </p>
          </div>
          <button
            aria-label={audioEnabled ? '关闭音效偏好' : '开启音效偏好'}
            aria-pressed={audioEnabled}
            className="relative h-11 w-16 shrink-0 rounded-full border border-[var(--line)] bg-[var(--bg)] transition-colors duration-[var(--dur-fast)] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--highlight)]"
            onClick={() => onAudioEnabledChange(!audioEnabled)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`absolute left-1 top-1/2 size-8 -translate-y-1/2 rounded-full border border-[var(--line)] bg-[var(--scroll-paper)] shadow-[0_2px_8px_var(--shadow-color)] transition-transform duration-[var(--dur-fast)] ease-out ${
                audioEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 flex min-h-12 items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
          <div>
            <p className="text-sm font-semibold">本地作者模式</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              划词注释只存在本机，清站点数据会丢。导出的 .md 才是持久产物。
            </p>
          </div>
          <button
            aria-label={localAuthorMode ? '关闭本地作者模式' : '开启本地作者模式'}
            aria-pressed={localAuthorMode}
            className="relative h-11 w-16 shrink-0 rounded-full border border-[var(--line)] bg-[var(--bg)] transition-colors duration-[var(--dur-fast)] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--highlight)]"
            onClick={() => setLocalAuthorMode(!localAuthorMode)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`absolute left-1 top-1/2 size-8 -translate-y-1/2 rounded-full border border-[var(--line)] bg-[var(--scroll-paper)] shadow-[0_2px_8px_var(--shadow-color)] transition-transform duration-[var(--dur-fast)] ease-out ${
                localAuthorMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>
    )
  },
)
