'use client'

import { useRef, useState } from 'react'

import type { RegisteredComponentNode } from '../../core'
import { DocumentFallbackCard } from '../../screen/fallback-card'

type MediaPlayerProps = {
  readonly kind: 'video' | 'audio'
  readonly node: RegisteredComponentNode
  readonly poster?: string
  readonly showDetails: boolean
  readonly src: string
  readonly title: string
}

export function MediaPlayer({
  kind,
  node,
  poster,
  showDetails,
  src,
  title,
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)

  if (failed) {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-ASSET-004"
        details={showDetails ? `资源：${src}` : undefined}
        message={`${kind === 'video' ? '视频' : '音频'}暂时无法加载。`}
        nodeId={node.nodeId}
        selectable="none"
        sourceRange={showDetails ? node.sourceRange : undefined}
      >
        <p>{title}</p>
      </DocumentFallbackCard>
    )
  }

  if (kind === 'audio') {
    return (
      <figure
        className="my-6 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
        data-block-id={node.blockId}
        data-media-renderer="audio"
        data-node-id={node.nodeId}
        data-selectable="none"
      >
        <figcaption className="mb-3 font-medium text-[var(--ink)]">{title}</figcaption>
        <audio
          aria-label={title}
          className="block w-full"
          controls
          onError={() => setFailed(true)}
          preload="metadata"
          src={src}
        />
      </figure>
    )
  }

  const play = async () => {
    try {
      await videoRef.current?.play()
    } catch {
      setFailed(true)
    }
  }
  return (
    <figure
      className="my-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]"
      data-block-id={node.blockId}
      data-media-renderer="video"
      data-node-id={node.nodeId}
      data-selectable="none"
    >
      <div className="relative bg-black">
        <video
          aria-label={title}
          className="block aspect-video w-full"
          controls
          onError={() => setFailed(true)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          playsInline
          poster={poster}
          preload="metadata"
          ref={videoRef}
          src={src}
        />
        {!playing ? (
          <button
            aria-label={`播放${title}`}
            className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-black/60 text-2xl text-white transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:scale-100"
            onClick={play}
            type="button"
          >
            <span aria-hidden="true" className="translate-x-0.5">▶</span>
          </button>
        ) : null}
      </div>
      <figcaption className="border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--ink-muted)]">
        {title}
      </figcaption>
    </figure>
  )
}
