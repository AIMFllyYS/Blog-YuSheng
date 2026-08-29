import { z } from 'zod'

import type { DocumentNode, MermaidNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import { MERMAID_SECURITY_POLICY } from '../../security/mermaid-policy'
import { renderMermaidMarkdown } from './markdown-export'
import { renderMermaidText } from './text-export'

const EMPTY_SCHEMA = z.object({}).strict()

const DEFINITION: RendererDefinition = {
  name: 'mermaid',
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
    isMermaidNode(node)
      ? Object.freeze({
          kind: 'browser-screen-projection',
          rendererName: 'mermaid',
          nodeId: node.nodeId,
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isMermaidNode(node) ? renderMermaidMarkdown(node) : fallback(node),
  renderText: (node) =>
    isMermaidNode(node) ? renderMermaidText(node) : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'native',
    allowsScript: false,
    allowsExternalResource: false,
    maxSourceLength: MERMAID_SECURITY_POLICY.maxTextSize,
    maxInstancesPerDocument: 3,
  }),
  selectable: 'none',
}

export const MERMAID_RENDERER_DEFINITION: RendererDefinition =
  Object.freeze(DEFINITION)

function isMermaidNode(node: DocumentNode): node is MermaidNode {
  return node.type === 'mermaid'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'mermaid',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
