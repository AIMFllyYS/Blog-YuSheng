import 'server-only'

import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Post } from './read-post'
import type { SourceRange } from './validate-frontmatter'

// Temporary M1 bridge: issue #13 must replace this single scanner with each
// registered renderer's collectAssets implementation.
const COMPONENT_PATTERN =
  /<(video-embed|audio-embed|canvas-render|svg-embed|html-embed|web-embed|choice-question|fill-blank-question)\b([\s\S]*?)(?:\/>|>)/g
const ATTRIBUTE_PATTERN =
  /([a-z][a-z\d-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

const ASSET_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  'video-embed': ['src', 'poster'],
  'audio-embed': ['src'],
  'canvas-render': ['data-src'],
  'svg-embed': ['src'],
  'html-embed': ['src'],
  'choice-question': ['data-src'],
  'fill-blank-question': ['data-src'],
  'web-embed': [],
}

export type TemporaryAssetReference = {
  articleSlug: string
  nodeId: string
  nodeName: string
  attribute: string
  relativePath: string
  sourceRange: SourceRange
}

type MarkdownNode = {
  type: string
  url?: unknown
  identifier?: unknown
  value?: unknown
  children?: MarkdownNode[]
  position?: { start?: { offset?: number }; end?: { offset?: number } }
}

export function collectTemporaryAssetReferences(post: Post) {
  const references: TemporaryAssetReference[] = []
  const componentIds: Array<{
    id: string
    nodeName: string
    sourceRange: SourceRange
  }> = []

  const cover = post.frontmatter.cover
  if (cover) {
    const coverOffset = locateFrontmatterValue(post.source, 'cover', cover)
    references.push({
      articleSlug: post.slug,
      nodeId: 'frontmatter-cover',
      nodeName: 'image',
      attribute: 'src',
      relativePath: cover,
      sourceRange: rangeFromOffsets(
        post.source,
        coverOffset,
        coverOffset + cover.length,
      ),
    })
  }

  const root = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm)
    .parse(post.source) as MarkdownNode
  const nodes: MarkdownNode[] = []
  walkMarkdown(root, (node) => nodes.push(node))
  const referencedDefinitions = new Set(
    nodes
      .filter(
        (node) =>
          node.type === 'imageReference' &&
          typeof node.identifier === 'string',
      )
      .map((node) => String(node.identifier).toLowerCase()),
  )
  const effectiveDefinitions = new Map<string, MarkdownNode>()
  for (const node of nodes) {
    if (node.type !== 'definition' || typeof node.identifier !== 'string') {
      continue
    }
    const identifier = node.identifier.toLowerCase()
    if (!effectiveDefinitions.has(identifier)) {
      effectiveDefinitions.set(identifier, node)
    }
  }

  for (const node of nodes) {
    const nodeStart = node.position?.start?.offset
    const isDirectImage = node.type === 'image'
    const isReferencedImageDefinition =
      node.type === 'definition' &&
      typeof node.identifier === 'string' &&
      referencedDefinitions.has(node.identifier.toLowerCase()) &&
      effectiveDefinitions.get(node.identifier.toLowerCase()) === node
    if (
      (isDirectImage || isReferencedImageDefinition) &&
      typeof node.url === 'string'
    ) {
      if (nodeStart === undefined || isExternalUrl(node.url)) continue
      const nodeEnd = node.position?.end?.offset ?? post.source.length
      const offset = post.source.indexOf(node.url, nodeStart)
      if (offset < nodeStart || offset >= nodeEnd) continue
      references.push({
        articleSlug: post.slug,
        nodeId: isDirectImage
          ? `markdown-image-${offset}`
          : `markdown-image-definition-${offset}`,
        nodeName: 'image',
        attribute: 'src',
        relativePath: node.url,
        sourceRange: rangeFromOffsets(
          post.source,
          offset,
          offset + node.url.length,
        ),
      })
    }
    if (
      node.type === 'html' &&
      typeof node.value === 'string' &&
      nodeStart !== undefined
    ) {
      collectComponentHtml(
        post,
        node.value,
        nodeStart,
        references,
        componentIds,
      )
    }
  }

  return { references, componentIds }
}

function collectComponentHtml(
  post: Post,
  html: string,
  baseOffset: number,
  references: TemporaryAssetReference[],
  componentIds: Array<{
    id: string
    nodeName: string
    sourceRange: SourceRange
  }>,
) {
  for (const match of html.matchAll(COMPONENT_PATTERN)) {
    if (match.index === undefined) continue
    const nodeName = match[1]
    const rawAttributes = match[2] ?? ''
    if (!nodeName) continue
    const attributes = new Map<string, { value: string; offset: number }>()
    for (const attribute of rawAttributes.matchAll(ATTRIBUTE_PATTERN)) {
      const name = attribute[1]
      const value = attribute[2] ?? attribute[3]
      if (!name || value === undefined || attribute.index === undefined) continue
      const offset =
        baseOffset +
        match.index +
        match[0].indexOf(rawAttributes) +
        attribute.index +
        attribute[0].indexOf(value, attribute[0].indexOf('=') + 1)
      attributes.set(name, { value, offset })
    }
    const id = attributes.get('id')
    const nodeId = id?.value ?? `${nodeName}-${baseOffset + match.index}`
    if (id) {
      componentIds.push({
        id: id.value,
        nodeName,
        sourceRange: rangeFromOffsets(
          post.source,
          id.offset,
          id.offset + id.value.length,
        ),
      })
    }
    for (const attributeName of ASSET_ATTRIBUTES[nodeName] ?? []) {
      const asset = attributes.get(attributeName)
      if (!asset) continue
      references.push({
        articleSlug: post.slug,
        nodeId,
        nodeName,
        attribute: attributeName,
        relativePath: asset.value,
        sourceRange: rangeFromOffsets(
          post.source,
          asset.offset,
          asset.offset + asset.value.length,
        ),
      })
    }
  }
}

function walkMarkdown(node: MarkdownNode, visitor: (node: MarkdownNode) => void) {
  visitor(node)
  for (const child of node.children ?? []) walkMarkdown(child, visitor)
}

function isExternalUrl(value: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')
}

function rangeFromOffsets(source: string, start: number, end: number): SourceRange {
  return {
    start: positionFromOffset(source, start),
    end: positionFromOffset(source, end),
  }
}

function positionFromOffset(source: string, offset: number) {
  const lines = source.slice(0, offset).split(/\r\n|\r|\n/)
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1, offset }
}

function locateFrontmatterValue(source: string, field: string, value: string) {
  const fieldOffset = source.indexOf(`${field}:`)
  const valueOffset = source.indexOf(value, Math.max(0, fieldOffset))
  return valueOffset >= 0 ? valueOffset : 0
}
