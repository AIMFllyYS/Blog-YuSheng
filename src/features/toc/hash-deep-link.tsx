'use client'

import { useEffect } from 'react'
import { scrollReaderToHeading } from './scroll-reader-to-heading'

const VEIL_WAIT_MS = 2_400

function readHashSlug() {
  const raw = window.location.hash.slice(1)
  if (!raw) return undefined

  try {
    return decodeURIComponent(raw)
  } catch {
    return undefined
  }
}

function jumpFromLocationHash() {
  const slug = readHashSlug()
  if (!slug) return
  scrollReaderToHeading(slug)
}

export function HashDeepLink() {
  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()

    const waitThenJump = () => {
      if (cancelled) return
      const veilGone = !document.querySelector('[data-reader-boot-veil]')
      if (veilGone || Date.now() - startedAt >= VEIL_WAIT_MS) {
        jumpFromLocationHash()
        return
      }
      window.setTimeout(waitThenJump, 50)
    }

    waitThenJump()
    window.addEventListener('hashchange', jumpFromLocationHash)
    return () => {
      cancelled = true
      window.removeEventListener('hashchange', jumpFromLocationHash)
    }
  }, [])

  return null
}
