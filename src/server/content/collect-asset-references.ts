import 'server-only'

import {
  compileDocument,
  type DocumentNode,
  type RegisteredComponentNode,
} from '../../features/doc-engine/core'
import { BUILTIN_RENDERER_REGISTRY } from '../../features/doc-engine/registry'
import type { Post } from './read-post'
import type { FrontmatterDiagnostic, SourceRange } from './validate-frontmatter'

export type AssetReference = {
  articleSlug: string
  nodeId: string
  nodeName: string
  attribute: string
  relativePath: string
  sourceRange: SourceRange
  componentRenderer?: string
}

export async function collectAssetReferences(post: Post) {
  const references: AssetReference[] = []
  const componentIds: Array<{
    id: string
    nodeName: string
    sourceRange: SourceRange
  }> = []
  const diagnostics: FrontmatterDiagnostic[] = []

  if (post.frontmatter.cover && !isExternalUrl(post.frontmatter.cover)) {
    const cover = post.frontmatter.cover
    const offset = locateFrontmatterValue(post.source, 'cover', cover)
    references.push({
      articleSlug: post.slug,
      nodeId: 'frontmatter-cover',
      nodeName: 'image',
      attribute: 'src',
      relativePath: cover,
      sourceRange: rangeFromOffsets(post.source, offset, offset + cover.length),
    })
  }

  const { document, diagnostics: compilerDiagnostics } = await compileDocument({
    articleSlug: post.slug,
    assetManifest: [],
    frontmatter: post.frontmatter,
    source: post.source,
  })
  for (const diagnostic of compilerDiagnostics) {
    if (diagnostic.severity !== 'error' || !diagnostic.sourceRange) continue
    diagnostics.push({
      code: diagnostic.code,
      severity: 'error',
      message: diagnostic.message,
      articleSlug: diagnostic.articleSlug,
      nodeId: diagnostic.nodeId,
      sourceRange: diagnostic.sourceRange,
    })
  }
  walkDocument(document.root, (node) => {
    if (node.type === 'image' && !isExternalUrl(node.src)) {
      references.push({
        articleSlug: post.slug,
        nodeId: node.nodeId,
        nodeName: 'image',
        attribute: 'src',
        relativePath: node.src,
        sourceRange: node.srcSourceRange ?? node.sourceRange,
      })
      return
    }
    if (node.type !== 'registeredComponent') return

    componentIds.push({
      id: node.componentId,
      nodeName: node.name,
      sourceRange: node.sourceRange,
    })
    const definition = BUILTIN_RENDERER_REGISTRY.get(node.name)
    if (!definition) return
    if (!definition.schema.safeParse(node.attributes).success) {
      diagnostics.push({
        code: 'DOC-REGISTRY-002',
        severity: 'error',
        message: `${node.name} renderer 属性未通过 schema。`,
        articleSlug: post.slug,
        nodeId: node.nodeId,
        sourceRange: node.sourceRange,
      })
      return
    }
    for (const asset of definition.collectAssets(node)) {
      if (asset.kind !== 'local') continue
      references.push({
        articleSlug: post.slug,
        nodeId: node.componentId,
        nodeName: node.name,
        attribute:
          asset.attribute ?? inferAssetAttribute(node, asset.source),
        relativePath: asset.source,
        sourceRange:
          node.attributeSourceRanges?.[asset.attribute ?? ''] ??
          node.sourceRange,
        ...(node.name === 'canvas-render' &&
        typeof node.attributes.renderer === 'string'
          ? { componentRenderer: node.attributes.renderer }
          : {}),
      })
    }
  })

  return { references, componentIds, diagnostics }
}

function inferAssetAttribute(
  node: RegisteredComponentNode,
  source: string,
): string {
  for (const name of ['src', 'poster', 'data-src']) {
    if (node.attributes[name] === source) return name
  }
  return 'src'
}

function walkDocument(node: DocumentNode, visitor: (node: DocumentNode) => void) {
  visitor(node)
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) walkDocument(child, visitor)
  }
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
