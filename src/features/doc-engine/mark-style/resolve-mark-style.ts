import {
  ARTICLE_PALETTE_SCHEMA,
  HEX_COLOR_PATTERN,
  MARK_EFFECTS,
  MARK_TONES,
  type ArticlePalette,
  type MarkEffect,
  type MarkTone,
  type PaletteSwatch,
} from './palette-schema'

export type MarkStyleResolution =
  | {
      readonly ok: true
      readonly tone?: MarkTone
      readonly swatch?: string
      readonly color?: string
      readonly colorNight?: string
      readonly wash?: string
      readonly effect?: MarkEffect
    }
  | { readonly ok: false; readonly message: string }

export function parseArticlePalette(data: unknown): {
  readonly ok: true
  readonly palette: ArticlePalette
} | {
  readonly ok: false
  readonly message: string
} {
  const parsed = ARTICLE_PALETTE_SCHEMA.safeParse(data)
  if (!parsed.success) {
    return { ok: false, message: '文章色板 data/palette.json 无法通过 schema。' }
  }
  return { ok: true, palette: parsed.data }
}

export function resolveMarkStyle(
  attributes: Readonly<Record<string, unknown>>,
  palette: ArticlePalette | undefined,
): MarkStyleResolution {
  const tone = optionalEnum(attributes.tone, MARK_TONES)
  const swatch = optionalString(attributes.swatch)
  const color = optionalString(attributes.color)
  const colorNight = optionalString(attributes['color-night'])
  const effect = optionalEnum(attributes.effect, MARK_EFFECTS)
  const sources = [tone, swatch, color].filter((value) => value !== undefined)
  if (sources.length !== 1) {
    return { ok: false, message: 'tone、swatch、color 必须三选一。' }
  }
  if (colorNight && !color) {
    return { ok: false, message: 'color-night 只能配合 color 使用。' }
  }
  if (color && !HEX_COLOR_PATTERN.test(color)) {
    return { ok: false, message: 'color 必须是 #RGB 或 #RRGGBB。' }
  }
  if (colorNight && !HEX_COLOR_PATTERN.test(colorNight)) {
    return { ok: false, message: 'color-night 必须是 #RGB 或 #RRGGBB。' }
  }
  if (swatch) {
    const entry = palette?.[swatch]
    if (!entry) {
      return { ok: false, message: `色板中没有名为 ${swatch} 的色轨。` }
    }
    return {
      ok: true,
      swatch,
      color: entry.color,
      colorNight: entry.night,
      wash: entry.wash,
      effect,
    }
  }
  return {
    ok: true,
    tone,
    color,
    colorNight,
    effect,
  }
}

export function cssVarsForMark(style: Extract<MarkStyleResolution, { ok: true }>): {
  readonly '--mark-color'?: string
  readonly '--mark-color-night'?: string
  readonly '--mark-wash'?: string
} {
  if (style.tone) return {}
  return {
    ...(style.color ? { '--mark-color': style.color } : {}),
    ...(style.colorNight ? { '--mark-color-night': style.colorNight } : {}),
    ...(style.wash ? { '--mark-wash': style.wash } : {}),
  }
}

export function swatchOf(palette: ArticlePalette, name: string): PaletteSwatch | undefined {
  return palette[name]
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}
