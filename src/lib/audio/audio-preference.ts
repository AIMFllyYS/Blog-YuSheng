'use client'

import { useCallback, useSyncExternalStore } from 'react'

export const AUDIO_STORAGE_KEY = 'blog-yusheng:audio-enabled:v1'

type PreferenceListener = () => void

let audioEnabled = false
let didHydrate = false
const listeners = new Set<PreferenceListener>()

function readStoredAudio(): boolean {
  try {
    return window.localStorage.getItem(AUDIO_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persistAudio(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(AUDIO_STORAGE_KEY, '1')
    } else {
      window.localStorage.removeItem(AUDIO_STORAGE_KEY)
    }
  } catch {
    // Private mode / quota must not break the audio toggle.
  }
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

function hydrateAudio(): boolean {
  if (didHydrate) return audioEnabled
  didHydrate = true
  audioEnabled = readStoredAudio()
  return audioEnabled
}

function subscribe(listener: PreferenceListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): boolean {
  return hydrateAudio()
}

function getServerSnapshot(): boolean {
  return false
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUDIO_STORAGE_KEY) return
    const next = event.newValue === '1'
    if (next === audioEnabled) return
    audioEnabled = next
    didHydrate = true
    emit()
  })
}

export function setAudioEnabled(enabled: boolean): void {
  if (didHydrate && audioEnabled === enabled) return

  audioEnabled = enabled
  didHydrate = true
  persistAudio(enabled)
  emit()
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
