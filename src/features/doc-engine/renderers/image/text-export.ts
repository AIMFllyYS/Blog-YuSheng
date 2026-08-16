import type { InlineImageNode, BlockImageNode } from '../../core'

export function renderImageText(node: InlineImageNode | BlockImageNode): string {
  const description = node.alt || '未提供替代文本'
  return `【图片】${description}${node.title ? `（${node.title}）` : ''}`
}
