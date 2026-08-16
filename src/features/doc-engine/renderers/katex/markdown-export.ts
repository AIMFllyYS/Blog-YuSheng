import type { MathNode } from './definition'

export function renderKatexMarkdown(node: MathNode): string {
  return node.display ? `$$\n${node.value}\n$$` : `$${node.value}$`
}
