'use client'

import { FallingToastProvider } from '@/components/ui/falling-toast'
import { RopeNavigation } from '@/features/navigation'
import { useAudioPreference } from '@/lib/audio'
import { useThemePreference } from '@/lib/theme'

function BlogIndexNavigation() {
  const { theme, setTheme, cycleTheme } = useThemePreference()
  const { audioEnabled, setAudioEnabled } = useAudioPreference()

  return (
    <RopeNavigation
      audioEnabled={audioEnabled}
      brandHref="/"
      onAudioEnabledChange={setAudioEnabled}
      onCycleTheme={cycleTheme}
      onThemeChange={setTheme}
      theme={theme}
    />
  )
}

export function BlogIndexChrome() {
  return (
    <FallingToastProvider>
      <BlogIndexNavigation />
    </FallingToastProvider>
  )
}
