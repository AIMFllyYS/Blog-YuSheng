import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry'
import { VIDEO_EMBED_SCHEMA } from './schema'

export const VIDEO_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'video-embed',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: VIDEO_EMBED_SCHEMA,
  compile: (attributes) => {
    const parsed = VIDEO_EMBED_SCHEMA.safeParse(attributes)
    if (!parsed.success) {
      throw new Error('video-embed renderer 属性未通过 schema。')
    }
    return parsed.data
  },
  collectAssets: (node) => {
    if (node.name !== 'video-embed') return []
    const src = stringAttribute(node, 'src')
    const poster = stringAttribute(node, 'poster')
    return Object.freeze([
      ...(src ? [{ source: src, kind: 'local' as const, attribute: 'src' }] : []),
      ...(poster ? [{ source: poster, kind: 'local' as const, attribute: 'poster' }] : []),
    ])
  },
  renderScreen: (node) => projection(node, 'video-embed'),
  renderMarkdown: (node) => sourceText(node, 'video-embed'),
  renderText: (node) => textProjection(node, 'video-embed', '视频'),
  renderFallback: (node) => fallback(node, 'video-embed'),
  security: Object.freeze({
    trustLevel: 'native',
    allowsScript: false,
    allowsExternalResource: true,
  }),
  selectable: 'none',
})

function projection(node: DocumentNode, name: string) {
  return isComponent(node, name)
    ? Object.freeze({
        kind: 'server-screen-projection',
        rendererName: name,
        nodeId: node.nodeId,
      })
    : fallback(node, name)
}

function sourceText(node: DocumentNode, name: string) {
  return isComponent(node, name) ? node.sourceText : fallback(node, name)
}

function textProjection(node: DocumentNode, name: string, label: string) {
  if (!isComponent(node, name)) return fallback(node, name)
  return `【${label}】${stringAttribute(node, 'title') ?? name}：${stringAttribute(node, 'src') ?? ''}`
}

function fallback(node: DocumentNode, name: string) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: name,
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}

function isComponent(
  node: DocumentNode,
  name: string,
): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === name
}

function stringAttribute(
  node: RegisteredComponentNode,
  name: string,
): string | undefined {
  const value = node.attributes[name]
  return typeof value === 'string' ? value : undefined
}
