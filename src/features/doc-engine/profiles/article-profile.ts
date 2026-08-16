import type { DocumentNodeType } from '../core'
import type { ScreenProfileDefinition } from './profile-definition'

const ARTICLE_NODE_TYPES = Object.freeze<DocumentNodeType[]>([
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
  'image',
  'registeredComponent',
  'footnoteReference',
  'footnoteDefinition',
  'thematicBreak',
])

export const ARTICLE_PROFILE: ScreenProfileDefinition = Object.freeze({
  name: 'article',
  diagnosticMode: 'build',
  allowedNodeTypes: ARTICLE_NODE_TYPES,
  rendererAllowlist: 'registry',
})
