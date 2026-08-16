import type { DocumentNode, RegisteredComponentNode } from '../core'
import type { ScreenProfileDefinition } from '../profiles'
import { profileAllowsRenderer } from '../profiles'
import type { RendererDefinition, RendererRegistry } from '../registry'

export function rendererNameForNode(node: DocumentNode): string {
  if (node.type === 'registeredComponent') return node.name
  if (node.type === 'code' || node.type === 'inlineCode') return 'code'
  if (node.type === 'math') return 'katex'
  if (node.type === 'mermaid') return 'mermaid'
  if (node.type === 'image') return 'image'
  return 'markdown'
}

export function rendererAllowedForProfile(
  definition: RendererDefinition,
  profile: ScreenProfileDefinition,
): boolean {
  if (!definition.allowedProfiles.includes(profile.name)) return false
  if (!profileAllowsRenderer(profile, definition.name)) return false
  return profile.name !== 'discussion' || definition.discussionCandidate
}

export function validateNodeRenderer(
  node: DocumentNode,
  profile: ScreenProfileDefinition,
  registry: RendererRegistry,
): boolean {
  if (!profile.allowedNodeTypes.includes(node.type)) return false
  const definition = registry.get(rendererNameForNode(node))
  if (!definition || !rendererAllowedForProfile(definition, profile)) return false
  if (node.type === 'registeredComponent') {
    return validateRegisteredComponentSchema(node, definition)
  }
  return true
}

function validateRegisteredComponentSchema(
  node: RegisteredComponentNode,
  definition: RendererDefinition,
): boolean {
  return definition.schema.safeParse(node.attributes).success
}
