import { ARTICLE_PROFILE } from './article-profile'
import type { ScreenProfileDefinition } from './profile-definition'

/** P0 only establishes the profile and diagnostic behavior; editor UI is P2. */
export const EDITOR_PREVIEW_PROFILE: ScreenProfileDefinition = Object.freeze({
  name: 'editor-preview',
  diagnosticMode: 'inline-diagnostics',
  allowedNodeTypes: ARTICLE_PROFILE.allowedNodeTypes,
  rendererAllowlist: 'registry',
})
