export type RopeProfile = 'hub' | 'article'

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function resolveRopeProfile(pathname: string): RopeProfile {
  const path = normalizePathname(pathname)
  return /^\/blog\/.+/.test(path) ? 'article' : 'hub'
}

export function isActiveHref(href: string, pathname: string): boolean {
  const path = normalizePathname(pathname)
  const target = normalizePathname(href)
  if (target === '/') return path === '/'
  return path === target || path.startsWith(`${target}/`)
}
