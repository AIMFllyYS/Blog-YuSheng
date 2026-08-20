import {
  createDocumentDiagnostic,
  type CompiledDocument,
  type DocumentDiagnostic,
  type DocumentNode,
} from '../core'
import { DISCUSSION_PROFILE } from '../profiles'
import { BUILTIN_RENDERER_REGISTRY } from '../registry/register-builtins'
import { DISCUSSION_LIMITS } from './render-limits'
import { validateKatexSource } from './katex-policy'
import { validateMermaidSource } from './mermaid-policy'
import { validateNodeRenderer } from './validate-component-use'
import { validateDocumentUrl } from './validate-url'

export type DiscussionValidationPhase = 'write' | 'read'

export function validateDiscussionDocument(
  document: CompiledDocument,
  phase: DiscussionValidationPhase,
): readonly DocumentDiagnostic[] {
  const diagnostics: DocumentDiagnostic[] = []
  const counters = {
    nodes: 0,
    formulas: 0,
    mermaid: 0,
    canvas: 0,
  }

  if (document.originalSource.length > DISCUSSION_LIMITS.maxSourceLength) {
    diagnostics.push(
      createSecurityDiagnostic(
        phase,
        document,
        document.root,
        'limit',
        `单条讨论源码不得超过 ${DISCUSSION_LIMITS.maxSourceLength} 字符。`,
      ),
    )
  }

  visit(document.root, 0)
  return diagnostics

  function visit(node: DocumentNode, containerDepth: number): void {
    counters.nodes += 1
    if (counters.nodes === DISCUSSION_LIMITS.maxDocumentNodes + 1) {
      diagnostics.push(
        createSecurityDiagnostic(
          phase,
          document,
          node,
          'limit',
          `文档节点不得超过 ${DISCUSSION_LIMITS.maxDocumentNodes} 个。`,
        ),
      )
    }

    if (!validateNodeRenderer(node, DISCUSSION_PROFILE, BUILTIN_RENDERER_REGISTRY)) {
      diagnostics.push(
        createSecurityDiagnostic(
          phase,
          document,
          node,
          'component',
          `discussion profile 不允许节点或 renderer：${node.type}.`,
        ),
      )
    }

    if (node.type === 'link' && !validateDocumentUrl(node.url)) {
      diagnostics.push(
        createSecurityDiagnostic(
          phase,
          document,
          node,
          'url',
          `discussion profile 拒绝链接：${node.url}`,
        ),
      )
    }
    if (node.type === 'math') {
      counters.formulas += 1
      const katexFailure = validateKatexSource(node.value)
      if (katexFailure) {
        diagnostics.push(
          createSecurityDiagnostic(
            phase,
            document,
            node,
            'limit',
            katexFailure,
          ),
        )
      }
      if (counters.formulas === DISCUSSION_LIMITS.maxFormulaInstances + 1) {
        diagnostics.push(
          createSecurityDiagnostic(
            phase,
            document,
            node,
            'limit',
            `单条讨论公式不得超过 ${DISCUSSION_LIMITS.maxFormulaInstances} 个。`,
          ),
        )
      }
    }
    if (node.type === 'mermaid') {
      counters.mermaid += 1
      const mermaidFailure = validateMermaidSource(node.value)
      if (mermaidFailure) {
        diagnostics.push(
          createSecurityDiagnostic(
            phase,
            document,
            node,
            'limit',
            mermaidFailure,
          ),
        )
      }
      if (counters.mermaid === DISCUSSION_LIMITS.maxMermaidInstances + 1) {
        diagnostics.push(
          createSecurityDiagnostic(
            phase,
            document,
            node,
            'limit',
            `单条讨论 Mermaid 不得超过 ${DISCUSSION_LIMITS.maxMermaidInstances} 个。`,
          ),
        )
      }
    }
    if (
      node.type === 'code' &&
      node.value.length > DISCUSSION_LIMITS.maxCodeBlockSourceLength
    ) {
      diagnostics.push(
        createSecurityDiagnostic(
          phase,
          document,
          node,
          'limit',
          `单代码块不得超过 ${DISCUSSION_LIMITS.maxCodeBlockSourceLength} 字符。`,
        ),
      )
    }
    if (node.type === 'table') {
      const columns = Math.max(
        0,
        ...node.children.map((row) => row.children.length),
      )
      if (
        node.children.length > DISCUSSION_LIMITS.maxTableRows ||
        columns > DISCUSSION_LIMITS.maxTableColumns
      ) {
        diagnostics.push(
          createSecurityDiagnostic(
            phase,
            document,
            node,
            'limit',
            `表格不得超过 ${DISCUSSION_LIMITS.maxTableRows} 行 × ${DISCUSSION_LIMITS.maxTableColumns} 列。`,
          ),
        )
      }
    }
    if (node.type === 'registeredComponent' && node.name === 'canvas-render') {
      counters.canvas += 1
      if (counters.canvas === DISCUSSION_LIMITS.maxSafeCanvasInstances + 1) {
        diagnostics.push(
          createSecurityDiagnostic(
            phase,
            document,
            node,
            'limit',
            `单条讨论安全 Canvas 不得超过 ${DISCUSSION_LIMITS.maxSafeCanvasInstances} 个。`,
          ),
        )
      }
    }

    const nextDepth =
      node.type === 'list' || node.type === 'quote'
        ? containerDepth + 1
        : containerDepth
    if (
      nextDepth > DISCUSSION_LIMITS.maxContainerNestingDepth &&
      nextDepth === containerDepth + 1
    ) {
      diagnostics.push(
        createSecurityDiagnostic(
          phase,
          document,
          node,
          'limit',
          `列表/引用嵌套不得超过 ${DISCUSSION_LIMITS.maxContainerNestingDepth} 层。`,
        ),
      )
    }
    for (const child of childrenOf(node)) visit(child, nextDepth)
  }
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

function createSecurityDiagnostic(
  phase: DiscussionValidationPhase,
  document: CompiledDocument,
  node: DocumentNode,
  kind: 'component' | 'url' | 'limit',
  message: string,
): DocumentDiagnostic {
  const code =
    phase === 'read'
      ? 'DOC-SECURITY-004'
      : kind === 'component'
        ? 'DOC-SECURITY-001'
        : kind === 'url'
          ? 'DOC-SECURITY-002'
          : 'DOC-SECURITY-003'
  return createDocumentDiagnostic(code, {
    articleSlug: document.articleSlug,
    nodeId: node.nodeId,
    sourceRange: node.sourceRange,
    message,
  })
}
