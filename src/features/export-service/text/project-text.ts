import type {
  BlockNode,
  CompiledDocument,
  DocumentNode,
  InlineNode,
  ListItemNode,
  ListNode,
} from '../../doc-engine/core'
import { projectRendererNode } from '../../doc-engine/profiles/projection-policy'
import type { RendererProjectionContext } from '../../doc-engine/registry/renderer-definition'
import { BUILTIN_RENDERER_REGISTRY } from '../../doc-engine/registry/register-builtins'
import { projectPackageAssetData } from '../../doc-engine/renderers/media/asset-projection'
import type { ExportArtifact } from '../export-document'
import { encodeUtf8 } from '../markdown/body-only'

export function assembleBodyOnlyText(
  document: CompiledDocument,
  assetManifest: readonly unknown[] = document.assetManifest,
): ExportArtifact {
  return Object.freeze({
    filename: `${document.articleSlug}.txt`,
    mimeType: 'text/plain;charset=utf-8',
    bytes: encodeUtf8(projectDocumentText(document, assetManifest)),
  })
}

export function projectDocumentText(
  document: CompiledDocument,
  assetManifest: readonly unknown[] = document.assetManifest,
): string {
  const blocks = document.root.children
    .map((node) => projectBlock(node, document, assetManifest))
    .filter((block) => block.length > 0)
  const body = blocks.join('\n\n')
  return body.endsWith('\n') ? body : `${body}\n`
}

function projectBlock(
  node: BlockNode,
  document: CompiledDocument,
  manifest: readonly unknown[],
  indent = '',
): string {
  switch (node.type) {
    case 'heading':
      return `${'#'.repeat(node.depth)} ${projectInlines(node.children, document, manifest)}`
    case 'paragraph':
      return projectInlines(node.children, document, manifest)
    case 'list':
      return projectList(node, document, manifest, indent)
    case 'quote':
      return projectQuote(node, document, manifest)
    case 'table':
      return projectTable(node, document, manifest)
    case 'code':
    case 'math':
    case 'mermaid':
    case 'image':
    case 'registeredComponent':
      return projectSpecial(node, document, manifest)
    case 'footnoteDefinition': {
      const inner = node.children
        .map((child) => projectBlock(child, document, manifest))
        .filter((block) => block.length > 0)
        .join('\n\n')
      const [first = '', ...rest] = inner.split('\n')
      return [`[^${node.identifier}]: ${first}`, ...rest.map((line) => `    ${line}`)].join(
        '\n',
      )
    }
    case 'thematicBreak':
      return '---'
  }
}

function projectList(
  node: ListNode,
  document: CompiledDocument,
  manifest: readonly unknown[],
  indent: string,
): string {
  const start = node.start ?? 1
  return node.children
    .map((item, index) =>
      projectListItem(item, node.ordered, start + index, document, manifest, indent),
    )
    .join('\n')
}

function projectListItem(
  item: ListItemNode,
  ordered: boolean,
  index: number,
  document: CompiledDocument,
  manifest: readonly unknown[],
  indent: string,
): string {
  const checkbox =
    item.checked === undefined ? '' : `[${item.checked ? 'x' : ' '}] `
  const marker = ordered ? `${index}. ${checkbox}` : `- ${checkbox}`
  const childBlocks = item.children
    .map((child) => projectBlock(child, document, manifest, `${indent}  `))
    .filter((block) => block.length > 0)

  if (childBlocks.length === 0) return `${indent}${marker.trimEnd()}`
  if (item.children[0]?.type === 'list') {
    return [`${indent}${marker.trimEnd()}`, ...childBlocks].join('\n')
  }

  const [first = '', ...rest] = childBlocks
  const firstLines = first.split('\n')
  const continuation = `${indent}${' '.repeat(marker.length)}`
  return [
    `${indent}${marker}${firstLines[0] ?? ''}`,
    ...firstLines.slice(1).map((line) => `${continuation}${line}`),
    ...rest.flatMap((block) => [
      '',
      ...block.split('\n').map((line) => `${indent}  ${line}`),
    ]),
  ].join('\n')
}

function projectQuote(
  node: Extract<BlockNode, { type: 'quote' }>,
  document: CompiledDocument,
  manifest: readonly unknown[],
): string {
  const inner = node.children
    .map((child) => projectBlock(child, document, manifest))
    .filter((block) => block.length > 0)
    .join('\n\n')
  return (inner.length > 0 ? inner : '').split('\n').map((line) => `> ${line}`).join('\n')
}

function projectTable(
  node: Extract<BlockNode, { type: 'table' }>,
  document: CompiledDocument,
  manifest: readonly unknown[],
): string {
  return node.children
    .map((row) =>
      row.children
        .map((cell) => projectInlines(cell.children, document, manifest))
        .join('\t'),
    )
    .join('\n')
}

function projectInlines(
  nodes: readonly InlineNode[],
  document: CompiledDocument,
  manifest: readonly unknown[],
): string {
  return nodes.map((node) => projectInline(node, document, manifest)).join('')
}

function projectInline(
  node: InlineNode,
  document: CompiledDocument,
  manifest: readonly unknown[],
): string {
  switch (node.type) {
    case 'text':
      return node.value
    case 'emphasis':
    case 'strong':
    case 'delete':
      return projectInlines(node.children, document, manifest)
    case 'inlineCode':
      return node.value
    case 'link':
      return `${projectInlines(node.children, document, manifest)}（${node.url}）`
    case 'math':
    case 'image':
      return projectSpecial(node, document, manifest)
    case 'footnoteReference':
      return `[^${node.identifier}]`
  }
}

function projectSpecial(
  node: DocumentNode,
  document: CompiledDocument,
  manifest: readonly unknown[],
): string {
  const name = rendererNameFor(node)
  if (!name) return ''
  const definition = BUILTIN_RENDERER_REGISTRY.get(name)
  if (!definition) return ''
  return projectionText(
    projectRendererNode(definition, 'text', node, specialContext(node, document, manifest))
      .value,
  )
}

function rendererNameFor(node: DocumentNode): string | undefined {
  switch (node.type) {
    case 'code':
      return 'code'
    case 'math':
      return 'katex'
    case 'mermaid':
      return 'mermaid'
    case 'image':
      return 'image'
    case 'registeredComponent':
      return node.name
    default:
      return undefined
  }
}

function specialContext(
  node: DocumentNode,
  document: CompiledDocument,
  manifest: readonly unknown[],
): Partial<RendererProjectionContext> {
  if (node.type !== 'registeredComponent') {
    return { includeAnswers: false }
  }
  if (node.name !== 'choice-question' && node.name !== 'fill-blank-question') {
    return { includeAnswers: false }
  }
  const source =
    typeof node.attributes['data-src'] === 'string' ? node.attributes['data-src'] : ''
  return {
    includeAnswers: false,
    data: projectPackageAssetData(source, document.articleSlug, node.name, manifest),
  }
}

function projectionText(value: unknown): string {
  if (typeof value === 'string') return value
  if (
    value &&
    typeof value === 'object' &&
    'text' in value &&
    typeof (value as { text: unknown }).text === 'string'
  ) {
    return (value as { text: string }).text
  }
  return ''
}
