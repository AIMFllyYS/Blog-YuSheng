import { z } from 'zod'

const COMPONENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const HTML_EMBED_SCHEMA = z
  .object({
    id: z.string().min(1).max(80).regex(COMPONENT_ID),
    src: z.string().min(1).max(512),
    title: z.string().trim().min(1).max(200),
    height: z.number().int().min(120).max(2_000).optional(),
  })
  .strict()
  .refine((value) => value.src === `./embeds/${value.id}/index.html`, {
    message: 'html-embed src 必须指向与 id 同名的 embeds 入口。',
    path: ['src'],
  })

export type HtmlEmbedAttributes = z.infer<typeof HTML_EMBED_SCHEMA>
