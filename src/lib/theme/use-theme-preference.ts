'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEMES,
  isThemeName,
  type ThemeName,
} from './tokens'

type PreferenceListener = () => void

let currentTheme: ThemeName = DEFAULT_THEME
let didHydrate = false
const listeners = new Set<PreferenceListener>()

function readStoredTheme(): ThemeName {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && isThemeName(stored)) return stored
  } catch {
    // Private mode / quota must not break theming.
  }
  return DEFAULT_THEME
}

function persistTheme(theme: ThemeName): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode / quota must not break theming.
  }
}

function applyThemeName(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

function hydrateTheme(): ThemeName {
  if (didHydrate) return currentTheme
  didHydrate = true
  const fromDom = document.documentElement.dataset.theme
  if (fromDom && isThemeName(fromDom)) {
    currentTheme = fromDom
    return currentTheme
  }
  currentTheme = readStoredTheme()
  applyThemeName(currentTheme)
  return currentTheme
}

export function setTheme(theme: ThemeName): void {
  currentTheme = theme
  didHydrate = true
  applyThemeName(theme)
  persistTheme(theme)
  emit()
}

function subscribe(listener: PreferenceListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY) return
    const next =
      event.newValue && isThemeName(event.newValue)
        ? event.newValue
        : DEFAULT_THEME
    if (next === currentTheme) return
    currentTheme = next
    didHydrate = true
    applyThemeName(next)
    emit()
  })
}

function getSnapshot(): ThemeName {
  return hydrateTheme()
}

function getServerSnapshot(): ThemeName {
  return DEFAULT_THEME
}

export type ThemePreferenceController = {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  cycleTheme: () => void
}

export function useThemePreference(): ThemePreferenceController {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const cycleTheme = useCallback(() => {
    const currentIndex = THEMES.findIndex((item) => item.id === theme)
    setTheme(THEMES[(currentIndex + 1) % THEMES.length].id)
  }, [theme])

  return { theme, setTheme, cycleTheme }
}
