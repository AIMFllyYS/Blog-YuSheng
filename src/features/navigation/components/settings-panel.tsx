import { forwardRef } from 'react'
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
    return (
      <section
        aria-label="显示与声音设置"
        className="absolute right-2 top-[8.75rem] z-[var(--z-overlay)] w-[min(20rem,calc(100vw-1rem))] rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-[var(--ink)] shadow-[0_24px_72px_var(--shadow-color)] md:right-6 md:top-[10.25rem]"
        id={panelId}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-3">
          <div>
            <p className="[font-family:var(--font-serif)] text-base font-semibold tracking-[0.12em]">
              小憩设置
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              本次访问有效，不写入本地记录。
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
      </section>
    )
  },
)
