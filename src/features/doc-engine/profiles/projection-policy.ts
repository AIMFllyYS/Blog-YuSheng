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
  context?: Partial<RendererProjectionContext>,
): RendererProjectionResult {
  const projectionContext: RendererProjectionContext = {
    profile: context?.profile ?? 'article',
    format,
    data: context?.data,
    includeAnswers: context?.includeAnswers,
  }
  const projection = definition[PROJECTION_FIELDS[format]]
  if (typeof projection === 'function') {
    return {
      value: projection(node, projectionContext),
      usedFallback: false,
      rendererName: definition.name,
    }
  }
  return {
    value: definition.renderFallback(node, projectionContext),
    usedFallback: true,
    rendererName: definition.name,
  }
}
