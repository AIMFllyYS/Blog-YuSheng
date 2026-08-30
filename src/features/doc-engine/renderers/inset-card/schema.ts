import { z } from 'zod'

import { MARK_TONES } from '../../mark-style'

export const INSET_CARD_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96),
    title: z.string().trim().min(1).max(80),
    eyebrow: z.string().trim().min(1).max(24).optional(),
    kicker: z.string().trim().min(1).max(48).optional(),
    swatch: z.string().regex(/^[a-z][a-z\d-]*$/).optional(),
    tone: z.enum(MARK_TONES).optional(),
  })
  .strict()
