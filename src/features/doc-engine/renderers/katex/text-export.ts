import type { MathNode } from './definition'

export function renderKatexText(node: MathNode): string {
  return node.value
}
