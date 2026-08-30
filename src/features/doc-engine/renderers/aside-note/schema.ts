import { z } from 'zod'

import { MARK_TONES } from '../../mark-style'

export const ASIDE_NOTE_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96),
    kind: z.enum(['callout', 'warn', 'addon', 'quote']),
    title: z.string().trim().min(1).max(80).optional(),
    swatch: z.string().regex(/^[a-z][a-z\d-]*$/).optional(),
    tone: z.enum(MARK_TONES).optional(),
  })
  .strict()
