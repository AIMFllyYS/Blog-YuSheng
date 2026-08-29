'use client'

import type { ReactNode } from 'react'

import type { MermaidNode, RegisteredComponentNode } from '../core'
import type { RenderProfile } from '../registry/renderer-definition'
import { ViewportImport } from './viewport-import'

const loadCanvas = () =>
  import('../renderers/canvas/screen-renderer').then(
    (module) => module.CanvasScreenRenderer,
  )

const loadMermaid = () =>
  import('../renderers/mermaid/screen-renderer').then(
    (module) => module.MermaidScreenRenderer,
  )

const loadChoice = () =>
  import('../renderers/quiz-choice/screen-renderer').then(
    (module) => module.ChoiceQuestionScreenRenderer,
  )

const loadFill = () =>
  import('../renderers/quiz-fill/screen-renderer').then(
    (module) => module.FillBlankQuestionScreenRenderer,
  )

const loadRegisteredLeaf = () =>
  import('./registered-renderer-leaf').then(
    (module) => module.RegisteredRendererLeaf,
  )

type CanvasProps = {
  readonly node: RegisteredComponentNode
  readonly data?: unknown
  readonly dataUrl?: string
  readonly showDetails: boolean
  readonly developmentCrash?: boolean
}

type MermaidProps = {
  readonly node: MermaidNode
  readonly showDetails: boolean
}

type QuizProps = {
  readonly data: unknown
  readonly node: RegisteredComponentNode
}

type RegisteredLeafProps = {
  readonly node: RegisteredComponentNode
  readonly profile: RenderProfile
  readonly showDetails: boolean
  readonly alternative?: ReactNode
  readonly developmentCrash?: boolean
}

function WaitingCard({
  nodeId,
  blockId,
  label,
  extra,
}: {
  readonly nodeId: string
  readonly blockId?: string
  readonly label: string
  readonly extra?: Record<string, string>
}) {
  return (
    <figure
      className="my-6 min-h-48 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-sm text-[var(--ink-muted)]"
      data-block-id={blockId}
      data-node-id={nodeId}
      data-selectable="none"
      {...extra}
    >
      {label}
    </figure>
  )
}

export function LazyCanvasScreenRenderer(props: CanvasProps) {
  return (
    <ViewportImport
      fallback={
        <WaitingCard
          blockId={props.node.blockId}
          extra={{ 'data-canvas-state': 'waiting' }}
          label="交互图将在滚入视口后加载。"
          nodeId={props.node.nodeId}
        />
      }
      load={loadCanvas}
      props={props}
    />
  )
}

export function LazyMermaidScreenRenderer(props: MermaidProps) {
  return (
    <ViewportImport
      fallback={
        <WaitingCard
          blockId={props.node.blockId}
          extra={{ 'data-mermaid-state': 'waiting' }}
          label="图表将在滚入视口后渲染。"
          nodeId={props.node.nodeId}
        />
      }
      load={loadMermaid}
      props={props}
    />
  )
}

export function LazyChoiceQuestionScreenRenderer(props: QuizProps) {
  return (
    <ViewportImport
      fallback={
        <WaitingCard
          blockId={props.node.blockId}
          extra={{ 'data-quiz-kind': 'choice' }}
          label="自测题将在滚入视口后加载。"
          nodeId={props.node.nodeId}
        />
      }
      load={loadChoice}
      props={props}
    />
  )
}

export function LazyFillBlankQuestionScreenRenderer(props: QuizProps) {
  return (
    <ViewportImport
      fallback={
        <WaitingCard
          blockId={props.node.blockId}
          extra={{ 'data-quiz-kind': 'fill' }}
          label="填空题将在滚入视口后加载。"
          nodeId={props.node.nodeId}
        />
      }
      load={loadFill}
      props={props}
    />
  )
}

export function LazyRegisteredRendererLeaf(props: RegisteredLeafProps) {
  return (
    <ViewportImport
      fallback={
        <div data-renderer-pending={props.node.name}>
          {props.alternative ?? props.node.canonicalText}
        </div>
      }
      load={loadRegisteredLeaf}
      props={props}
    />
  )
}
