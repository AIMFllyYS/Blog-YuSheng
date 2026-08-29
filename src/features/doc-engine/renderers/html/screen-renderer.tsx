'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import type { RegisteredComponentNode } from '../../core'
import {
  EMBED_CAPABILITY_FRAGMENT_KEY,
  HTML_EMBED_READY_TIMEOUT_MS,
  HTML_EMBED_IFRAME_POLICY,
  createEmbedCapabilityNonce,
  createEmbedMessageGate,
} from '../../security/embed-iframe-policy'
import { DocumentFallbackCard } from '../../screen/fallback-card'
import { EmbedOpenLink } from '../embed-open-link'
import { useEmbedVisibility } from '../use-embed-visibility'

export function HtmlEmbedScreenRenderer({
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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const detachListenerRef = useRef<() => void>(() => undefined)
  const nonce = useSyncExternalStore(
    subscribeToClientNonce,
    () => clientNonce(node.nodeId),
    serverNonce,
  )
  const [frameHeight, setFrameHeight] = useState(height)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [rejections, setRejections] = useState(0)
  const { containerRef, visible } = useEmbedVisibility()

  useEffect(
    () => () => {
      CLIENT_NONCES.delete(node.nodeId)
    },
    [node.nodeId],
  )

  useEffect(() => {
    if (!nonce || !visible || ready || failed) return
    const timeout = window.setTimeout(
      () => setFailed(true),
      HTML_EMBED_READY_TIMEOUT_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [failed, nonce, ready, visible])

  const attachIframe = useCallback((iframe: HTMLIFrameElement | null) => {
    detachListenerRef.current()
    iframeRef.current = iframe
    if (!iframe || !nonce) return
    const expectedSource = iframe.contentWindow
    if (!expectedSource) return
    const gate = createEmbedMessageGate(expectedSource, nonce, () => {
      setRejections((value) => value + 1)
    })
    const onMessage = (event: MessageEvent<unknown>) => {
      const message = gate.accept(event)
      if (message?.type === 'ready') setReady(true)
      if (message?.type === 'resize') {
        setFrameHeight(Math.max(120, Math.min(2_000, Math.round(message.height))))
      }
    }
    window.addEventListener('message', onMessage)
    detachListenerRef.current = () => {
      window.removeEventListener('message', onMessage)
      detachListenerRef.current = () => undefined
    }
    iframe.src = appendNonceFragment(src, nonce)
  }, [nonce, src])

  if (failed) {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-ASSET-004"
        message="这个 HTML 嵌入未能完成安全握手。"
        nodeId={node.nodeId}
        selectable="none"
      >
        <div className="mb-3 flex justify-end">
          <EmbedOpenLink href={src} />
        </div>
        <div data-html-embed="fallback">
          {alternative || '无法加载交互小页，已显示安全降级内容。'}
        </div>
      </DocumentFallbackCard>
    )
  }

  return (
    <figure
      className="my-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]"
      data-block-id={node.blockId}
      data-embed-ready={ready ? 'true' : 'false'}
      data-message-rejections={rejections}
      data-node-id={node.nodeId}
      data-selectable="none"
      data-html-embed={visible ? 'sandbox' : 'waiting'}
      ref={containerRef}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-2.5 text-sm">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--ink-muted)]">
            沙箱运行
          </span>
          <EmbedOpenLink href={src} />
        </span>
      </figcaption>
      {nonce && visible ? (
        <iframe
          allow={HTML_EMBED_IFRAME_POLICY.allow}
          className="block w-full border-0 bg-white"
          height={frameHeight}
          loading={HTML_EMBED_IFRAME_POLICY.loading}
          onError={() => setFailed(true)}
          ref={attachIframe}
          referrerPolicy={HTML_EMBED_IFRAME_POLICY.referrerPolicy}
          sandbox={HTML_EMBED_IFRAME_POLICY.sandbox}
          title={title}
        />
      ) : (
        <div className="p-4 text-sm text-[var(--ink-muted)]" role="status">
          {alternative || '安全嵌入正在准备。'}
        </div>
      )}
    </figure>
  )
}

const CLIENT_NONCES = new Map<string, string>()

function subscribeToClientNonce(): () => void {
  return () => undefined
}

function clientNonce(nodeId: string): string {
  const existing = CLIENT_NONCES.get(nodeId)
  if (existing) return existing
  const nonce = createEmbedCapabilityNonce()
  CLIENT_NONCES.set(nodeId, nonce)
  return nonce
}

function serverNonce(): undefined {
  return undefined
}

function appendNonceFragment(src: string, nonce: string): string {
  const url = new URL(src, window.location.href)
  url.hash = new URLSearchParams({
    [EMBED_CAPABILITY_FRAGMENT_KEY]: nonce,
  }).toString()
  return url.toString()
}
