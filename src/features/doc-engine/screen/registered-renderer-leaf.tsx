'use client'

import { isValidElement, useSyncExternalStore, type ReactNode } from 'react'

import type { RegisteredComponentNode } from '../core'
import { BUILTIN_RENDERER_REGISTRY, type RenderProfile } from '../registry'
import { DocumentFallbackCard } from './fallback-card'

type RegisteredRendererLeafProps = {
  readonly node: RegisteredComponentNode
  readonly profile: RenderProfile
  readonly showDetails: boolean
  readonly alternative?: ReactNode
  readonly developmentCrash?: boolean
}

export function RegisteredRendererLeaf({
  node,
  profile,
  showDetails,
  alternative,
  developmentCrash = false,
}: RegisteredRendererLeafProps) {
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot)
  if (!hydrated) {
    return (
      <div data-renderer-pending={node.name}>
        {alternative ?? node.canonicalText}
      </div>
    )
  }
  const definition = BUILTIN_RENDERER_REGISTRY.get(node.name)
  if (!definition || !definition.allowedProfiles.includes(profile)) {
    return (
      <DocumentFallbackCard
        code="DOC-REGISTRY-001"
        details={showDetails ? `renderer：${node.name}` : undefined}
        message="这个内容组件当前不可用，已跳过它的交互部分。"
        nodeId={node.nodeId}
        sourceRange={showDetails ? node.sourceRange : undefined}
      >
        {alternative}
      </DocumentFallbackCard>
    )
  }

  const activeDefinition =
    developmentCrash && process.env.NODE_ENV !== 'production'
      ? {
          ...definition,
          renderScreen: () => {
            throw new Error('用于验证节点级错误隔离的预期异常')
          },
        }
      : definition
  const rendered = activeDefinition.renderScreen(node, { profile })
  if (isRendererFallback(rendered)) {
    return (
      <DocumentFallbackCard
        code="DOC-RENDER-002"
        details={showDetails ? `renderer：${definition.name}@${definition.version}` : undefined}
        message="这个内容组件暂时无法完整显示，已提供替代内容。"
        nodeId={node.nodeId}
        sourceRange={showDetails ? node.sourceRange : undefined}
      >
        {alternative}
      </DocumentFallbackCard>
    )
  }
  return isRenderable(rendered) ? rendered : (
    <DocumentFallbackCard
      code="DOC-RENDER-002"
      details={showDetails ? `renderer ${definition.name} 返回了不可渲染结果。` : undefined}
      message="这个内容组件暂时无法完整显示，已提供替代内容。"
      nodeId={node.nodeId}
    >
      {alternative}
    </DocumentFallbackCard>
  )
}

function subscribeToHydration(): () => void {
  return () => undefined
}

function clientSnapshot(): true {
  return true
}

function serverSnapshot(): false {
  return false
}

function isRendererFallback(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'renderer-fallback'
  )
}

function isRenderable(value: unknown): value is ReactNode {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    isValidElement(value) ||
    Array.isArray(value)
  )
}
