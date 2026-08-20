'use client'

import { useSyncExternalStore } from 'react'
import { BootVeil } from './boot-veil'

function subscribe() {
  return () => {}
}

function getSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function RouteLoading() {
  const show = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!show) return null
  return <BootVeil />
}
