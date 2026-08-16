import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import { CANVAS_SECURITY_POLICY } from '../../security/renderer-security'
import { CANVAS_RENDER_SCHEMA } from './schema'

export const CANVAS_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'canvas-render',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: CANVAS_RENDER_SCHEMA,
  compile: (attributes) => {
    const parsed = CANVAS_RENDER_SCHEMA.safeParse(attributes)
    if (!parsed.success) {
      throw new Error('canvas-render renderer 属性未通过 schema。')
    }
    return parsed.data
  },
  collectAssets: (node) =>
    node.name === 'canvas-render' &&
    typeof node.attributes['data-src'] === 'string'
      ? Object.freeze([
          {
            source: node.attributes['data-src'],
            kind: 'local' as const,
            attribute: 'data-src',
          },
        ])
      : [],
  renderScreen: (node) =>
    isCanvas(node)
      ? Object.freeze({
          kind: 'browser-screen-projection',
          rendererName: 'canvas-render',
          nodeId: node.nodeId,
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isCanvas(node) ? node.sourceText : fallback(node),
  renderText: (node) =>
    isCanvas(node)
      ? `【交互式 Canvas】${String(node.attributes.renderer)}${typeof node.attributes['data-src'] === 'string' ? `：${node.attributes['data-src']}` : ''}`
      : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'registered',
    allowsScript: true,
    allowsExternalResource: false,
    maxInstancesPerDocument: CANVAS_SECURITY_POLICY.maxInstancesPerDocument,
  }),
  selectable: 'none',
})

function isCanvas(node: DocumentNode): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === 'canvas-render'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'canvas-render',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
