'use client'

import { useCallback, useSyncExternalStore } from 'react'

type PreferenceListener = () => void

let audioEnabled = false
const listeners = new Set<PreferenceListener>()

function subscribe(listener: PreferenceListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): boolean {
  return audioEnabled
}

function getServerSnapshot(): boolean {
  return false
}

export function setAudioEnabled(enabled: boolean): void {
  if (audioEnabled === enabled) return

  audioEnabled = enabled
  listeners.forEach((listener) => listener())
}

export type AudioPreferenceController = {
  audioEnabled: boolean
  setAudioEnabled: (enabled: boolean) => void
  toggleAudio: () => void
}

export function useAudioPreference(): AudioPreferenceController {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const toggleAudio = useCallback(() => setAudioEnabled(!enabled), [enabled])

  return {
    audioEnabled: enabled,
    setAudioEnabled,
    toggleAudio,
  }
}
