import { z } from 'zod'

export const CANVAS_RENDER_SCHEMA = z
  .object({
    id: z.string().trim().min(1),
    renderer: z.string().trim().min(1),
    'data-src': z.string().trim().min(1).optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict()
