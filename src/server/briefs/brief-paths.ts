import 'server-only'

import path from 'node:path'

export const CONTENT_BRIEFS_ROOT = path.join(process.cwd(), 'content', 'briefs')

/** 原件落位到 `out/briefs/<date>.html`，对应 edgeone.json 的 `/briefs/*` 响应头规则 */
export const BRIEFS_OUTPUT_DIR = 'briefs'

export function briefOutputPath(date: string): string {
  return `${BRIEFS_OUTPUT_DIR}/${date}.html`
}

export function briefPublicUrl(date: string): string {
  return `/${briefOutputPath(date)}`
}

export function briefRouteHref(date: string): string {
  return `/daily/${date}/`
}
