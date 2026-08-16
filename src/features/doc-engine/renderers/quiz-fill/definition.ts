import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import {
  FILL_BLANK_QUESTION_DATA_SCHEMA,
  FILL_BLANK_QUESTION_SCHEMA,
} from './schema'

export const FILL_BLANK_QUESTION_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'fill-blank-question',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: FILL_BLANK_QUESTION_SCHEMA,
  compile: (attributes) => {
    const parsed = FILL_BLANK_QUESTION_SCHEMA.safeParse(attributes)
    if (!parsed.success) {
      throw new Error('fill-blank-question renderer 属性未通过 schema。')
    }
    return parsed.data
  },
  collectAssets: (node) =>
    isFillBlankQuestion(node)
      ? Object.freeze([
          {
            source: String(node.attributes['data-src']),
            kind: 'local' as const,
            attribute: 'data-src',
          },
        ])
      : [],
  renderScreen: (node) =>
    isFillBlankQuestion(node)
      ? Object.freeze({
          kind: 'browser-screen-projection',
          rendererName: 'fill-blank-question',
          nodeId: node.nodeId,
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isFillBlankQuestion(node) ? node.sourceText : fallback(node),
  renderText: (node, context) => {
    if (!isFillBlankQuestion(node)) return fallback(node)
    const data = FILL_BLANK_QUESTION_DATA_SCHEMA.safeParse(context.data)
    if (!data.success) {
      return `【填空题】题目数据：${String(node.attributes['data-src'])}`
    }
    const lines = [`【填空题】${data.data.prompt}`]
    if (context.includeAnswers) {
      lines.push(`可接受答案：${data.data.answers.join('、')}`)
      lines.push(`解析：${data.data.explanation}`)
    }
    return lines.join('\n')
  },
  renderFallback: fallback,
  security: Object.freeze({
    trustLevel: 'registered',
    allowsScript: false,
    allowsExternalResource: false,
  }),
  selectable: 'none',
})

function isFillBlankQuestion(
  node: DocumentNode,
): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === 'fill-blank-question'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'fill-blank-question',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
