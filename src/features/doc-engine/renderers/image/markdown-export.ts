import type { InlineImageNode, BlockImageNode } from '../../core'

export function renderImageMarkdown(
  node: InlineImageNode | BlockImageNode,
): string {
  if (node.sourceText) return node.sourceText
  const title = node.title ? ` "${escapeTitle(node.title)}"` : ''
  return `![${escapeAlt(node.alt)}](${node.src}${title})`
}

function escapeAlt(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

function escapeTitle(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
