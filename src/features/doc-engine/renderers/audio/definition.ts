import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry'
import { AUDIO_EMBED_SCHEMA } from './schema'

export const AUDIO_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'audio-embed',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: AUDIO_EMBED_SCHEMA,
  compile: (attributes) => {
    const parsed = AUDIO_EMBED_SCHEMA.safeParse(attributes)
    if (!parsed.success) {
      throw new Error('audio-embed renderer 属性未通过 schema。')
    }
    return parsed.data
  },
  collectAssets: (node) => {
    const src =
      node.name === 'audio-embed' && typeof node.attributes.src === 'string'
        ? node.attributes.src
        : undefined
    return src
      ? Object.freeze([
          { source: src, kind: 'local' as const, attribute: 'src' },
        ])
      : []
  },
  renderScreen: (node) => projection(node),
  renderMarkdown: (node) =>
    isAudio(node) ? node.sourceText : fallback(node),
  renderText: (node) =>
    isAudio(node)
      ? `【音频】${String(node.attributes.title)}：${String(node.attributes.src)}`
      : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'native',
    allowsScript: false,
    allowsExternalResource: true,
  }),
  selectable: 'none',
})

function projection(node: DocumentNode) {
  return isAudio(node)
    ? Object.freeze({
        kind: 'server-screen-projection',
        rendererName: 'audio-embed',
        nodeId: node.nodeId,
      })
    : fallback(node)
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'audio-embed',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}

function isAudio(node: DocumentNode): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === 'audio-embed'
}
