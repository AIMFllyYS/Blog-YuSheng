/**
 * 日报页只在悬停 / 聚焦时预取（AGENTS.md：文章禁止视口批量预取，链接默认 prefetch={false}）。
 * 同一会话内每个 href 只预取一次。
 */
export function createBriefPrefetcher(prefetch: (href: string) => void) {
  const seen = new Set<string>()
  return (href: string) => {
    if (seen.has(href)) return
    seen.add(href)
    prefetch(href)
  }
}
