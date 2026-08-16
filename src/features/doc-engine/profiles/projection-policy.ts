import type { DocumentNode } from '../core'
import type {
  ExportProjection,
  RendererDefinition,
  RendererProjectionContext,
  RendererProjectionResult,
} from '../registry'

const PROJECTION_FIELDS = {
  markdown: 'renderMarkdown',
  text: 'renderText',
  docx: 'renderDocx',
  pdf: 'renderPdf',
} as const satisfies Record<ExportProjection, keyof RendererDefinition>

export function projectRendererNode(
  definition: RendererDefinition,
  format: ExportProjection,
  node: DocumentNode,
): RendererProjectionResult {
  const context: RendererProjectionContext = {
    profile: 'article',
    format,
  }
  const projection = definition[PROJECTION_FIELDS[format]]
  if (typeof projection === 'function') {
    return {
      value: projection(node, context),
      usedFallback: false,
      rendererName: definition.name,
    }
  }
  return {
    value: definition.renderFallback(node, context),
    usedFallback: true,
    rendererName: definition.name,
  }
}
