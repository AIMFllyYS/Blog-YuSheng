const CHAPTER_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
})

/** Deterministic string hash for palette picks and article-spine jitter. */
export function hashString(input: string, modulo = 1000): number {
  let value = 0
  for (const char of input) {
    value = (value * 31 + char.charCodeAt(0)) % modulo
  }
  return value
}

export function formatChapterDate(iso: string): string {
  return CHAPTER_DATE_FORMATTER.format(new Date(iso))
}

/** First-seen unique tags; empty input yields an empty list. */
export function uniqueTags(
  tags: readonly string[] | undefined,
): readonly string[] {
  if (!tags || tags.length === 0) {
    return []
  }

  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of tags) {
    if (seen.has(tag)) continue
    seen.add(tag)
    result.push(tag)
  }
  return result
}

export const BOOKMARK_TAG_LIMIT = 4

export function bookmarkTagOverflow(
  tags: readonly string[] | undefined,
): { readonly visible: readonly string[]; readonly extra: number } {
  const unique = uniqueTags(tags)
  if (unique.length <= BOOKMARK_TAG_LIMIT) {
    return { visible: unique, extra: 0 }
  }
  return {
    visible: unique.slice(0, BOOKMARK_TAG_LIMIT),
    extra: unique.length - BOOKMARK_TAG_LIMIT,
  }
}

export function readCatalogHash(): string {
  return decodeURIComponent(window.location.hash.replace(/^#/, ''))
}

/** Sync `/blog/#<section-slug>` without firing `hashchange` (avoids a setState loop). */
export function writeCatalogHash(slug: string | null): void {
  if (slug) {
    const hash = `#${encodeURIComponent(slug)}`
    if (window.location.hash === hash) return
    window.history.pushState(null, '', hash)
    return
  }

  if (!window.location.hash) return
  window.history.pushState(
    null,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
}
