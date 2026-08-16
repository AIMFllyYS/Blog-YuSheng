import type { DocumentNode, RegisteredComponentNode } from '../core'

export type RenderProfile = 'article' | 'discussion' | 'editor-preview'
export type ExportProjection = 'markdown' | 'text' | 'docx' | 'pdf'

export type RendererSchema = {
  readonly safeParse: (value: unknown) => {
    readonly success: boolean
    readonly data?: unknown
    readonly error?: unknown
  }
}

export type RendererCompileContext = {
  readonly profile: RenderProfile
  readonly articleSlug: string
}

export type RendererAsset = {
  readonly source: string
  readonly kind: 'local' | 'remote'
}

export type RendererProjectionContext = {
  readonly profile: RenderProfile
  readonly format?: ExportProjection
}

export type RendererProjectionResult = {
  readonly value: unknown
  readonly usedFallback: boolean
  readonly rendererName: string
}

export type RendererDefinition = {
  readonly name: string
  readonly version: number
  readonly allowedProfiles: readonly RenderProfile[]
  readonly discussionCandidate: boolean
  readonly schema: RendererSchema
  readonly compile: (
    attributes: Readonly<Record<string, unknown>>,
    context: RendererCompileContext,
  ) => unknown
  readonly collectAssets: (
    node: RegisteredComponentNode,
  ) => readonly RendererAsset[]
  readonly renderScreen: (
    node: DocumentNode,
    context: RendererProjectionContext,
  ) => unknown
  readonly renderMarkdown?: (
    node: DocumentNode,
    context: RendererProjectionContext,
  ) => unknown
  readonly renderText?: (
    node: DocumentNode,
    context: RendererProjectionContext,
  ) => unknown
  readonly renderDocx?: (
    node: DocumentNode,
    context: RendererProjectionContext,
  ) => unknown
  readonly renderPdf?: (
    node: DocumentNode,
    context: RendererProjectionContext,
  ) => unknown
  readonly renderFallback: (
    node: DocumentNode,
    context: RendererProjectionContext,
  ) => unknown
  readonly security: {
    readonly trustLevel: 'native' | 'registered' | 'sandboxed'
    readonly allowsScript: boolean
    readonly allowsExternalResource: boolean
    readonly maxSourceLength?: number
    readonly maxInstancesPerDocument?: number
  }
  readonly selectable: 'text-range' | 'whole-node' | 'none'
}
