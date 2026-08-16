import type { DocumentNodeType } from '../core'
import type { ScreenProfileDefinition } from './profile-definition'

export const DISCUSSION_RENDERER_ALLOWLIST = Object.freeze([
  'markdown',
  'code',
  'katex',
  'mermaid',
])

export const DISCUSSION_ALLOWED_NODE_TYPES = Object.freeze<DocumentNodeType[]>([
  'root',
  'heading',
  'paragraph',
  'text',
  'emphasis',
  'strong',
  'delete',
  'link',
  'list',
  'listItem',
  'quote',
  'table',
  'tableRow',
  'tableCell',
  'inlineCode',
  'code',
  'math',
  'mermaid',
  'footnoteReference',
  'footnoteDefinition',
  'thematicBreak',
])

export const DISCUSSION_PROFILE: ScreenProfileDefinition = Object.freeze({
  name: 'discussion',
  diagnosticMode: 'reject-entry',
  allowedNodeTypes: DISCUSSION_ALLOWED_NODE_TYPES,
  rendererAllowlist: DISCUSSION_RENDERER_ALLOWLIST,
})
