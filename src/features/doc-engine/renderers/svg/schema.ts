import { z } from 'zod'

export const SVG_EMBED_SCHEMA = z
  .object({
    id: z.string().min(1).max(128),
    src: z.string().min(1).max(512),
    title: z.string().trim().min(1).max(256),
  })
  .strict()

export type SvgEmbedAttributes = z.infer<typeof SVG_EMBED_SCHEMA>
