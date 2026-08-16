import { z } from 'zod'

import type { DocumentNode, InlineMathNode, DisplayMathNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import { KATEX_SECURITY_POLICY } from '../../security/katex-policy'
import { renderKatexMarkdown } from './markdown-export'
import { renderKatexText } from './text-export'

export type MathNode = InlineMathNode | DisplayMathNode

const EMPTY_SCHEMA = z.object({}).strict()

const DEFINITION: RendererDefinition = {
  name: 'katex',
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
  renderScreen: (node, context) =>
    isMathNode(node)
      ? Object.freeze({
          kind:
            context.profile === 'discussion'
              ? 'browser-screen-projection'
              : 'server-screen-projection',
          rendererName: 'katex',
          nodeId: node.nodeId,
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isMathNode(node) ? renderKatexMarkdown(node) : fallback(node),
  renderText: (node) =>
    isMathNode(node) ? renderKatexText(node) : fallback(node),
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'native',
    allowsScript: false,
    allowsExternalResource: false,
    maxSourceLength: KATEX_SECURITY_POLICY.maxSourceLength,
    maxInstancesPerDocument: 50,
  }),
  selectable: 'whole-node',
}

export const KATEX_RENDERER_DEFINITION: RendererDefinition = Object.freeze(DEFINITION)

function isMathNode(node: DocumentNode): node is MathNode {
  return node.type === 'math'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'katex',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
