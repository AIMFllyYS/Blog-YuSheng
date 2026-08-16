'use client'

import { useEffect, useState } from 'react'

import { DocumentFallbackCard } from '../../screen/fallback-card'
import { KATEX_SECURITY_POLICY } from '../../security/katex-policy'
import type { MathNode } from './definition'

type ClientRenderState =
  | { readonly kind: 'pending' }
  | { readonly kind: 'success'; readonly html: string }
  | { readonly kind: 'failure'; readonly message: string }

export function KatexDiscussionRenderer({ node }: { readonly node: MathNode }) {
  const [state, setState] = useState<ClientRenderState>({ kind: 'pending' })
  useEffect(() => {
    let active = true
    let settled = false
    const finish = (nextState: ClientRenderState) => {
      if (!active || settled) return
      settled = true
      window.clearTimeout(timeoutId)
      setState(nextState)
    }
    const timeoutId = window.setTimeout(() => {
      finish({
        kind: 'failure',
        message: 'KaTeX 浏览器运行时加载超时。',
      })
    }, KATEX_SECURITY_POLICY.clientLoadTimeoutMs)
    void import('./katex-engine').then(
      ({ renderKatexToHtml }) => {
        const result = renderKatexToHtml(node.value, node.display)
        finish(
          result.ok
            ? { kind: 'success', html: result.html }
            : { kind: 'failure', message: result.message },
        )
      },
      (error: unknown) => {
        finish({
          kind: 'failure',
          message:
            error instanceof Error
              ? error.message
              : 'KaTeX 浏览器运行时无法加载。',
        })
      },
    )
    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [node.display, node.value])

  if (state.kind === 'failure' && node.display) {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-RENDER-003"
        details={process.env.NODE_ENV !== 'production' ? state.message : undefined}
        message="这条公式无法排版，已保留原始 TeX。"
        nodeId={node.nodeId}
        selectable="none"
      >
        <code>{node.value}</code>
      </DocumentFallbackCard>
    )
  }
  if (state.kind !== 'success') {
    const Element = node.display ? 'div' : 'span'
    return (
      <Element
        aria-busy={state.kind === 'pending'}
        aria-label={
          state.kind === 'pending'
            ? '公式正在安全排版'
            : '内容降级：这条公式无法排版，已保留原始 TeX。'
        }
        className={
          node.display
            ? 'my-6 block max-w-full overflow-x-auto border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 text-center font-mono text-[0.92em] text-[var(--ink-muted)]'
            : 'inline rounded-sm border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--ink-muted)]'
        }
        data-document-fallback={
          state.kind === 'failure' ? 'DOC-RENDER-003' : undefined
        }
        data-block-id={node.display ? node.blockId : undefined}
        data-node-id={node.nodeId}
        data-selectable="none"
        role="status"
        title={
          state.kind === 'failure' && process.env.NODE_ENV !== 'production'
            ? state.message
            : undefined
        }
      >
        {node.value}
      </Element>
    )
  }

  const common = {
    'data-node-id': node.nodeId,
    'data-selectable': 'none',
    'data-katex-renderer': 'browser',
  } as const
  const stylesheet = (
    // The discussion panel pays for KaTeX only after this client leaf mounts.
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
        dangerouslySetInnerHTML={{ __html: state.html }}
      />
    </>
  ) : (
    <>
      {stylesheet}
      <span
        {...common}
        className="inline-block max-w-full align-middle text-[var(--ink)]"
        dangerouslySetInnerHTML={{ __html: state.html }}
      />
    </>
  )
}
