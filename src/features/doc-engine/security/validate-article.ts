import {
  createDocumentDiagnostic,
  type DocumentDiagnostic,
} from '../core/diagnostics'
import type {
  CompiledDocument,
  DocumentNode,
  RegisteredComponentNode,
} from '../core/document-types'
import { hasCanvasRenderer } from '../registry/canvas-renderer-registry'
import { isWebEmbedAllowed } from './security-config'
import { CANVAS_SECURITY_POLICY, validateCanvasRequest } from './canvas-policy'
import { validateKatexSource } from './katex-policy'
import { validateMermaidSource } from './mermaid-policy'
import { validateArticleLinkUrl, validateDocumentUrl } from './validate-url'
import { validatePackageRelativePath } from './validate-package-path'

export function validateArticleDocument(
  document: CompiledDocument,
): readonly DocumentDiagnostic[] {
  const diagnostics: DocumentDiagnostic[] = []
  let canvasInstances = 0
  const stack: DocumentNode[] = [document.root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.type === 'link' && !validateArticleLinkUrl(node.url)) {
      diagnostics.push(articleError(document, node, `正文拒绝链接：${node.url}`))
    }
    if (node.type === 'image' && !validImageSource(node.src)) {
      diagnostics.push(articleError(document, node, `图片地址无效：${node.src}`))
    } else if (
      node.type === 'image' &&
      node.src.startsWith('./') &&
      !manifestContainsLocalAsset(document, node.src)
    ) {
      diagnostics.push(missingAssetError(document, node, node.src))
    } else if (
      node.type === 'image' &&
      (!Number.isSafeInteger(node.width) ||
        !Number.isSafeInteger(node.height) ||
        (node.width ?? 0) <= 0 ||
        (node.height ?? 0) <= 0)
    ) {
      diagnostics.push(
        createDocumentDiagnostic('DOC-ASSET-006', {
          articleSlug: document.articleSlug,
          nodeId: node.nodeId,
          sourceRange: node.sourceRange,
          message: `图片必须由构建期资产清单提供可验证宽高：${node.src}`,
        }),
      )
    }
    if (node.type === 'image' && node.alt.trim().length === 0) {
      diagnostics.push(
        createDocumentDiagnostic('DOC-ASSET-005', {
          articleSlug: document.articleSlug,
          nodeId: node.nodeId,
          sourceRange: node.sourceRange,
          message: '图片缺少 alt 替代文本，请补充对图片内容或用途的简短说明。',
        }),
      )
    }
    if (node.type === 'math') {
      const failure = validateKatexSource(node.value)
      if (failure) diagnostics.push(articleError(document, node, failure))
    }
    if (node.type === 'mermaid') {
      const failure = validateMermaidSource(node.value)
      if (failure) diagnostics.push(articleError(document, node, failure))
    }
    if (node.type === 'registeredComponent') {
      if (node.name === 'canvas-render') {
        canvasInstances += 1
        if (canvasInstances > CANVAS_SECURITY_POLICY.maxInstancesPerDocument) {
          diagnostics.push(
            articleError(
              document,
              node,
              `单篇正文 Canvas 不得超过 ${CANVAS_SECURITY_POLICY.maxInstancesPerDocument} 个。`,
            ),
          )
        }
      }
      diagnostics.push(...validateArticleComponent(document, node))
    }
    const children = childrenOf(node)
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index])
    }
  }
  return diagnostics
}

function validateArticleComponent(
  document: CompiledDocument,
  node: RegisteredComponentNode,
): readonly DocumentDiagnostic[] {
  if (node.name === 'web-embed') {
    const source = stringAttribute(node, 'src')
    const safeSameSitePath =
      source?.startsWith('/') === true &&
      !source.startsWith('//') &&
      validateArticleLinkUrl(source)
    if (safeSameSitePath) {
      return [
        createDocumentDiagnostic('DOC-SECURITY-006', {
          articleSlug: document.articleSlug,
          nodeId: node.nodeId,
          sourceRange: node.sourceRange,
        }),
      ]
    }
    const validated = source ? validateDocumentUrl(source) : undefined
    if (source === undefined || !validated || validated.kind !== 'https') {
      return [articleError(document, node, `web-embed 地址无效：${source ?? ''}`)]
    }
    if (!isWebEmbedAllowed(source)) {
      return [
        createDocumentDiagnostic('DOC-SECURITY-006', {
          articleSlug: document.articleSlug,
          nodeId: node.nodeId,
          sourceRange: node.sourceRange,
        }),
      ]
    }
    return []
  }

  const pathAttributes = componentPathAttributes(node)
  for (const [name, value] of pathAttributes) {
    if (!validatePackageRelativePath(value)) {
      return [articleError(document, node, `${node.name} 的 ${name} 路径无效：${value}`)]
    }
    if (!manifestContainsLocalAsset(document, value)) {
      return [missingAssetError(document, node, value)]
    }
  }
  if (node.name === 'canvas-render') {
    const renderer = stringAttribute(node, 'renderer')
    if (!renderer || !hasCanvasRenderer(renderer)) {
      return [articleError(document, node, 'Canvas renderer 必须命中静态受审注册表。')]
    }
    const width = numberAttribute(node, 'width') ?? 720
    const height = numberAttribute(node, 'height') ?? 480
    const failure = validateCanvasRequest({ width, height })
    if (failure) return [articleError(document, node, failure)]
  }
  return []
}

function componentPathAttributes(
  node: RegisteredComponentNode,
): readonly (readonly [string, string])[] {
  const names =
    node.name === 'canvas-render' ||
    node.name === 'choice-question' ||
    node.name === 'fill-blank-question'
      ? ['data-src']
      : node.name === 'video-embed'
        ? ['src', 'poster']
        : ['src']
  return names.flatMap((name) => {
    const value = stringAttribute(node, name)
    return value ? ([[name, value]] as const) : []
  })
}

function validImageSource(source: string): boolean {
  if (source.startsWith('./')) return validatePackageRelativePath(source)
  return validateDocumentUrl(source)?.kind === 'https'
}

function stringAttribute(
  node: RegisteredComponentNode,
  name: string,
): string | undefined {
  const value = node.attributes[name]
  return typeof value === 'string' ? value : undefined
}

function numberAttribute(
  node: RegisteredComponentNode,
  name: string,
): number | undefined {
  const value = node.attributes[name]
  return typeof value === 'number' ? value : undefined
}

function articleError(
  document: CompiledDocument,
  node: DocumentNode,
  message: string,
): DocumentDiagnostic {
  return createDocumentDiagnostic('DOC-SECURITY-005', {
    articleSlug: document.articleSlug,
    nodeId: node.nodeId,
    sourceRange: node.sourceRange,
    message,
  })
}

function missingAssetError(
  document: CompiledDocument,
  node: DocumentNode,
  source: string,
): DocumentDiagnostic {
  return createDocumentDiagnostic('DOC-ASSET-002', {
    articleSlug: document.articleSlug,
    nodeId: node.nodeId,
    sourceRange: node.sourceRange,
    message: `正文所需的本地资源不存在：${source}`,
  })
}

function manifestContainsLocalAsset(
  document: CompiledDocument,
  source: string,
): boolean {
  let relativePath = source.slice(2)
  for (let index = 0; index < 8; index += 1) {
    const decoded = decodeURIComponent(relativePath)
    if (decoded === relativePath) break
    relativePath = decoded
  }
  relativePath = relativePath.replace(/\\/g, '/')
  const expectedOutputPath = relativePath.startsWith('embeds/')
    ? `embeds/${document.articleSlug}/${relativePath.slice('embeds/'.length)}`
    : `blog/${document.articleSlug}/${relativePath}`
  return document.assetManifest.some((item) => {
    if (!item || typeof item !== 'object') return false
    const entry = item as { articleSlug?: unknown; outputPath?: unknown }
    return (
      entry.articleSlug === document.articleSlug &&
      entry.outputPath === expectedOutputPath
    )
  })
}

function childrenOf(node: DocumentNode): readonly DocumentNode[] {
  switch (node.type) {
    case 'root':
    case 'heading':
    case 'paragraph':
    case 'emphasis':
    case 'strong':
    case 'delete':
    case 'link':
    case 'list':
    case 'listItem':
    case 'quote':
    case 'table':
    case 'tableRow':
    case 'tableCell':
    case 'registeredComponent':
    case 'footnoteDefinition':
      return node.children
    default:
      return []
  }
}
