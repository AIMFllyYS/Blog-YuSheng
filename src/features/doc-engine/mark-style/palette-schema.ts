import { z } from 'zod'

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const MARK_TONES = [
  'thesis',
  'warn',
  'good',
  'bad',
  'note',
  'muted',
] as const

export const MARK_EFFECTS = [
  'fluorescent',
  'wash',
  'pill',
  'kbd',
  'dim',
] as const

export type MarkTone = (typeof MARK_TONES)[number]
export type MarkEffect = (typeof MARK_EFFECTS)[number]

const HEX_COLOR = z.string().regex(HEX_COLOR_PATTERN, '颜色必须是 #RGB 或 #RRGGBB。')

export const PALETTE_SWATCH_SCHEMA = z
  .object({
    color: HEX_COLOR,
    wash: HEX_COLOR.optional(),
    night: HEX_COLOR.optional(),
  })
  .strict()

export const ARTICLE_PALETTE_SCHEMA = z.record(
  z.string().regex(/^[a-z][a-z\d-]*$/, '色板名必须是小写 kebab-case。'),
  PALETTE_SWATCH_SCHEMA,
)

export type ArticlePalette = z.output<typeof ARTICLE_PALETTE_SCHEMA>
export type PaletteSwatch = z.output<typeof PALETTE_SWATCH_SCHEMA>
