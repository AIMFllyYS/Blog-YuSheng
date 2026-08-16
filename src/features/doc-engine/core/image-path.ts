export function normalizeArticleImageRelativePath(source: string): string {
  let decoded = source.replace(/^\.\//, '')
  try {
    for (let index = 0; index < 8; index += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
  } catch {
    return source.replace(/^\.\//, '').replace(/\\/g, '/')
  }
  return decoded.replace(/\\/g, '/')
}
