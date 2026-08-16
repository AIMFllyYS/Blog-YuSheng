export const EXPORT_DOCUMENT_SCHEMA_VERSION = 1 as const

export type DiscussionExportScope =
  | 'body-only'
  | 'body-with-annotations'
  | 'body-with-comments'
  | 'body-with-all-discussions'

export type ExportFormat = 'markdown' | 'text' | 'docx' | 'pdf'

export type ExportDocumentBody = {
  readonly originalSource: string
}

export type ExportDocument = {
  readonly schemaVersion: typeof EXPORT_DOCUMENT_SCHEMA_VERSION
  readonly articleSlug: string
  readonly scope: DiscussionExportScope
  readonly generatedAt: string
  readonly body: ExportDocumentBody
}

export type ExportArtifact = {
  readonly filename: string
  readonly mimeType: string
  readonly bytes: Uint8Array
}

export type AssembleExportSuccess = {
  readonly ok: true
  readonly document: ExportDocument
  readonly artifact: ExportArtifact
}

export type AssembleExportFailure = {
  readonly ok: false
  readonly reason: 'unsupported-scope' | 'unsupported-format'
  readonly message: string
}

export type AssembleExportResult = AssembleExportSuccess | AssembleExportFailure

export function freezeExportDocument(document: ExportDocument): ExportDocument {
  return Object.freeze({
    schemaVersion: document.schemaVersion,
    articleSlug: document.articleSlug,
    scope: document.scope,
    generatedAt: document.generatedAt,
    body: Object.freeze({ originalSource: document.body.originalSource }),
  })
}
