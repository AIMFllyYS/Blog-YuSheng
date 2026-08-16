import 'server-only'

import type { SourceRange } from '../../core'
import { DocumentFallbackCard } from '../../screen/fallback-card'
import type { MathNode } from './definition'
import { renderKatexToHtml } from './render-katex.server'

export function KatexScreenRenderer({
  node,
  showDetails,
}: {
  readonly node: MathNode
  readonly showDetails: boolean
}) {
  const result = renderKatexToHtml(node.value, node.display)
  if (!result.ok) {
    return (
      <FormulaFallback
        blockId={node.display ? node.blockId : undefined}
        display={node.display}
        message={result.message}
        nodeId={node.nodeId}
        sourceRange={showDetails ? node.sourceRange : undefined}
        value={node.value}
      />
    )
  }
  const common = {
    'data-node-id': node.nodeId,
    'data-selectable': 'none',
    'data-katex-renderer': 'server',
  } as const
  const stylesheet = (
    // This local stylesheet is emitted only when a formula exists. A route-level
    // CSS import would ship the complete KaTeX font stylesheet on plain pages.
    // eslint-disable-next-line @next/next/no-css-tags
    <link
      href="/vendor/katex/katex.min.css"
      precedence="katex"
      rel="stylesheet"
    />
  )
  return node.display ? (
    <>
      {stylesheet}
      <div
        {...common}
        className="my-6 max-w-full overflow-x-auto py-3 text-center text-[var(--ink)]"
        data-block-id={node.blockId}
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    </>
  ) : (
    <>
      {stylesheet}
      <span
        {...common}
        className="inline-block max-w-full align-middle text-[var(--ink)]"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    </>
  )
}

function FormulaFallback({
  blockId,
  display,
  message,
  nodeId,
  sourceRange,
  value,
}: {
  readonly blockId?: string
  readonly display: boolean
  readonly message: string
  readonly nodeId: string
  readonly sourceRange?: SourceRange
  readonly value: string
}) {
  if (!display) {
    const details = sourceRange
      ? `${message}（${sourceRange.start.line}:${sourceRange.start.column}–${sourceRange.end.line}:${sourceRange.end.column}）`
      : undefined
    return (
      <span
        aria-label="内容降级：这条公式无法排版，已保留原始 TeX。"
        className="inline rounded-sm border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--ink-muted)]"
        data-document-fallback="DOC-RENDER-003"
        data-node-id={nodeId}
        data-selectable="none"
        role="status"
        title={details}
      >
        {value}
        <span className="sr-only">（DOC-RENDER-003）</span>
      </span>
    )
  }
  return (
    <DocumentFallbackCard
      blockId={blockId}
      code="DOC-RENDER-003"
      details={sourceRange ? message : undefined}
      message="这条公式无法排版，已保留原始 TeX。"
      nodeId={nodeId}
      sourceRange={sourceRange}
      selectable="none"
    >
      <code>{value}</code>
    </DocumentFallbackCard>
  )
}
