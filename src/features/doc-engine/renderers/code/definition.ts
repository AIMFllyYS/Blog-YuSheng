import { z } from 'zod'

import type { CodeNode, DocumentNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import { renderCodeMarkdown } from './markdown-export'
import { renderCodeText } from './text-export'

const EMPTY_SCHEMA = z.object({}).strict()

const CODE_DEFINITION: RendererDefinition = {
  name: 'code',
  version: 1,
  allowedProfiles: Object.freeze([
    'article',
    'discussion',
    'editor-preview',
  ] as const),
  discussionCandidate: true,
  schema: EMPTY_SCHEMA,
  compile: (attributes) => EMPTY_SCHEMA.parse(attributes),
  collectAssets: () => [],
  renderScreen: (node) =>
    isCodeNode(node)
      ? Object.freeze({
          kind: 'server-screen-projection',
          nodeId: node.nodeId,
          rendererName: 'code',
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isCodeNode(node) ? renderCodeMarkdown(node) : fallback(node),
  renderText: (node) =>
    isCodeNode(node) ? renderCodeText(node) : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'native',
    allowsScript: false,
    allowsExternalResource: false,
    maxSourceLength: 8_000,
  }),
  selectable: 'text-range',
}

export const CODE_RENDERER_DEFINITION: RendererDefinition =
  Object.freeze(CODE_DEFINITION)

function isCodeNode(node: DocumentNode): node is CodeNode {
  return node.type === 'code'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'code',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
