import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import { SVG_EMBED_SCHEMA } from './schema'

export const SVG_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'svg-embed',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: SVG_EMBED_SCHEMA,
  compile: (attributes) => {
    const parsed = SVG_EMBED_SCHEMA.safeParse(attributes)
    if (!parsed.success) {
      throw new Error('svg-embed renderer 属性未通过 schema。')
    }
    return parsed.data
  },
  collectAssets: (node) =>
    isSvg(node)
      ? Object.freeze([
          {
            source: String(node.attributes.src),
            kind: 'local' as const,
            attribute: 'src',
          },
        ])
      : [],
  renderScreen: (node) =>
    isSvg(node)
      ? Object.freeze({
          kind: 'server-screen-projection',
          rendererName: 'svg-embed',
          nodeId: node.nodeId,
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isSvg(node) ? node.sourceText : fallback(node),
  renderText: (node) =>
    isSvg(node)
      ? `[SVG：${String(node.attributes.title ?? '')}]（${String(node.attributes.src ?? '')}）`
      : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'registered',
    allowsScript: false,
    allowsExternalResource: false,
  }),
  selectable: 'none',
})

function isSvg(node: DocumentNode): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === 'svg-embed'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'svg-embed',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
