'use client'

import { useEffect } from 'react'

const CLOUD_FONT_STYLE_ID = 'cloud-serif-font'
const CLOUD_FONT_IMPORT =
  '@import url("https://fontsapi.zeoseven.com/285/main/result.css");'

/**
 * Load the remote unicode-range stylesheet only after the system-serif first
 * paint. A static @import in globals.css would make a stalled CDN block all
 * local styles and content despite the font face using font-display: swap.
 */
export function CloudSerifFont() {
  useEffect(() => {
    if (document.getElementById(CLOUD_FONT_STYLE_ID)) return

    const style = document.createElement('style')
    style.id = CLOUD_FONT_STYLE_ID
    style.textContent = CLOUD_FONT_IMPORT
    document.head.append(style)

    return () => style.remove()
  }, [])

  return null
}
