export const ARTICLE_EXPORT_SOURCE_SCHEMA_VERSION = 1 as const

export type ArticleExportSource = {
  readonly schemaVersion: typeof ARTICLE_EXPORT_SOURCE_SCHEMA_VERSION
  readonly articleSlug: string
  readonly documentFingerprint: string
  readonly originalSource: string
  readonly plainText: string
}

export function isArticleExportSource(
  value: unknown,
): value is ArticleExportSource {
  if (typeof value !== 'object' || value === null) return false
  if (!('schemaVersion' in value) || value.schemaVersion !== 1) return false
  if (!('articleSlug' in value) || typeof value.articleSlug !== 'string') {
    return false
  }
  if (
    !('documentFingerprint' in value) ||
    typeof value.documentFingerprint !== 'string'
  ) {
    return false
  }
  if (
    !('originalSource' in value) ||
    typeof value.originalSource !== 'string'
  ) {
    return false
  }
  return 'plainText' in value && typeof value.plainText === 'string'
}

export function articleExportSourceUrl(articleSlug: string) {
  return `/blog/${articleSlug}/export-source.json`
}

export async function loadArticleExportSource(
  articleSlug: string,
): Promise<ArticleExportSource> {
  const response = await fetch(articleExportSourceUrl(articleSlug))
  if (!response.ok) {
    throw new Error(`导出源码未就绪（${response.status}）`)
  }
  const payload: unknown = await response.json()
  if (!isArticleExportSource(payload)) {
    throw new Error('导出源码 sidecar 格式无效')
  }
  if (payload.articleSlug !== articleSlug) {
    throw new Error('导出源码与当前文章不匹配')
  }
  return payload
}
