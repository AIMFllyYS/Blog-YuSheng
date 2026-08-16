import { z } from 'zod'

export const AUDIO_EMBED_SCHEMA = z
  .object({
    id: z.string().trim().min(1),
    src: z.string().trim().min(1),
    title: z.string().trim().min(1),
  })
  .strict()
