import { z } from 'zod'

export const HTML_EMBED_IFRAME_POLICY = Object.freeze({
  sandbox: 'allow-scripts',
  referrerPolicy: 'no-referrer',
  allow: '',
  loading: 'lazy',
} as const)

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

export function createEmbedMessageGate(
  expectedSource: unknown,
  capabilityNonce: string,
): EmbedMessageGate {
  if (capabilityNonce.length < 16) {
    throw new Error('iframe capability nonce 长度不足')
  }
  let authenticated = false
  return {
    get authenticated() {
      return authenticated
    },
    accept(event) {
      if (event.source !== expectedSource) return undefined
      if (!authenticated) {
        const envelope = EMBED_MESSAGE_ENVELOPE_SCHEMA.safeParse(event.data)
        if (
          !envelope.success ||
          envelope.data.nonce !== capabilityNonce ||
          envelope.data.message.type !== 'ready'
        ) {
          return undefined
        }
        authenticated = true
        return envelope.data.message
      }
      const message = EMBED_MESSAGE_SCHEMA.safeParse(event.data)
      return message.success ? message.data : undefined
    },
  }
}

export function createEmbedCapabilityNonce(): string {
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function isWebEmbedAllowed(rawUrl: string): boolean {
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
  return WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST.includes(hostname)
}
