import { z } from 'zod'

import type { EmbedMessage } from './embed-iframe-policy'

export {
  AUTHOR_HOSTED_ETLD_PLUS_ONE_ALLOWLIST,
  EMBED_CAPABILITY_FRAGMENT_KEY,
  HTML_EMBED_IFRAME_POLICY,
  HTML_EMBED_READY_TIMEOUT_MS,
  WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST,
  WEB_EMBED_EXTRA_ETLD_PLUS_ONE_ALLOWLIST,
  WEB_EMBED_LOAD_TIMEOUT_MS,
  createEmbedCapabilityNonce,
  createEmbedMessageGate,
  isAuthorHostedAudioUrl,
  isAuthorHostedImageUrl,
  isAuthorHostedMediaUrl,
  isAuthorHostedVideoUrl,
  isHttpsAbsoluteUrl,
  isRegistrableEtldPlusOne,
  isWebEmbedAllowed,
  matchesReviewedWebEmbedAllowlist,
  type EmbedMessage,
  type EmbedMessageEvent,
  type EmbedMessageGate,
  type EmbedMessageRejection,
} from './embed-iframe-policy'

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

type ZodEmbedMessage = z.infer<typeof EMBED_MESSAGE_SCHEMA>
type MessagesMatch = ZodEmbedMessage extends EmbedMessage
  ? EmbedMessage extends ZodEmbedMessage
    ? true
    : never
  : never
const embedMessageTypesAlign: MessagesMatch = true
void embedMessageTypesAlign
