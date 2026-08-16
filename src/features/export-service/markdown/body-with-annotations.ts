import type { CompiledDocument } from '../../doc-engine/core'
import type { ExportArtifact } from '../export-document'
import { encodeUtf8 } from './body-only'

export function assembleMarkdownWithAppendix(
  document: CompiledDocument,
  appendixText: string,
): ExportArtifact {
  const body = document.originalSource
  const joined = body.endsWith('\n') ? `${body}\n${appendixText}` : `${body}\n\n${appendixText}`
  return Object.freeze({
    filename: `${document.articleSlug}.review.md`,
    mimeType: 'text/markdown;charset=utf-8',
    bytes: encodeUtf8(joined),
  })
}
