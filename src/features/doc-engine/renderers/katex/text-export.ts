import type { MathNode } from './definition'
import { renderKatexMarkdown } from './markdown-export'

export function renderKatexText(node: MathNode): string {
  return renderKatexMarkdown(node)
}
