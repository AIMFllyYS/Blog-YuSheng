'use client'

import { useEffect, useRef, useState } from 'react'

import type { RegisteredComponentNode } from '../../core'
import { getCanvasRendererRegistration } from '../../registry/canvas-renderer-registry'
import {
  CANVAS_SECURITY_POLICY,
  validateCanvasRequest,
} from '../../security/renderer-security'
import { DocumentFallbackCard } from '../../screen/fallback-card'
type State =
  | { readonly status: 'waiting' | 'loading' }
  | { readonly status: 'ready'; readonly data: unknown }
  | { readonly status: 'failed'; readonly message: string }

export function CanvasScreenRenderer({
  node,
  dataUrl,
  showDetails,
  developmentCrash,
}: {
  readonly node: RegisteredComponentNode
  readonly dataUrl?: string
  readonly showDetails: boolean
  readonly developmentCrash?: boolean
}) {
  const cardRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [state, setState] = useState<State>({ status: 'waiting' })
  const width = numberAttribute(node, 'width') ?? 720
  const height = numberAttribute(node, 'height') ?? 480
  const rendererKey = String(node.attributes.renderer)
  if (developmentCrash && process.env.NODE_ENV !== 'production') {
    throw new Error('用于验证 Canvas 节点级错误隔离的预期异常')
  }

  useEffect(() => {
    const card = cardRef.current
    if (!card || visible) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setVisible(true)
      observer.disconnect()
    })
    observer.observe(card)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const registration = getCanvasRendererRegistration(rendererKey)
    if (!registration || validateCanvasRequest({ width, height })) {
      queueMicrotask(() =>
        setState({
          status: 'failed',
          message: 'Canvas renderer 未注册或尺寸无效。',
        }),
      )
      return
    }
    const controller = new AbortController()
    queueMicrotask(() => {
      if (!controller.signal.aborted) setState({ status: 'loading' })
    })
    const dataPromise = dataUrl
      ? fetch(dataUrl, { signal: controller.signal }).then(async (response) => {
          if (!response.ok) throw new Error('Canvas 数据资源加载失败。')
          return response.json() as Promise<unknown>
        })
      : Promise.resolve(defaultData())
    void Promise.all([registration.load(), dataPromise])
      .then(([, raw]) => {
        if (controller.signal.aborted) return
        const parsed = registration.parseData(raw)
        if (parsed === undefined) throw new Error('Canvas 数据未通过受审 schema。')
        setState({ status: 'ready', data: parsed })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'failed',
          message: error instanceof Error ? error.message : 'Canvas 无法绘制。',
        })
      })
    return () => controller.abort()
  }, [dataUrl, height, rendererKey, visible, width])

  useEffect(() => {
    if (state.status !== 'ready' || !canvasRef.current) return
    const registration = getCanvasRendererRegistration(rendererKey)
    const deadlineAt =
      performance.now() + CANVAS_SECURITY_POLICY.maxExecutionTimeMs
    void registration
      ?.draw(canvasRef.current, state.data, zoom, deadlineAt)
      .catch(() => {
      if (canvasRef.current) {
        setState({ status: 'failed', message: 'Canvas 绘制失败。' })
      }
      })
  }, [rendererKey, state, zoom])

  if (state.status === 'failed') {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-RENDER-001"
        details={showDetails ? state.message : undefined}
        message="这个交互图暂时无法绘制。"
        nodeId={node.nodeId}
        selectable="none"
      />
    )
  }
  return (
    <figure
      className="my-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)]"
      data-block-id={node.blockId}
      data-canvas-state={state.status}
      data-node-id={node.nodeId}
      data-selectable="none"
      ref={cardRef}
    >
      <figcaption className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2 text-sm">
        <span>函数图像</span>
        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs">交互</span>
      </figcaption>
      <div className="p-4">
        <canvas
          aria-label="可交互函数图像"
          className="h-auto w-full"
          height={height}
          ref={canvasRef}
          role="img"
          width={width}
        />
        <label className="mt-3 flex items-center gap-3 text-sm">
          缩放
          <input
            aria-label="缩放函数图像"
            className="flex-1"
            disabled={state.status !== 'ready'}
            max="2"
            min="0.5"
            onChange={(event) => setZoom(Number(event.target.value))}
            step="0.1"
            type="range"
            value={zoom}
          />
        </label>
      </div>
    </figure>
  )
}

function numberAttribute(node: RegisteredComponentNode, name: string) {
  const value = node.attributes[name]
  return typeof value === 'number' ? value : undefined
}

function defaultData() {
  return {
    expression: 'sin(x)',
    domain: [-6.283, 6.283],
    range: [-1.25, 1.25],
    samples: 240,
  }
}
