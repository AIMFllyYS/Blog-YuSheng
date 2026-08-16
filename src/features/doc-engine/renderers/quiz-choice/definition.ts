import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import {
  CHOICE_QUESTION_DATA_SCHEMA,
  CHOICE_QUESTION_RENDER_DATA_SCHEMA,
  CHOICE_QUESTION_SCHEMA,
} from './schema'

export const CHOICE_QUESTION_RENDERER_DEFINITION: RendererDefinition = Object.freeze({
  name: 'choice-question',
  version: 1,
  allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
  discussionCandidate: false,
  schema: CHOICE_QUESTION_SCHEMA,
  compile: (attributes) => {
    const parsed = CHOICE_QUESTION_SCHEMA.safeParse(attributes)
    if (!parsed.success) {
      throw new Error('choice-question renderer 属性未通过 schema。')
    }
    return parsed.data
  },
  collectAssets: (node) =>
    isChoiceQuestion(node)
      ? Object.freeze([
          {
            source: String(node.attributes['data-src']),
            kind: 'local' as const,
            attribute: 'data-src',
          },
        ])
      : [],
  renderScreen: (node) =>
    isChoiceQuestion(node)
      ? Object.freeze({
          kind: 'browser-screen-projection',
          rendererName: 'choice-question',
          nodeId: node.nodeId,
        })
      : fallback(node),
  renderMarkdown: (node) =>
    isChoiceQuestion(node) ? node.sourceText : fallback(node),
  renderText: (node, context) => {
    if (!isChoiceQuestion(node)) return fallback(node)
    const authorData = CHOICE_QUESTION_DATA_SCHEMA.safeParse(context.data)
    const data = authorData.success
      ? authorData
      : CHOICE_QUESTION_RENDER_DATA_SCHEMA.safeParse(context.data)
    if (!data.success) {
      return String(node.attributes['data-src'] ?? '')
    }
    const lines = [
      data.data.prompt,
      ...data.data.options.map((option) => `${option.id}. ${option.label}`),
    ]
    if (context.includeAnswers) {
      lines.push(`答案：${data.data.answers.join('、')}`)
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

function isChoiceQuestion(
  node: DocumentNode,
): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === 'choice-question'
}

function fallback(node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: 'choice-question',
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
