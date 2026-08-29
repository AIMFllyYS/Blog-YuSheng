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
