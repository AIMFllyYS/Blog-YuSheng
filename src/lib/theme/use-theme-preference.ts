'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_THEME,
  getThemeStyle,
  THEMES,
  type ThemeName,
} from './tokens'

function applyThemeToDocument(theme: ThemeName): void {
  const root = document.documentElement

  root.dataset.theme = theme
  for (const [name, value] of Object.entries(getThemeStyle(theme))) {
    root.style.setProperty(name, value)
  }
}

export type ThemePreferenceController = {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  cycleTheme: () => void
}

export function useThemePreference(
  initialTheme: ThemeName = DEFAULT_THEME,
): ThemePreferenceController {
  const [theme, setTheme] = useState<ThemeName>(initialTheme)

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const cycleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const currentIndex = THEMES.findIndex((item) => item.id === currentTheme)
      return THEMES[(currentIndex + 1) % THEMES.length].id
    })
  }, [])

  return { theme, setTheme, cycleTheme }
}
