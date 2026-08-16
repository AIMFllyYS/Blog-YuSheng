import { z } from 'zod'

export const HTML_EMBED_IFRAME_POLICY = Object.freeze({
  sandbox: 'allow-scripts',
  referrerPolicy: 'no-referrer',
  allow: '',
  loading: 'lazy',
} as const)

export const EMBED_CAPABILITY_FRAGMENT_KEY = 'nonce' as const
export const WEB_EMBED_LOAD_TIMEOUT_MS = 4_000

/** Entries must be manually reviewed eTLD+1 hostnames. P0 intentionally starts empty. */
export const WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST = Object.freeze<string[]>([])

export const EMBED_MESSAGE_SCHEMA = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }).strict(),
  z
    .object({ type: z.literal('resize'), height: z.number().finite().positive() })
    .strict(),
])

export const EMBED_MESSAGE_ENVELOPE_SCHEMA = z
  .object({
    nonce: z.string().min(16).max(256),
    message: EMBED_MESSAGE_SCHEMA,
  })
  .strict()

export type EmbedMessage = z.infer<typeof EMBED_MESSAGE_SCHEMA>

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
        const envelope = EMBED_MESSAGE_ENVELOPE_SCHEMA.safeParse(event.data)
        if (
          !envelope.success ||
          envelope.data.nonce !== pendingNonce ||
          envelope.data.message.type !== 'ready'
        ) {
          onReject('authentication-failed')
          return undefined
        }
        authenticated = true
        pendingNonce = undefined
        return envelope.data.message
      }
      const message = EMBED_MESSAGE_SCHEMA.safeParse(event.data)
      if (!message.success) {
        onReject('schema-invalid')
        return undefined
      }
      return message.data
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

/** Pure policy evaluator for validating reviewed configuration fixtures. */
export function matchesReviewedWebEmbedAllowlist(
  rawUrl: string,
  reviewedEtldPlusOneHosts: readonly string[],
): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port
  ) {
    return false
  }
  const hostname = url.hostname.toLowerCase().replace(/\.+$/, '')
  return reviewedEtldPlusOneHosts.some((entry) => {
    const reviewedHostname = entry.toLowerCase().replace(/\.+$/, '')
    return reviewedHostname === hostname
  })
}
