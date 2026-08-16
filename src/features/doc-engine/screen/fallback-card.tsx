import type { DocumentDiagnosticCode, SourceRange } from '../core'

export type DocumentFallbackCardProps = {
  readonly code: DocumentDiagnosticCode
  readonly message: string
  readonly nodeId?: string
  readonly sourceRange?: SourceRange
  readonly details?: string
  readonly children?: React.ReactNode
  readonly selectable?: 'none'
  readonly blockId?: string
}

export function DocumentFallbackCard({
  code,
  message,
  nodeId,
  sourceRange,
  details,
  children,
  selectable,
  blockId,
}: DocumentFallbackCardProps) {
  const associationId = nodeId ?? 'document'
  return (
    <aside
      aria-label={`内容降级：${message}`}
      className="my-5 border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-4 text-[var(--ink-muted)] shadow-[inset_3px_0_0_var(--accent)]"
      data-document-fallback={code}
      data-block-id={blockId}
      data-node-id={associationId}
      data-selectable={selectable}
      role="status"
    >
      <p className="m-0 text-sm leading-7">{message}</p>
      {children ? (
        <div className="mt-3 border-t border-[var(--line)] pt-3">{children}</div>
      ) : null}
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] tracking-[0.12em] text-[var(--ink-faint)]">
        <span>{code}</span>
        <span>关联 ID：{associationId}</span>
      </p>
      {details ? (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap border-t border-[var(--line)] pt-3 text-xs leading-6 text-[var(--ink-faint)]">
          {details}
          {sourceRange
            ? `\n源位置：${sourceRange.start.line}:${sourceRange.start.column}–${sourceRange.end.line}:${sourceRange.end.column}`
            : ''}
        </pre>
      ) : null}
    </aside>
  )
}
