export type VisibilityList = {
  readonly posts: readonly string[]
  readonly briefs: readonly string[]
}

export type VisibilityParseResult =
  | { ok: true; value: { posts: string[]; briefs: string[] } }
  | { ok: false; message: string }

export function isValidPostSlug(slug: string): boolean
export function isValidBriefDate(date: string): boolean
export function parseVisibilityJson(value: unknown): VisibilityParseResult
export function parseVisibilitySource(source: string): VisibilityParseResult
export function serializeVisibility(list: VisibilityList): string
