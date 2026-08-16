import { z } from 'zod'

import type {
  BlockImageNode,
  DocumentNode,
  InlineImageNode,
} from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import { renderImageMarkdown } from './markdown-export'
import { renderImageText } from './text-export'

const EMPTY_SCHEMA = z.object({}).strict()

const DEFINITION: RendererDefinition = {
  name: 'image',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: EMPTY_SCHEMA,
  compile: (attributes) => EMPTY_SCHEMA.parse(attributes),
  collectAssets: () => [],
  renderScreen: (node) =>
    isImageNode(node)
      ? Object.freeze({
          kind: 'server-screen-projection',
          rendererName: 'image',
          nodeId: node.nodeId,
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isImageNode(node) ? renderImageMarkdown(node) : fallback(node),
  renderText: (node) =>
    isImageNode(node) ? renderImageText(node) : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'native',
    allowsScript: false,
    allowsExternalResource: true,
  }),
  selectable: 'none',
}

export const IMAGE_RENDERER_DEFINITION: RendererDefinition =
  Object.freeze(DEFINITION)

function isImageNode(
  node: DocumentNode,
): node is InlineImageNode | BlockImageNode {
  return node.type === 'image'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'image',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
