import { z } from 'zod'

export const VIDEO_EMBED_SCHEMA = z
  .object({
    id: z.string().trim().min(1),
    src: z.string().trim().min(1),
    title: z.string().trim().min(1),
    poster: z.string().trim().min(1).optional(),
  })
  .strict()
