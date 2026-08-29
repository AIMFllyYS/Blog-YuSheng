'use client'

import { useEffect, useState, type ReactNode } from 'react'

import type { RegisteredComponentNode } from '../../core'
import {
  HTML_EMBED_IFRAME_POLICY,
  WEB_EMBED_LOAD_TIMEOUT_MS,
} from '../../security/embed-iframe-policy'
import { EmbedOpenLink } from '../embed-open-link'
import { WebEmbedPreviewCard } from './web-preview-card'
import { useEmbedVisibility } from '../use-embed-visibility'

export function WebEmbedScreenRenderer({
  alternative,
  height,
  node,
  src,
  title,
}: {
  readonly alternative?: ReactNode
  readonly height: number
  readonly node: RegisteredComponentNode
  readonly src: string
  readonly title: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const { containerRef, visible } = useEmbedVisibility()
  useEffect(() => {
    if (!visible || loaded) return
    const timeout = window.setTimeout(
      () => setTimedOut(true),
      WEB_EMBED_LOAD_TIMEOUT_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [loaded, src, visible])
  if (timedOut && !loaded) {
    return (
      <WebEmbedPreviewCard node={node} src={src} title={title}>
        {alternative}
      </WebEmbedPreviewCard>
    )
  }
  return (
    <figure
      className="my-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]"
      data-block-id={node.blockId}
      data-node-id={node.nodeId}
      data-selectable="none"
      data-web-embed={visible ? (loaded ? 'loaded' : 'pending') : 'waiting'}
      ref={containerRef}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-2.5 text-sm">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <EmbedOpenLink href={src} />
      </figcaption>
      {visible ? (
        <iframe
          allow={HTML_EMBED_IFRAME_POLICY.allow}
          className="block w-full border-0 bg-white"
          height={height}
          loading={HTML_EMBED_IFRAME_POLICY.loading}
          onLoad={() => setLoaded(true)}
          referrerPolicy={HTML_EMBED_IFRAME_POLICY.referrerPolicy}
          sandbox={HTML_EMBED_IFRAME_POLICY.sandbox}
          src={src}
          title={title}
        />
      ) : (
        <div className="p-4 text-sm text-[var(--ink-muted)]" role="status">
          {alternative || '网页嵌入将在滚入视口后加载。'}
        </div>
      )}
    </figure>
  )
}
