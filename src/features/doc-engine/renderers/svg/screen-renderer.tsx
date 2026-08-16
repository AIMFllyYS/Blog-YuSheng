'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { RegisteredComponentNode } from '../../core'
import { DocumentFallbackCard } from '../../screen/fallback-card'

export function SvgScreenRenderer({
  node,
  showDetails,
  src,
  title,
}: {
  readonly node: RegisteredComponentNode
  readonly showDetails: boolean
  readonly src: string
  readonly title: string
}) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [failedSrc, setFailedSrc] = useState<string>()
  const markFailed = useCallback(() => setFailedSrc(src), [src])
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete === true && image.naturalWidth === 0) {
      queueMicrotask(markFailed)
    }
  }, [markFailed, src])

  if (failedSrc === src) {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-ASSET-004"
        details={showDetails ? `资源：${src}` : undefined}
        message="这张 SVG 暂时无法加载。"
        nodeId={node.nodeId}
        selectable="none"
        sourceRange={showDetails ? node.sourceRange : undefined}
      >
        <p>{title}</p>
      </DocumentFallbackCard>
    )
  }

  return (
    <figure
      className="my-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]"
      data-block-id={node.blockId}
      data-node-id={node.nodeId}
      data-selectable="none"
      data-svg-renderer="sanitized-image"
    >
      {/* Sanitized article SVG must stay an isolated resource instead of entering the parent DOM. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={title}
        className="block h-auto w-full"
        decoding="async"
        loading="lazy"
        onError={markFailed}
        ref={imageRef}
        src={src}
      />
      <figcaption className="border-t border-[var(--line)] px-4 py-2.5 text-center text-sm text-[var(--ink-muted)]">
        {title}
      </figcaption>
    </figure>
  )
}
