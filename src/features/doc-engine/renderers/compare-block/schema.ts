import { z } from 'zod'

export const COMPARE_BLOCK_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96),
    title: z.string().trim().min(1).max(80).optional(),
  })
  .strict()

export const COMPARE_SIDE_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96).optional(),
    role: z.enum(['good', 'bad', 'a', 'b']),
    title: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
