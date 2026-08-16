import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry'
import { WEB_EMBED_SCHEMA } from './schema'

export const WEB_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'web-embed',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: WEB_EMBED_SCHEMA,
  compile: (attributes) => {
    const parsed = WEB_EMBED_SCHEMA.safeParse(attributes)
    if (!parsed.success) throw new Error('web-embed renderer 属性未通过 schema。')
    return parsed.data
  },
  collectAssets: () => [],
  renderScreen: (node) => projection(node),
  renderMarkdown: (node) => isWebEmbed(node) ? node.sourceText : fallback(node),
  renderText: (node) =>
    isWebEmbed(node)
      ? `【网页】${String(node.attributes.title)}：${String(node.attributes.src)}`
      : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'sandboxed',
    allowsScript: true,
    allowsExternalResource: true,
  }),
  selectable: 'none',
})

function projection(node: DocumentNode) {
  return isWebEmbed(node)
    ? Object.freeze({
        kind: 'browser-screen-projection',
        rendererName: 'web-embed',
        nodeId: node.nodeId,
      })
    : fallback(node)
}

function isWebEmbed(node: DocumentNode): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === 'web-embed'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'web-embed',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
