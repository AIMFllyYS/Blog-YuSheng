import type { DocumentNodeType } from '../core'
import type { RenderProfile } from '../registry'

export type ScreenProfileDefinition = {
  readonly name: RenderProfile
  readonly diagnosticMode: 'build' | 'reject-entry' | 'inline-diagnostics'
  readonly allowedNodeTypes: readonly DocumentNodeType[]
  readonly rendererAllowlist: readonly string[] | 'registry'
}

export function profileAllowsRenderer(
  profile: ScreenProfileDefinition,
  rendererName: string,
): boolean {
  return (
    profile.rendererAllowlist === 'registry' ||
    profile.rendererAllowlist.includes(rendererName)
  )
}
