export function projectPackageMediaUrl(
  source: string,
  articleSlug: string,
  manifest: readonly unknown[],
): string {
  const relativePath = normalizePackagePath(source)
  const expectedOutputPath = `blog/${articleSlug}/${relativePath}`
  const matched = manifest.find((value) => {
    if (!value || typeof value !== 'object') return false
    const entry = value as Record<string, unknown>
    return (
      entry.articleSlug === articleSlug &&
      entry.outputPath === expectedOutputPath &&
      typeof entry.publicUrl === 'string'
    )
  }) as Record<string, unknown> | undefined

  return encodePublicUrl(
    typeof matched?.publicUrl === 'string'
      ? matched.publicUrl
      : `/blog/${articleSlug}/${relativePath}`,
  )
}

export function projectHtmlEmbedUrl(
  articleSlug: string,
  nodeId: string,
  componentId: string,
  manifest: readonly unknown[],
): string {
  const matched = manifest.find((value) => {
    if (!value || typeof value !== 'object') return false
    const entry = value as Record<string, unknown>
    return (
      entry.articleSlug === articleSlug &&
      entry.nodeId === nodeId &&
      entry.nodeName === 'html-embed' &&
      typeof entry.publicUrl === 'string'
    )
  }) as Record<string, unknown> | undefined
  return encodePublicUrl(
    typeof matched?.publicUrl === 'string'
      ? matched.publicUrl
      : `/embeds/${articleSlug}/${componentId}/`,
  )
}

export function projectPackageAssetData(
  source: string,
  articleSlug: string,
  nodeName: string,
  manifest: readonly unknown[],
): unknown {
  const relativePath = normalizePackagePath(source)
  const expectedOutputPath = `blog/${articleSlug}/${relativePath}`
  const matched = manifest.find((value) => {
    if (!value || typeof value !== 'object') return false
    const entry = value as Record<string, unknown>
    return (
      entry.articleSlug === articleSlug &&
      entry.nodeName === nodeName &&
      entry.outputPath === expectedOutputPath &&
      'data' in entry
    )
  }) as Record<string, unknown> | undefined
  return matched?.data
}

function normalizePackagePath(source: string): string {
  let relativePath = source.startsWith('./') ? source.slice(2) : source
  for (let index = 0; index < 8; index += 1) {
    const decoded = decodeURIComponent(relativePath)
    if (decoded === relativePath) break
    relativePath = decoded
  }
  return relativePath.replace(/\\/g, '/')
}

function encodePublicUrl(value: string): string {
  return value
    .split('/')
    .map((segment, index) => (index === 0 ? '' : encodeURIComponent(segment)))
    .join('/')
}
