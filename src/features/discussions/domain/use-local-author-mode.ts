'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  readLocalAuthorMode,
  subscribeLocalAuthorMode,
  writeLocalAuthorMode,
} from './local-author-mode'

function subscribe(onStoreChange: () => void): () => void {
  return subscribeLocalAuthorMode(() => onStoreChange())
}

function getServerSnapshot(): false {
  return false
}

export function useLocalAuthorMode(): {
  readonly enabled: boolean
  readonly setEnabled: (enabled: boolean) => void
} {
  const enabled = useSyncExternalStore(
    subscribe,
    readLocalAuthorMode,
    getServerSnapshot,
  )
  const setEnabled = useCallback((next: boolean) => {
    writeLocalAuthorMode(next)
  }, [])
  return { enabled, setEnabled }
}
