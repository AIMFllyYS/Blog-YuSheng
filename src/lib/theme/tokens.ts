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
  | '--scroll-paper'
  | '--shadow-color'

type ThemeColorSet = Record<SemanticColorToken, string>

const THEME_COLORS: Record<ThemeName, ThemeColorSet> = {
  paper: {
    '--bg': '#e9dfc7',
    '--bg-elevated': '#f7efd9',
    '--ink': '#211c16',
    '--ink-muted': '#5d5142',
    '--ink-faint': '#7a6c59',
    '--accent': '#794018',
    '--line': '#a58d68',
    '--highlight': '#d9bb70',
    '--scroll-paper': '#efe1bd',
    '--shadow-color': 'rgba(31, 21, 10, 0.28)',
  },
  mist: {
    '--bg': '#dce9e8',
    '--bg-elevated': '#edf5f1',
    '--ink': '#172526',
    '--ink-muted': '#405c5d',
    '--ink-faint': '#5b7373',
    '--accent': '#2d5f64',
    '--line': '#8ba9a7',
    '--highlight': '#b5d4c9',
    '--scroll-paper': '#e4eee3',
    '--shadow-color': 'rgba(18, 43, 45, 0.24)',
  },
  snow: {
    '--bg': '#f2eee4',
    '--bg-elevated': '#fffdf7',
    '--ink': '#211f1b',
    '--ink-muted': '#57534b',
    '--ink-faint': '#777168',
    '--accent': '#65513a',
    '--line': '#b8ada0',
    '--highlight': '#ded2b8',
    '--scroll-paper': '#f8f1df',
    '--shadow-color': 'rgba(30, 27, 22, 0.22)',
  },
  night: {
    '--bg': '#08090a',
    '--bg-elevated': '#151617',
    '--ink': '#f2eee4',
    '--ink-muted': '#bdb6a9',
    '--ink-faint': '#8e8a82',
    '--accent': '#d0ae67',
    '--line': '#4e4a43',
    '--highlight': '#4c4028',
    '--scroll-paper': '#20201d',
    '--shadow-color': 'rgba(0, 0, 0, 0.72)',
  },
}

const SHARED_VARIABLES = {
  '--dur-fast': '150ms',
  '--dur-base': '250ms',
  '--dur-slow': '400ms',
  '--font-serif': '"Source Han Serif SC", "Noto Serif SC", serif',
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
