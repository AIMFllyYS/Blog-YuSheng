'use client'

import { useState } from 'react'

import type { MermaidNode } from '../../../features/doc-engine'
import { MermaidScreenRenderer } from '../../../features/doc-engine/renderers/mermaid/screen-renderer'

const SOURCES = [
  'flowchart LR\n  A[第一张图] --> B[替换]',
  'flowchart LR\n  C[第二张图] --> D[卸载]',
] as const

export function MermaidRevokeHarness() {
  const [version, setVersion] = useState<0 | 1>(0)
  const [mounted, setMounted] = useState(true)
  const source = SOURCES[version]
  const node: MermaidNode = {
    type: 'mermaid',
    nodeId: `dev-mermaid-${version}`,
    blockId: `dev-mermaid-block-${version}`,
    canonicalText: source,
    sourceText: source,
    sourceRange: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 2, column: 1, offset: source.length },
    },
    value: source,
  }
  return (
    <section className="mt-24" data-mermaid-revoke-harness>
      <div className="flex gap-3">
        <button onClick={() => setVersion(1)} type="button">
          替换图表
        </button>
        <button onClick={() => setMounted(false)} type="button">
          卸载图表
        </button>
      </div>
      {mounted ? (
        <MermaidScreenRenderer key={source} node={node} showDetails />
      ) : (
        <p>图表已卸载。</p>
      )}
    </section>
  )
}
