import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry'
import { HTML_EMBED_SCHEMA } from './schema'

export const HTML_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'html-embed',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: HTML_EMBED_SCHEMA,
  compile: (attributes) => {
    const parsed = HTML_EMBED_SCHEMA.safeParse(attributes)
    if (!parsed.success) {
      throw new Error('html-embed renderer 属性未通过 schema。')
    }
    return parsed.data
  },
  collectAssets: (node) =>
    isHtmlEmbed(node)
      ? Object.freeze([
          {
            source: String(node.attributes.src),
            kind: 'local' as const,
            attribute: 'src',
          },
        ])
      : [],
  renderScreen: (node) => projection(node, 'html-embed'),
  renderMarkdown: (node) => isHtmlEmbed(node) ? node.sourceText : fallback(node),
  renderText: (node) =>
    isHtmlEmbed(node)
      ? `【HTML 沙箱】${String(node.attributes.title)}：${String(node.attributes.src)}`
      : fallback(node),
  renderFallback: (node) => fallback(node),
  security: Object.freeze({
    trustLevel: 'sandboxed',
    allowsScript: true,
    allowsExternalResource: false,
  }),
  selectable: 'none',
})

function projection(node: DocumentNode, rendererName: string) {
  return isHtmlEmbed(node)
    ? Object.freeze({
        kind: 'browser-screen-projection',
        rendererName,
        nodeId: node.nodeId,
      })
    : fallback(node)
}

function isHtmlEmbed(node: DocumentNode): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === 'html-embed'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'html-embed',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
