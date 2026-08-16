import type { CompiledDocument } from '../doc-engine/core'
import {
  EXPORT_DOCUMENT_SCHEMA_VERSION,
  freezeExportDocument,
  type AssembleExportResult,
  type DiscussionExportScope,
  type ExportFormat,
} from './export-document'
import { assembleUnsupportedDocx } from './docx/unsupported'
import { assembleBodyOnlyMarkdown } from './markdown/body-only'
import { assembleMarkdownWithAppendix } from './markdown/body-with-annotations'
import {
  renderReviewAppendix,
  type ReviewAppendixModel,
} from './markdown/review-appendix'
import { assembleUnsupportedPdf } from './pdf/unsupported'
import { assembleBodyOnlyText } from './text/project-text'

export type AssembleExportInput = {
  readonly document: CompiledDocument
  readonly format: ExportFormat
  readonly scope: DiscussionExportScope
  readonly assetManifest?: readonly unknown[]
  readonly generatedAt?: string
  readonly appendix?: ReviewAppendixModel
}

export function assembleExport(input: AssembleExportInput): AssembleExportResult {
  if (input.scope === 'body-with-annotations') {
    if (input.format !== 'markdown' || !input.appendix) {
      return Object.freeze({
        ok: false,
        reason: 'unsupported-scope',
        message: '该内容范围随后续版本开放',
      })
    }
    const exportDocument = freezeExportDocument({
      schemaVersion: EXPORT_DOCUMENT_SCHEMA_VERSION,
      articleSlug: input.document.articleSlug,
      scope: input.scope,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      body: { originalSource: input.document.originalSource },
      appendix: input.appendix,
    })
    return Object.freeze({
      ok: true,
      document: exportDocument,
      artifact: assembleMarkdownWithAppendix(
        input.document,
        renderReviewAppendix(input.appendix),
      ),
    })
  }

  if (input.scope !== 'body-only') {
    return Object.freeze({
      ok: false,
      reason: 'unsupported-scope',
      message: '该内容范围随后续版本开放',
    })
  }

  if (input.format === 'docx') return assembleUnsupportedDocx()
  if (input.format === 'pdf') return assembleUnsupportedPdf()

  const exportDocument = freezeExportDocument({
    schemaVersion: EXPORT_DOCUMENT_SCHEMA_VERSION,
    articleSlug: input.document.articleSlug,
    scope: input.scope,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    body: { originalSource: input.document.originalSource },
  })

  if (input.format === 'markdown') {
    return Object.freeze({
      ok: true,
      document: exportDocument,
      artifact: assembleBodyOnlyMarkdown(input.document),
    })
  }

  return Object.freeze({
    ok: true,
    document: exportDocument,
    artifact: assembleBodyOnlyText(
      input.document,
      input.assetManifest ?? input.document.assetManifest,
    ),
  })
}
