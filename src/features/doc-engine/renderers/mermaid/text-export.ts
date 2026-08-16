import type { MermaidNode } from '../../core'
import { renderMermaidMarkdown } from './markdown-export'

export function renderMermaidText(node: MermaidNode): string {
  return renderMermaidMarkdown(node)
}
