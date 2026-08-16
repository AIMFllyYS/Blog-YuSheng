import {
  createDocumentDiagnostic,
  type DocumentDiagnostic,
} from '../../core/diagnostics'
import type {
  CompiledDocument,
  DocumentNode,
} from '../../core/document-types'
import { validateKatexSource } from '../../security/renderer-security'
import { renderKatexToHtml } from './katex-engine'

export function validateArticleKatexDocument(
  document: CompiledDocument,
): readonly DocumentDiagnostic[] {
  const diagnostics: DocumentDiagnostic[] = []
  const stack: DocumentNode[] = [document.root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (
      node.type === 'math' &&
      validateKatexSource(node.value) === undefined
    ) {
      const result = renderKatexToHtml(node.value, node.display)
      if (!result.ok) {
        diagnostics.push(
          createDocumentDiagnostic('DOC-RENDER-003', {
            articleSlug: document.articleSlug,
            nodeId: node.nodeId,
            sourceRange: node.sourceRange,
            message: result.message,
          }),
        )
      }
    }
    if ('children' in node) stack.push(...node.children)
  }
  return Object.freeze(diagnostics)
}
