import type { CSSProperties } from 'react'

export const THEMES = [
  { id: 'paper', label: '宣纸黄', description: '温润的书卷底色' },
  { id: 'mist', label: '浅蓝', description: '清晨雾青' },
  { id: 'snow', label: '米白', description: '明净留白' },
  { id: 'night', label: '纯黑', description: '沉静夜读' },
] as const

export type ThemeName = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeName = 'paper'

type SemanticColorToken =
  | '--bg'
  | '--bg-elevated'
  | '--ink'
  | '--ink-muted'
  | '--ink-faint'
  | '--accent'
  | '--line'
  | '--highlight'
  | '--annotation'
  | '--comment'
  | '--author-badge'
  | '--scroll-paper'
  | '--shadow-color'
  | '--scrollbar'
  | '--scrollbar-hover'

type ThemeColorSet = Record<SemanticColorToken, string>

const THEME_COLORS: Record<ThemeName, ThemeColorSet> = {
  paper: {
    '--bg': '#f2e9d6',
    '--bg-elevated': '#fbf5e7',
    '--ink': '#2b2620',
    '--ink-muted': '#6b6055',
    '--ink-faint': '#9c9184',
    '--accent': '#a9762f',
    '--line': '#ddd0b4',
    '--highlight': '#f0d98a80',
    '--annotation': '#a9762f',
    '--comment': '#7a6a4f',
    '--author-badge': '#8c5a2b',
    '--scroll-paper': '#f8f1df',
    '--shadow-color': 'rgba(90, 70, 40, 0.16)',
    '--scrollbar': 'rgba(90, 70, 40, 0.22)',
    '--scrollbar-hover': 'rgba(90, 70, 40, 0.4)',
  },
  mist: {
    '--bg': '#e6edf1',
    '--bg-elevated': '#f3f8fa',
    '--ink': '#22303a',
    '--ink-muted': '#5a6b76',
    '--ink-faint': '#8ea0aa',
    '--accent': '#2f7d95',
    '--line': '#cddbe3',
    '--highlight': '#bfe3ef88',
    '--annotation': '#2f7d95',
    '--comment': '#5a6b76',
    '--author-badge': '#1f5f74',
    '--scroll-paper': '#eff6f8',
    '--shadow-color': 'rgba(30, 60, 75, 0.14)',
    '--scrollbar': 'rgba(30, 60, 75, 0.2)',
    '--scrollbar-hover': 'rgba(30, 60, 75, 0.36)',
  },
  snow: {
    '--bg': '#f6f6f4',
    '--bg-elevated': '#ffffff',
    '--ink': '#1f2023',
    '--ink-muted': '#5f6367',
    '--ink-faint': '#9aa0a6',
    '--accent': '#3a6ea5',
    '--line': '#e4e4e1',
    '--highlight': '#ffe9a8aa',
    '--annotation': '#3a6ea5',
    '--comment': '#5f6367',
    '--author-badge': '#2f5c8a',
    '--scroll-paper': '#ffffff',
    '--shadow-color': 'rgba(20, 25, 35, 0.1)',
    '--scrollbar': 'rgba(20, 25, 35, 0.16)',
    '--scrollbar-hover': 'rgba(20, 25, 35, 0.32)',
  },
  night: {
    '--bg': '#101012',
    '--bg-elevated': '#18191c',
    '--ink': '#e8e4dc',
    '--ink-muted': '#a09a90',
    '--ink-faint': '#6d6862',
    '--accent': '#d9a94a',
    '--line': '#2b2c31',
    '--highlight': '#d9a94a33',
    '--annotation': '#d9a94a',
    '--comment': '#a09a90',
    '--author-badge': '#d9a94a',
    '--scroll-paper': '#1c1d21',
    '--shadow-color': 'rgba(0, 0, 0, 0.55)',
    '--scrollbar': 'rgba(232, 228, 220, 0.16)',
    '--scrollbar-hover': 'rgba(232, 228, 220, 0.32)',
  },
}

const SHARED_VARIABLES = {
  '--dur-fast': '150ms',
  '--dur-base': '250ms',
  '--dur-slow': '400ms',
  '--dur-reveal': '780ms',
  '--dur-pop': '480ms',
  '--ease-damp': 'cubic-bezier(.22,.82,.28,1)',
  '--ease-pop': 'cubic-bezier(.34,1.22,.42,1)',
  '--font-serif': '"Noto Serif CJK", "Source Han Serif SC", "Noto Serif SC", serif',
  '--font-mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
  '--w-left': '248px',
  '--w-right': '352px',
  '--read-measure': '44rem',
  '--z-base': '0',
  '--z-panel': '10',
  '--z-floating': '20',
  '--z-nav': '30',
  '--z-overlay': '40',
  '--z-drawer': '41',
  '--z-toast': '50',
  '--z-boot': '60',
} as const

export const JOURNEY_VARIABLES = {
  '--journey-void': '#050813',
  '--journey-void-raised': '#0b1222',
  '--journey-gold': '#d6b664',
  '--journey-gold-soft': '#f0d589',
  '--journey-paper': '#f3e6c5',
  '--journey-paper-edge': '#b9ae92',
  '--journey-ink': '#271b10',
  '--journey-bg': 'var(--journey-void)',
  '--journey-bg-elevated': 'var(--journey-void-raised)',
  '--journey-ink-muted': '#b9ae92',
  '--journey-line': '#6b5936',
  '--journey-accent': 'var(--journey-gold)',
  '--journey-nebula': '#17284a',
  '--journey-star': 'var(--journey-gold-soft)',
  '--journey-shadow': 'rgba(0, 0, 0, 0.62)',
} as const

export type CssVariableStyle = CSSProperties & Record<`--${string}`, string>

export function getThemeStyle(theme: ThemeName): CssVariableStyle {
  return { ...SHARED_VARIABLES, ...THEME_COLORS[theme] }
}

export function getJourneyStyle(): CssVariableStyle {
  return { ...JOURNEY_VARIABLES }
}

export function getThemeLabel(theme: ThemeName): string {
  return THEMES.find((item) => item.id === theme)?.label ?? theme
}
