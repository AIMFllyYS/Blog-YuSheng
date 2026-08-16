import type { SourceRange } from './document-types'

export const DOCUMENT_DIAGNOSTIC_DEFINITIONS = {
  'DOC-PARSE-001': {
    severity: 'error',
    message: '正文不允许原始 HTML。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-PARSE-002': {
    severity: 'error',
    message: '正文包含当前协议无法识别的 Markdown 节点。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-PARSE-003': {
    severity: 'error',
    message: '自定义组件标签语法或属性类型无效。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-REGISTRY-001': {
    severity: 'error',
    message: '正文包含未注册的组件标签。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-REGISTRY-002': {
    severity: 'error',
    message: '组件包含未知或非法属性。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-REGISTRY-003': {
    severity: 'error',
    message: '组件 ID 在同一文档中重复。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-ASSET-001': {
    severity: 'error',
    message: '资源路径越出文章包。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-ASSET-002': {
    severity: 'error',
    message: '正文所需的本地资源不存在。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-META-001': {
    severity: 'warning',
    message: '可选元信息缺失，已使用安全默认值。',
    phase: 'article-build',
    disposition: 'continue-with-fallback',
  },
  'DOC-ASSET-003': {
    severity: 'warning',
    message: '远程预览不可用，已降级为普通链接。',
    phase: 'article-build',
    disposition: 'continue-with-fallback',
  },
  'DOC-SECURITY-001': {
    severity: 'error',
    message: '当前内容类型不允许使用此组件。',
    phase: 'discussion-write',
    disposition: 'reject-entry',
  },
  'DOC-SECURITY-002': {
    severity: 'error',
    message: '链接使用了不安全或不允许的地址。',
    phase: 'discussion-write',
    disposition: 'reject-entry',
  },
  'DOC-SECURITY-003': {
    severity: 'error',
    message: '内容超过当前类型的安全上限。',
    phase: 'discussion-write',
    disposition: 'reject-entry',
  },
  'DOC-SECURITY-004': {
    severity: 'error',
    message: '历史讨论内容不再符合当前安全规则。',
    phase: 'discussion-read',
    disposition: 'safe-fallback',
  },
  'DOC-SECURITY-005': {
    severity: 'error',
    message: '正文包含不安全的链接、资源或执行配置。',
    phase: 'article-build',
    disposition: 'block-build',
  },
  'DOC-SECURITY-006': {
    severity: 'warning',
    message: '网页嵌入未通过集中 allowlist，已降级为安全预览卡片。',
    phase: 'article-build',
    disposition: 'continue-with-fallback',
  },
  'DOC-ASSET-004': {
    severity: 'warning',
    message: '资源暂时不可用，当前节点已安全降级。',
    phase: 'runtime',
    disposition: 'safe-fallback',
  },
  'DOC-RENDER-001': {
    severity: 'error',
    message: '内容节点渲染失败，其他内容仍可继续阅读。',
    phase: 'runtime',
    disposition: 'safe-fallback',
  },
} as const

export type DocumentDiagnosticCode =
  keyof typeof DOCUMENT_DIAGNOSTIC_DEFINITIONS
export type ArticleBlockingDiagnosticCode =
  | 'DOC-PARSE-001'
  | 'DOC-PARSE-002'
  | 'DOC-PARSE-003'
  | 'DOC-REGISTRY-001'
  | 'DOC-REGISTRY-002'
  | 'DOC-REGISTRY-003'
  | 'DOC-ASSET-001'
  | 'DOC-ASSET-002'
  | 'DOC-SECURITY-005'
export type NonBlockingDiagnosticCode = Exclude<
  DocumentDiagnosticCode,
  ArticleBlockingDiagnosticCode
>
export type DocumentDiagnosticSeverity = 'error' | 'warning'
export type DocumentDiagnosticPhase =
  | 'article-build'
  | 'discussion-write'
  | 'discussion-read'
  | 'runtime'
export type DocumentDiagnosticDisposition =
  | 'block-build'
  | 'reject-entry'
  | 'safe-fallback'
  | 'continue-with-fallback'

export type DocumentDiagnostic = {
  readonly code: DocumentDiagnosticCode
  readonly severity: DocumentDiagnosticSeverity
  readonly message: string
  readonly phase: DocumentDiagnosticPhase
  readonly disposition: DocumentDiagnosticDisposition
  readonly buildBlocking: boolean
  readonly articleSlug: string
  readonly nodeId?: string
  readonly sourceRange?: SourceRange
}

type DiagnosticContext = {
  articleSlug: string
  nodeId?: string
  sourceRange?: SourceRange
  message?: string
}

export function createDocumentDiagnostic(
  code: ArticleBlockingDiagnosticCode,
  context: DiagnosticContext & { sourceRange: SourceRange },
): DocumentDiagnostic
export function createDocumentDiagnostic(
  code: NonBlockingDiagnosticCode,
  context: DiagnosticContext,
): DocumentDiagnostic
export function createDocumentDiagnostic(
  code: DocumentDiagnosticCode,
  context: DiagnosticContext,
): DocumentDiagnostic {
  const definition = DOCUMENT_DIAGNOSTIC_DEFINITIONS[code]
  return {
    code,
    severity: definition.severity,
    message: context.message ?? definition.message,
    phase: definition.phase,
    disposition: definition.disposition,
    buildBlocking: definition.disposition === 'block-build',
    articleSlug: context.articleSlug,
    nodeId: context.nodeId,
    sourceRange: context.sourceRange,
  }
}

export function hasBlockingDocumentErrors(
  diagnostics: readonly DocumentDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.buildBlocking)
}

export class DocumentCompilationError extends Error {
  readonly diagnostics: readonly DocumentDiagnostic[]

  constructor(diagnostics: readonly DocumentDiagnostic[]) {
    super('文档包含阻止正式构建的协议错误')
    this.name = 'DocumentCompilationError'
    this.diagnostics = diagnostics
  }
}

export function assertDocumentBuildCanContinue(
  diagnostics: readonly DocumentDiagnostic[],
): void {
  if (hasBlockingDocumentErrors(diagnostics)) {
    throw new DocumentCompilationError(diagnostics)
  }
}
