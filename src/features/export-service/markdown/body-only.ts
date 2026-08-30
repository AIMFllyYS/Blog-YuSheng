import type { CompiledDocument } from '../../doc-engine/core'
import type { ExportArtifact } from '../export-document'

export function assembleBodyOnlyMarkdown(
  document: Pick<CompiledDocument, 'articleSlug' | 'originalSource'>,
): ExportArtifact {
  return Object.freeze({
    filename: `${document.articleSlug}.md`,
    mimeType: 'text/markdown;charset=utf-8',
    bytes: encodeUtf8(document.originalSource),
  })
}

export function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}
