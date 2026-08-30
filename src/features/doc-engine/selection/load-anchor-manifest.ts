import type { SelectionDocumentIndex } from './selection-types'

export function articleAnchorManifestUrl(articleSlug: string) {
  return `/blog/${articleSlug}/anchor-manifest.json`
}

export function emptySelectionIndex(
  articleSlug: string,
): SelectionDocumentIndex {
  return {
    articleSlug,
    documentFingerprint: '',
    blocks: [],
  }
}

export function isSelectionDocumentIndex(
  value: unknown,
): value is SelectionDocumentIndex {
  if (typeof value !== 'object' || value === null) return false
  if (!('articleSlug' in value) || typeof value.articleSlug !== 'string') {
    return false
  }
  if (
    !('documentFingerprint' in value) ||
    typeof value.documentFingerprint !== 'string'
  ) {
    return false
  }
  return 'blocks' in value && Array.isArray(value.blocks)
}

export async function loadArticleAnchorManifest(
  articleSlug: string,
): Promise<SelectionDocumentIndex> {
  const response = await fetch(articleAnchorManifestUrl(articleSlug))
  if (!response.ok) {
    throw new Error(`划词索引未就绪（${response.status}）`)
  }
  const payload: unknown = await response.json()
  if (!isSelectionDocumentIndex(payload)) {
    throw new Error('划词索引 sidecar 格式无效')
  }
  if (payload.articleSlug !== articleSlug) {
    throw new Error('划词索引与当前文章不匹配')
  }
  return {
    articleSlug: payload.articleSlug,
    documentFingerprint: payload.documentFingerprint,
    blocks: payload.blocks,
  }
}
