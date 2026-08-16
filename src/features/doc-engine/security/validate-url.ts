export type ValidatedUrl = {
  readonly href: string
  readonly kind: 'https' | 'mailto' | 'anchor'
}

const CONTROL_OR_SPACE = /[\u0000-\u0020\u007f]/

export function validateDocumentUrl(rawUrl: string): ValidatedUrl | undefined {
  if (!rawUrl || rawUrl !== rawUrl.trim() || CONTROL_OR_SPACE.test(rawUrl)) {
    return undefined
  }
  if (rawUrl.startsWith('#')) {
    return rawUrl.length > 1 && !/["'<>`]/.test(rawUrl)
      ? { href: rawUrl, kind: 'anchor' }
      : undefined
  }
  if (rawUrl.startsWith('//')) return undefined
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return undefined
  }
  if (url.protocol === 'https:') {
    if (!url.hostname || url.username || url.password) return undefined
    return { href: url.href, kind: 'https' }
  }
  if (url.protocol === 'mailto:') {
    const schemeSpecificPart = rawUrl.slice('mailto:'.length)
    const decoded = decodeURIComponentToStable(schemeSpecificPart)
    if (
      schemeSpecificPart.startsWith('//') ||
      decoded === undefined ||
      /[\u0000-\u001f\u007f]/.test(decoded) ||
      url.hash ||
      !isAllowedMailto(decoded)
    ) {
      return undefined
    }
    return { href: url.href, kind: 'mailto' }
  }
  return undefined
}

/** Article-only exception for same-site navigation used by the locked golden fixture. */
export function validateArticleLinkUrl(rawUrl: string): boolean {
  if (validateDocumentUrl(rawUrl)) return true
  const decoded = decodeURIComponentToStable(rawUrl)
  if (
    decoded === undefined ||
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    CONTROL_OR_SPACE.test(decoded) ||
    /[\\\0"'<>`]/.test(decoded)
  ) {
    return false
  }
  const path = decoded.split(/[?#]/, 1)[0] ?? ''
  return !path.split('/').some((segment) => segment === '.' || segment === '..')
}

function isAllowedMailto(decodedSchemeSpecificPart: string): boolean {
  const [address = '', query = '', ...rest] = decodedSchemeSpecificPart.split('?')
  if (rest.length > 0 || !/^[^\s@/,]+@[^\s@/,]+\.[^\s@/,]+$/.test(address)) {
    return false
  }
  if (!query) return true
  const params = new URLSearchParams(query)
  for (const key of params.keys()) {
    if (key !== 'subject' && key !== 'body') return false
  }
  return true
}

function decodeURIComponentSafely(value: string): string | undefined {
  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

function decodeURIComponentToStable(value: string): string | undefined {
  let current = value
  for (let round = 0; round < 8; round += 1) {
    const decoded = decodeURIComponentSafely(current)
    if (decoded === undefined) return undefined
    if (decoded === current) return decoded
    current = decoded
  }
  return undefined
}

export const DISCUSSION_LINK_REL = Object.freeze([
  'nofollow',
  'ugc',
  'noopener',
  'noreferrer',
] as const)
