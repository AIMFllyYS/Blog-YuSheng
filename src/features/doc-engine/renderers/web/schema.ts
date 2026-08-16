import { z } from 'zod'

const COMPONENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const WEB_EMBED_SCHEMA = z
  .object({
    id: z.string().min(1).max(80).regex(COMPONENT_ID),
    src: z.string().min(1).max(2_048),
    title: z.string().trim().min(1).max(200),
    height: z.number().int().min(120).max(2_000).optional(),
  })
  .strict()

export type WebEmbedAttributes = z.infer<typeof WEB_EMBED_SCHEMA>
