import { defaultSchema, type Options as SanitizeOptions } from 'rehype-sanitize'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import {
  compileDocument,
  createDocumentDiagnostic,
  parseDocument,
  type CompiledDocument,
  type DocumentDiagnostic,
  type MarkdownNode,
  type SourceRange,
} from '../core'
import { validateDiscussionDocument } from './validate-discussion'
import { DISCUSSION_LIMITS } from './render-limits'
import { DISCUSSION_LINK_REL } from './validate-url'

type DiscussionInput = {
  readonly entryId: string
  readonly source: string
}

export type DiscussionWriteResult =
  | {
      readonly accepted: true
      readonly rawSource: string
      readonly document: CompiledDocument
      readonly diagnostics: readonly []
    }
  | {
      readonly accepted: false
      readonly diagnostics: readonly DocumentDiagnostic[]
    }

export type DiscussionReadResult =
  | {
      readonly safe: true
      readonly rawSource: string
      readonly sanitizedHtml: string
      readonly document: CompiledDocument
      readonly diagnostics: readonly []
    }
  | {
      readonly safe: false
      readonly sanitizedHtml: string
      readonly diagnostics: readonly DocumentDiagnostic[]
    }

export const DISCUSSION_SAFE_FALLBACK_HTML =
  '<p data-discussion-fallback="security">此条内容因安全规则变更暂不可显示。</p>'

export const DISCUSSION_SANITIZE_SCHEMA: SanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'rel'],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^language-[a-z\d_-]+$/i],
    ],
    p: [...(defaultSchema.attributes?.p ?? []), ['dataDiscussionFallback', 'security']],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['https', 'mailto'],
  },
  clobberPrefix: 'discussion-',
}

export async function validateDiscussionWrite(
  input: DiscussionInput,
): Promise<DiscussionWriteResult> {
  const preflight = validateDiscussionSourcePreflight(input, 'write')
  if (preflight.length > 0) return { accepted: false, diagnostics: preflight }
  const compiled = await compileDiscussion(input)
  const diagnostics = [
    ...normalizeCompilerDiagnostics(compiled.diagnostics, compiled.document, 'write'),
    ...validateDiscussionDocument(compiled.document, 'write'),
  ]
  if (diagnostics.length > 0) return { accepted: false, diagnostics }
  return {
    accepted: true,
    rawSource: input.source,
    document: compiled.document,
    diagnostics: [],
  }
}

export async function sanitizeDiscussionRead(
  input: DiscussionInput,
): Promise<DiscussionReadResult> {
  const preflight = validateDiscussionSourcePreflight(input, 'read')
  if (preflight.length > 0) {
    return {
      safe: false,
      sanitizedHtml: DISCUSSION_SAFE_FALLBACK_HTML,
      diagnostics: preflight,
    }
  }
  const compiled = await compileDiscussion(input)
  const diagnostics = [
    ...normalizeCompilerDiagnostics(compiled.diagnostics, compiled.document, 'read'),
    ...validateDiscussionDocument(compiled.document, 'read'),
  ]
  if (diagnostics.length > 0) {
    return {
      safe: false,
      sanitizedHtml: DISCUSSION_SAFE_FALLBACK_HTML,
      diagnostics,
    }
  }
  return {
    safe: true,
    rawSource: input.source,
    sanitizedHtml: await sanitizeValidatedDiscussionSource(input.source),
    document: compiled.document,
    diagnostics: [],
  }
}

async function compileDiscussion(input: DiscussionInput) {
  return compileDocument({
    articleSlug: `discussion-${normalizeEntryId(input.entryId)}`,
    source: input.source,
    frontmatter: {},
  })
}

function validateDiscussionSourcePreflight(
  input: DiscussionInput,
  phase: 'write' | 'read',
): readonly DocumentDiagnostic[] {
  if (input.source.length > DISCUSSION_LIMITS.maxSourceLength) {
    return [
      createPreflightDiagnostic(
        input,
        phase,
        fullSourceRange(input.source),
        `单条讨论源码不得超过 ${DISCUSSION_LIMITS.maxSourceLength} 字符。`,
      ),
    ]
  }

  const ast = parseDocument(input.source)
  const stack: Array<{ node: MarkdownNode; containerDepth: number }> = [
    { node: ast, containerDepth: 0 },
  ]
  let nodeCount = 0
  while (stack.length > 0) {
    const current = stack.pop()!
    nodeCount += 1
    if (nodeCount > DISCUSSION_LIMITS.maxDocumentNodes) {
      return [
        createPreflightDiagnostic(
          input,
          phase,
          rangeOfMarkdownNode(current.node, input.source),
          `文档节点不得超过 ${DISCUSSION_LIMITS.maxDocumentNodes} 个。`,
        ),
      ]
    }
    const depth =
      current.node.type === 'list' || current.node.type === 'blockquote'
        ? current.containerDepth + 1
        : current.containerDepth
    if (depth > DISCUSSION_LIMITS.maxContainerNestingDepth) {
      return [
        createPreflightDiagnostic(
          input,
          phase,
          rangeOfMarkdownNode(current.node, input.source),
          `列表/引用嵌套不得超过 ${DISCUSSION_LIMITS.maxContainerNestingDepth} 层。`,
        ),
      ]
    }
    for (let index = (current.node.children?.length ?? 0) - 1; index >= 0; index -= 1) {
      stack.push({
        node: current.node.children![index]!,
        containerDepth: depth,
      })
    }
  }
  return []
}

function createPreflightDiagnostic(
  input: DiscussionInput,
  phase: 'write' | 'read',
  sourceRange: SourceRange,
  message: string,
): DocumentDiagnostic {
  return createDocumentDiagnostic(
    phase === 'write' ? 'DOC-SECURITY-003' : 'DOC-SECURITY-004',
    {
      articleSlug: `discussion-${normalizeEntryId(input.entryId)}`,
      sourceRange,
      message,
    },
  )
}

function fullSourceRange(source: string): SourceRange {
  const lines = source.split(/\r\n|\r|\n/)
  return {
    start: { line: 1, column: 1, offset: 0 },
    end: {
      line: lines.length,
      column: (lines.at(-1)?.length ?? 0) + 1,
      offset: source.length,
    },
  }
}

function rangeOfMarkdownNode(node: MarkdownNode, source: string): SourceRange {
  const fallback = fullSourceRange(source)
  return {
    start: {
      line: node.position?.start.line ?? fallback.start.line,
      column: node.position?.start.column ?? fallback.start.column,
      offset: node.position?.start.offset ?? fallback.start.offset,
    },
    end: {
      line: node.position?.end.line ?? fallback.end.line,
      column: node.position?.end.column ?? fallback.end.column,
      offset: node.position?.end.offset ?? fallback.end.offset,
    },
  }
}

function normalizeEntryId(entryId: string): string {
  const normalized = entryId.toLowerCase().replace(/[^a-z\d-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || 'entry'
}

function normalizeCompilerDiagnostics(
  diagnostics: readonly DocumentDiagnostic[],
  document: CompiledDocument,
  phase: 'write' | 'read',
): readonly DocumentDiagnostic[] {
  return diagnostics.map((diagnostic) =>
    createDocumentDiagnostic(
      phase === 'write' ? 'DOC-SECURITY-001' : 'DOC-SECURITY-004',
      {
        articleSlug: document.articleSlug,
        nodeId: diagnostic.nodeId,
        sourceRange: diagnostic.sourceRange,
        message: diagnostic.message,
      },
    ),
  )
}

async function sanitizeValidatedDiscussionSource(source: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, {
      allowDangerousHtml: false,
      clobberPrefix: 'discussion-',
    })
    .use(hardenDiscussionLinks)
    .use(rehypeSanitize, DISCUSSION_SANITIZE_SCHEMA)
    .use(rehypeStringify)
    .process(source)
  return String(result)
}

type HastNode = {
  type?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function hardenDiscussionLinks() {
  return (tree: HastNode): void => {
    visit(tree)
  }
}

function visit(node: HastNode): void {
  if (node.type === 'element' && node.tagName === 'a') {
    node.properties = {
      ...node.properties,
      rel: [...DISCUSSION_LINK_REL],
    }
  }
  for (const child of node.children ?? []) visit(child)
}
