'use client'

import { RopeNavigation } from '@/features/navigation'
import { useAudioPreference } from '@/lib/audio'
import { useThemePreference } from '@/lib/theme'

function ReaderNavigation() {
  const { theme, setTheme, cycleTheme } = useThemePreference()
  const { audioEnabled, setAudioEnabled } = useAudioPreference()

  return (
    <RopeNavigation
      audioEnabled={audioEnabled}
      onAudioEnabledChange={setAudioEnabled}
      onCycleTheme={cycleTheme}
      onThemeChange={setTheme}
      theme={theme}
      variant="reader"
    />
  )
}

export function ReaderChrome() {
  return <ReaderNavigation />
}
