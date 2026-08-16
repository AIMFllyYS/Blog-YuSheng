'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { InlineImageNode, BlockImageNode } from '../core'
import { DocumentFallbackCard } from './fallback-card'

type ResourceImageProps = {
  readonly node: InlineImageNode | BlockImageNode
  readonly src: string
  readonly showDetails: boolean
}

export function ResourceImage({ node, src, showDetails }: ResourceImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [failedSrc, setFailedSrc] = useState<string>()
  const failed = failedSrc === src
  const markFailed = useCallback(() => setFailedSrc(src), [src])
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete === true && image.naturalWidth === 0) {
      queueMicrotask(markFailed)
    }
  }, [markFailed, src])
  if (failed) {
    if (node.placement === 'inline') {
      return (
        <span
          aria-label="图片资源暂时无法加载"
          className="border-b border-dashed border-[var(--line)] text-[var(--ink-muted)]"
          data-document-fallback="DOC-ASSET-004"
          data-node-id={node.nodeId}
          role="status"
          title={showDetails ? `资源：${src}` : undefined}
        >
          {node.alt || '图片暂不可用'}
          <span className="sr-only">（DOC-ASSET-004，关联 ID：{node.nodeId}）</span>
        </span>
      )
    }
    return (
      <DocumentFallbackCard
        code="DOC-ASSET-004"
        details={showDetails ? `资源：${src}` : undefined}
        message="这张图片暂时无法加载。"
        nodeId={node.nodeId}
        sourceRange={showDetails ? node.sourceRange : undefined}
      >
        {node.alt ? <p>{node.alt}</p> : null}
      </DocumentFallbackCard>
    )
  }
  return (
    // Dynamic article-package and audited HTTPS sources cannot use next/image's
    // compile-time remote host allowlist. Dimensions are still emitted when known.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={node.alt}
      className={node.placement === 'block' ? 'h-auto max-w-full' : 'inline h-[1em] w-auto align-text-bottom'}
      height={node.height}
      loading={node.placement === 'block' ? 'lazy' : 'eager'}
      onError={markFailed}
      ref={imageRef}
      src={src}
      title={node.title}
      width={node.width}
    />
  )
}
