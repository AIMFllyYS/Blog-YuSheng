import { z } from 'zod'

import { MARK_TONES } from '../../mark-style'

export const TIMELINE_BLOCK_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96),
    title: z.string().trim().min(1).max(80).optional(),
    tone: z.enum(MARK_TONES).optional(),
    swatch: z.string().regex(/^[a-z][a-z\d-]*$/).optional(),
  })
  .strict()
