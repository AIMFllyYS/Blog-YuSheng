import { z } from 'zod'

import { HEX_COLOR_PATTERN, MARK_EFFECTS, MARK_TONES } from '../../mark-style'

export const TEXT_MARK_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96).optional(),
    tone: z.enum(MARK_TONES).optional(),
    swatch: z.string().regex(/^[a-z][a-z\d-]*$/).optional(),
    color: z.string().regex(HEX_COLOR_PATTERN).optional(),
    'color-night': z.string().regex(HEX_COLOR_PATTERN).optional(),
    effect: z.enum(MARK_EFFECTS).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const sources = [value.tone, value.swatch, value.color].filter(Boolean)
    if (sources.length !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'tone、swatch、color 必须三选一。',
      })
    }
    if (value['color-night'] && !value.color) {
      context.addIssue({
        code: 'custom',
        message: 'color-night 只能配合 color 使用。',
        path: ['color-night'],
      })
    }
  })
