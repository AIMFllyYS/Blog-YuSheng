import type { InlineImageNode, BlockImageNode } from '../../core'

export function renderImageText(node: InlineImageNode | BlockImageNode): string {
  return `[图片：${node.alt}]（${node.src}）`
}
