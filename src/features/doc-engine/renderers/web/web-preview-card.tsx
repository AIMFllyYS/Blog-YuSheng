import type { ReactNode } from 'react'

import type { RegisteredComponentNode } from '../../core'
import { EmbedOpenLink } from '../embed-open-link'

export function WebEmbedPreviewCard({
  children,
  node,
  src,
  title,
}: {
  readonly children?: ReactNode
  readonly node: RegisteredComponentNode
  readonly src: string
  readonly title: string
}) {
  const domain = safeDomain(src)
  return (
    <aside
      className="my-8 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5"
      data-block-id={node.blockId}
      data-node-id={node.nodeId}
      data-selectable="none"
      data-web-embed="fallback"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          网页预览
        </p>
        <EmbedOpenLink href={src} />
      </div>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{domain}</p>
      <div className="mt-3 text-sm text-[var(--ink-muted)]">
        {children || '该网页未通过嵌入安全门，请在新窗口中打开。'}
      </div>
    </aside>
  )
}

function safeDomain(src: string): string {
  if (src.startsWith('/') && !src.startsWith('//')) return '本站'
  try {
    return new URL(src).hostname
  } catch {
    return '链接不可用'
  }
}
