'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { SelectionDocumentIndex } from '@/features/doc-engine/selection'

import { mapBrowserSelection } from './dom-selection'

/**
 * Development-only probe (#37): report the canonical mapping of the current
 * browser selection inside the scoped article. Never imported by production
 * routes.
 */
export function SelectionMappingProbe({
  index,
  children,
}: {
  readonly index: SelectionDocumentIndex
  readonly children: ReactNode
}) {
  const scopeRef = useRef<HTMLDivElement>(null)
  const [report, setReport] = useState('{"status":"idle"}')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const onChange = () => {
      const scope = scopeRef.current
      const selection = document.getSelection()
      if (!scope || !selection) return
      setReport(JSON.stringify(mapBrowserSelection(selection, index, scope)))
      setRevision((value) => value + 1)
    }
    document.addEventListener('selectionchange', onChange)
    return () => document.removeEventListener('selectionchange', onChange)
  }, [index])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div ref={scopeRef} data-selection-scope>
        {children}
      </div>
      <aside className="top-4 h-fit rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] p-3 text-xs lg:sticky">
        <p className="mb-2 font-semibold text-[var(--ink)]">Selection 映射结果</p>
        <pre
          className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-all text-[var(--ink-muted)]"
          data-selection-mapping-result
          data-selection-revision={revision}
        >
          {report}
        </pre>
      </aside>
    </div>
  )
}
