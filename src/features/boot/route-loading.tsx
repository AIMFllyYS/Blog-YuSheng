'use client'

import { useSyncExternalStore } from 'react'
import { BootVeil } from './boot-veil'

function subscribe() {
  return () => {}
}

function getClientSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function RouteLoading() {
  const show = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  )
  if (!show) return null
  return <BootVeil persist />
}
