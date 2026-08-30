import type { DocumentNode, RegisteredComponentNode } from '../../core'
import type { RendererDefinition } from '../../registry/renderer-definition'
import type { RendererSchema } from '../../registry/renderer-definition'

export function createDesignRenderer(options: {
  readonly name: string
  readonly schema: RendererSchema
  readonly selectable?: RendererDefinition['selectable']
}): RendererDefinition {
  const { name, schema, selectable = 'text-range' } = options
  return {
    name,
    version: 1,
    allowedProfiles: Object.freeze(['article', 'editor-preview'] as const),
    discussionCandidate: false,
    schema,
    compile: (attributes) => {
      const parsed = schema.safeParse(attributes)
      if (!parsed.success) throw new Error(`${name} renderer 属性未通过 schema。`)
      return parsed.data
    },
    collectAssets: (node) =>
      isNamed(node, name) && typeof node.attributes.swatch === 'string'
        ? Object.freeze([
            {
              source: './data/palette.json',
              kind: 'local' as const,
              attribute: 'swatch',
            },
          ])
        : [],
    renderScreen: (node) =>
      isNamed(node, name)
        ? Object.freeze({
            kind: 'server-screen-projection',
            rendererName: name,
            nodeId: node.nodeId,
          })
        : fallback(name, node),
    renderMarkdown: (node) => (isNamed(node, name) ? node.sourceText : fallback(name, node)),
    renderText: (node) =>
      isNamed(node, name) ? (node.canonicalText ?? '') : fallback(name, node),
    renderFallback: (node) => fallback(name, node),
    security: Object.freeze({
      trustLevel: 'native',
      allowsScript: false,
      allowsExternalResource: false,
      maxInstancesPerDocument: name === 'text-mark' ? 200 : 80,
    }),
    selectable,
  }
}

function isNamed(
  node: DocumentNode,
  name: string,
): node is RegisteredComponentNode {
  return node.type === 'registeredComponent' && node.name === name
}

function fallback(name: string, node: DocumentNode) {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: name,
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}
