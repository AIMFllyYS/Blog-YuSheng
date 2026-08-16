'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { InlineImageNode, BlockImageNode } from '../core'
import type { ResponsiveImageSources } from '../renderers/image/manifest-projection'
import { DocumentFallbackCard } from './fallback-card'

type ResourceImageProps = {
  readonly node: InlineImageNode | BlockImageNode
  readonly sources: ResponsiveImageSources
  readonly showDetails: boolean
}

export function ResourceImage({ node, sources, showDetails }: ResourceImageProps) {
  const src = sources.fallback
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
        blockId={node.blockId}
        code="DOC-ASSET-004"
        details={showDetails ? `资源：${src}` : undefined}
        message="这张图片暂时无法加载。"
        nodeId={node.nodeId}
        selectable="none"
        sourceRange={showDetails ? node.sourceRange : undefined}
      >
        {node.alt ? <p>{node.alt}</p> : null}
      </DocumentFallbackCard>
    )
  }
  const image = (
    <picture>
      {sources.avifSrcSet ? (
        <source
          sizes={sources.sizes}
          srcSet={sources.avifSrcSet}
          type="image/avif"
        />
      ) : null}
      {sources.webpSrcSet ? (
        <source
          sizes={sources.sizes}
          srcSet={sources.webpSrcSet}
          type="image/webp"
        />
      ) : null}
      {/* Dynamic package and audited HTTPS sources cannot use next/image's host allowlist. */}
      <img
        alt={node.alt}
        className={node.placement === 'block' ? 'block h-auto w-full' : 'inline h-[1em] w-auto align-text-bottom'}
        height={node.height}
        loading={node.placement === 'block' ? 'lazy' : 'eager'}
        onError={markFailed}
        ref={imageRef}
        src={src}
        title={node.title}
        width={node.width}
      />
    </picture>
  )
  if (node.placement === 'inline') {
    return (
      <span data-node-id={node.nodeId} data-selectable="none">
        {image}
      </span>
    )
  }
  return (
    <figure
      className="my-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]"
      data-block-id={node.blockId}
      data-image-renderer="responsive"
      data-node-id={node.nodeId}
      data-selectable="none"
    >
      {image}
      {node.title ? (
        <figcaption className="border-t border-[var(--line)] px-4 py-2.5 text-center text-sm text-[var(--ink-muted)]">
          {node.title}
        </figcaption>
      ) : null}
    </figure>
  )
}
