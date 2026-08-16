'use client'

import { useEffect, useRef, useState } from 'react'

import type { MermaidNode } from '../../core'
import type { DisposableBlobUrl } from '../../security/renderer-security'
import { DocumentFallbackCard } from '../../screen/fallback-card'

type MermaidScreenRendererProps = {
  readonly node: MermaidNode
  readonly showDetails: boolean
}

type MermaidState =
  | { readonly status: 'waiting' }
  | { readonly status: 'ready'; readonly image: DisposableBlobUrl }
  | { readonly status: 'failed'; readonly message: string }

export function MermaidScreenRenderer({
  node,
  showDetails,
}: MermaidScreenRendererProps) {
  const cardRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<MermaidState>({ status: 'waiting' })

  useEffect(() => {
    const card = cardRef.current
    if (!card || visible) return
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setVisible(true))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setVisible(true)
        observer.disconnect()
      },
      { threshold: 0.01 },
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    let active = true
    let ownedImage: DisposableBlobUrl | undefined
    let cancel = (): void => undefined
    void import('./sandbox-client')
      .then(({ startMermaidSandboxRender }) => {
        if (!active) return undefined
        const session = startMermaidSandboxRender(
          node.value,
          readMermaidTheme(cardRef.current),
        )
        cancel = session.cancel
        return session.result
      })
      .then((image) => {
        if (!image) return
        if (!active) {
          image.dispose()
          return
        }
        ownedImage = image
        setState({ status: 'ready', image })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: 'failed',
          message:
            error instanceof Error
              ? error.message
              : 'Mermaid 图表暂时无法渲染。',
        })
      })
    return () => {
      active = false
      cancel()
      ownedImage?.dispose()
    }
  }, [node.value, visible])

  if (state.status === 'failed') {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-RENDER-003"
        details={showDetails ? state.message : undefined}
        message="这张 Mermaid 图暂时无法渲染，已保留图表源码。"
        nodeId={node.nodeId}
        selectable="none"
        sourceRange={showDetails ? node.sourceRange : undefined}
      >
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6">
          {node.value}
        </pre>
      </DocumentFallbackCard>
    )
  }

  return (
    <figure
      className="my-6 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[0_10px_30px_var(--shadow-color)]"
      data-block-id={node.blockId}
      data-mermaid-state={state.status === 'waiting' && visible ? 'loading' : state.status}
      data-node-id={node.nodeId}
      data-selectable="none"
      ref={cardRef}
    >
      <figcaption className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 text-xs tracking-[0.08em] text-[var(--ink-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <span className="flex-1">Mermaid 图表</span>
        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[0.62rem] text-[var(--ink-faint)]">
          {state.status === 'ready' ? '已渲染' : visible ? '排版中' : '等待进入视口'}
        </span>
      </figcaption>
      <div className="grid min-h-48 place-items-center p-4">
        {state.status === 'ready' ? (
          // The sanitized SVG is isolated behind an opaque Blob image URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Mermaid 图表"
            className="h-auto max-h-[70vh] max-w-full"
            data-mermaid-renderer="browser"
            onError={() => {
              state.image.dispose()
              setState({ status: 'failed', message: 'Mermaid 图像资源加载失败。' })
            }}
            src={state.image.url}
          />
        ) : (
          <div
            aria-busy={visible ? 'true' : undefined}
            aria-label={visible ? 'Mermaid 图表正在安全排版' : 'Mermaid 图表等待进入视口'}
            className="flex w-full max-w-md flex-col gap-3"
            role="status"
          >
            <span className="h-3 w-2/5 animate-pulse rounded-full bg-[var(--line)] motion-reduce:animate-none" />
            <span className="h-20 animate-pulse rounded border border-dashed border-[var(--line)] bg-[var(--bg)] motion-reduce:animate-none" />
            <span className="ml-auto h-3 w-3/5 animate-pulse rounded-full bg-[var(--line)] motion-reduce:animate-none" />
          </div>
        )}
      </div>
    </figure>
  )
}

function readMermaidTheme(element: HTMLElement | null) {
  const styles = getComputedStyle(element ?? document.documentElement)
  const token = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback
  return Object.freeze({
    background: token('--bg-elevated', '#f7efd9'),
    primaryColor: token('--bg', '#e9dfc7'),
    primaryTextColor: token('--ink', '#211c16'),
    primaryBorderColor: token('--accent', '#794018'),
    lineColor: token('--line', '#a58d68'),
    secondaryColor: token('--highlight', '#d9bb70'),
    tertiaryColor: token('--bg-elevated', '#f7efd9'),
  })
}
