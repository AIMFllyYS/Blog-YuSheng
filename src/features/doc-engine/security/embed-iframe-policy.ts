export const HTML_EMBED_IFRAME_POLICY = Object.freeze({
  sandbox: 'allow-scripts',
  referrerPolicy: 'no-referrer',
  allow: '',
  loading: 'lazy',
} as const)

export const EMBED_CAPABILITY_FRAGMENT_KEY = 'nonce' as const
export const HTML_EMBED_READY_TIMEOUT_MS = 4_000
export const WEB_EMBED_LOAD_TIMEOUT_MS = 4_000

/**
 * Author-owned registrable domains. Subdomains match.
 * Used for web-embed iframes and for HTTPS images/video/audio hosted outside the article package.
 */
export const AUTHOR_HOSTED_ETLD_PLUS_ONE_ALLOWLIST = Object.freeze<string[]>([
  'husteread.com',
  'husteread.icu',
  '1037solo.com',
  '1037solo.cn',
  'yusheng.email',
])

/** Extra registrable domains reviewed for iframe only — not a general image/video CDN. */
export const WEB_EMBED_EXTRA_ETLD_PLUS_ONE_ALLOWLIST = Object.freeze<string[]>([
  'harvey.ai',
  'themodernsoftware.dev',
  'datalearner.com',
])

/** Entries must be manually reviewed eTLD+1 hostnames. */
export const WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST = Object.freeze<string[]>([
  ...AUTHOR_HOSTED_ETLD_PLUS_ONE_ALLOWLIST,
  ...WEB_EMBED_EXTRA_ETLD_PLUS_ONE_ALLOWLIST,
])

const AUTHOR_HOSTED_IMAGE_EXTENSIONS = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
])

export type EmbedMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'resize'; readonly height: number }

export type EmbedMessageEvent = {
  readonly source: unknown
  readonly data: unknown
}

export type EmbedMessageGate = {
  readonly authenticated: boolean
  accept(event: EmbedMessageEvent): EmbedMessage | undefined
}

export type EmbedMessageRejection =
  | 'source-mismatch'
  | 'authentication-failed'
  | 'schema-invalid'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseEmbedMessage(value: unknown): EmbedMessage | undefined {
  if (!isRecord(value)) return undefined
  const keys = Object.keys(value)
  if (value.type === 'ready' && keys.length === 1) {
    return { type: 'ready' }
  }
  if (
    value.type === 'resize' &&
    typeof value.height === 'number' &&
    Number.isFinite(value.height) &&
    value.height > 0 &&
    keys.length === 2
  ) {
    return { type: 'resize', height: value.height }
  }
  return undefined
}

function parseEmbedEnvelope(
  value: unknown,
): { readonly nonce: string; readonly message: EmbedMessage } | undefined {
  if (!isRecord(value)) return undefined
  if (
    typeof value.nonce !== 'string' ||
    value.nonce.length < 16 ||
    value.nonce.length > 256 ||
    Object.keys(value).length !== 2
  ) {
    return undefined
  }
  const message = parseEmbedMessage(value.message)
  if (!message) return undefined
  return { nonce: value.nonce, message }
}

export function createEmbedMessageGate(
  expectedSource: unknown,
  capabilityNonce: string,
  onReject: (reason: EmbedMessageRejection) => void,
): EmbedMessageGate {
  if (capabilityNonce.length < 16) {
    throw new Error('iframe capability nonce 长度不足')
  }
  let authenticated = false
  let pendingNonce: string | undefined = capabilityNonce
  return {
    get authenticated() {
      return authenticated
    },
    accept(event) {
      if (event.source !== expectedSource) {
        onReject('source-mismatch')
        return undefined
      }
      if (!authenticated) {
        const envelope = parseEmbedEnvelope(event.data)
        if (!envelope || envelope.nonce !== pendingNonce || envelope.message.type !== 'ready') {
          onReject('authentication-failed')
          return undefined
        }
        authenticated = true
        pendingNonce = undefined
        return envelope.message
      }
      const message = parseEmbedMessage(event.data)
      if (!message) {
        onReject('schema-invalid')
        return undefined
      }
      return message
    },
  }
}

export function createEmbedCapabilityNonce(): string {
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function isWebEmbedAllowed(rawUrl: string): boolean {
  return matchesReviewedWebEmbedAllowlist(
    rawUrl,
    WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST,
  )
}

export function isAuthorHostedMediaUrl(rawUrl: string): boolean {
  return matchesReviewedWebEmbedAllowlist(
    rawUrl,
    AUTHOR_HOSTED_ETLD_PLUS_ONE_ALLOWLIST,
  )
}

export function isAuthorHostedImageUrl(rawUrl: string): boolean {
  return (
    isAuthorHostedMediaUrl(rawUrl) &&
    hasPathExtension(rawUrl, AUTHOR_HOSTED_IMAGE_EXTENSIONS)
  )
}

export function isAuthorHostedVideoUrl(rawUrl: string): boolean {
  return isAuthorHostedMediaUrl(rawUrl) && hasPathExtension(rawUrl, ['.mp4'])
}

export function isAuthorHostedAudioUrl(rawUrl: string): boolean {
  return isAuthorHostedMediaUrl(rawUrl) && hasPathExtension(rawUrl, ['.mp3'])
}

export function isHttpsAbsoluteUrl(rawUrl: string): boolean {
  return parseHttpsUrl(rawUrl) !== undefined
}

/** Pure policy evaluator for validating reviewed configuration fixtures. */
export function matchesReviewedWebEmbedAllowlist(
  rawUrl: string,
  reviewedEtldPlusOneHosts: readonly string[],
): boolean {
  const url = parseHttpsUrl(rawUrl)
  if (!url) return false
  const hostname = url.hostname.toLowerCase().replace(/\.+$/, '')
  return reviewedEtldPlusOneHosts.some((entry) =>
    hostnameCoveredByEtldPlusOne(hostname, entry),
  )
}

function parseHttpsUrl(rawUrl: string): URL | undefined {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return undefined
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port
  ) {
    return undefined
  }
  return url
}

function hostnameCoveredByEtldPlusOne(
  hostname: string,
  rawEntry: string,
): boolean {
  const entry = rawEntry.toLowerCase().replace(/\.+$/, '')
  if (!isRegistrableEtldPlusOne(entry)) return false
  return hostname === entry || hostname.endsWith(`.${entry}`)
}

/** At least two DNS labels; never a public-suffix-only value like `com`. */
export function isRegistrableEtldPlusOne(entry: string): boolean {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/.test(entry)) {
    return false
  }
  return entry.split('.').length >= 2
}

function hasPathExtension(
  rawUrl: string,
  extensions: readonly string[],
): boolean {
  const url = parseHttpsUrl(rawUrl)
  if (!url) return false
  const pathname = url.pathname.toLowerCase()
  return extensions.some((extension) => pathname.endsWith(extension))
}
