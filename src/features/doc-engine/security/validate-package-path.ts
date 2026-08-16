const SCHEME_OR_DRIVE = /^[a-z][a-z\d+.-]*:/i

export function validatePackageRelativePath(rawPath: string): boolean {
  let current = rawPath
  for (let round = 0; round < 8; round += 1) {
    if (hasUnsafePathSyntax(current)) return false
    let decoded: string
    try {
      decoded = decodeURIComponent(current)
    } catch {
      return false
    }
    if (decoded === current) return true
    current = decoded
  }
  return false
}

function hasUnsafePathSyntax(value: string): boolean {
  if (
    !value.startsWith('./') ||
    value.includes('\\') ||
    value.includes(':') ||
    /[\u0000-\u001f\u007f]|\p{White_Space}/u.test(value) ||
    value.includes('?') ||
    value.includes('#') ||
    value.startsWith('/') ||
    SCHEME_OR_DRIVE.test(value)
  ) {
    return true
  }
  const segments = value.slice(2).split('/')
  return (
    segments.length === 0 ||
    segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  )
}
