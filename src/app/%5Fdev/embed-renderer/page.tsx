import { notFound } from 'next/navigation'

import type { RegisteredComponentNode } from '@/features/doc-engine'
import { WebEmbedScreenRenderer } from '@/features/doc-engine/renderers/web/screen-renderer'

const point = Object.freeze({ line: 1, column: 1, offset: 0 })
const node: RegisteredComponentNode = Object.freeze({
  type: 'registeredComponent',
  placement: 'block',
  name: 'web-embed',
  componentId: 'timeout-web',
  attributes: Object.freeze({
    id: 'timeout-web',
    src: 'https://timeout.invalid/embed',
    title: '超时网页',
    height: 240,
  }),
  children: Object.freeze([]),
  canonicalText: '',
  blockId: 'block-timeout-web',
  nodeId: 'timeout-web',
  selectable: 'none',
  sourceRange: Object.freeze({ start: point, end: point }),
  sourceText: '<web-embed />',
})
const belowNode: RegisteredComponentNode = Object.freeze({
  ...node,
  componentId: 'below-web',
  attributes: Object.freeze({
    id: 'below-web',
    src: 'https://below.invalid/embed',
    title: '离屏网页',
    height: 240,
  }),
  blockId: 'block-below-web',
  nodeId: 'below-web',
})

export default function EmbedRendererDevelopmentPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1>Embed renderer fixture</h1>
      <WebEmbedScreenRenderer
        alternative="远端网页加载超时后的安全说明。"
        height={240}
        node={node}
        src="https://timeout.invalid/embed"
        title="超时网页"
      />
      <div aria-hidden="true" style={{ height: 50_000 }} />
      <section data-embed-fixture="below-viewport">
        <WebEmbedScreenRenderer
          alternative="离屏网页的安全说明。"
          height={240}
          node={belowNode}
          src="https://below.invalid/embed"
          title="离屏网页"
        />
      </section>
    </main>
  )
}
