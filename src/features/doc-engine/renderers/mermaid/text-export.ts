import type { MermaidNode } from '../../core'

export function renderMermaidText(node: MermaidNode): string {
  return `【Mermaid 图表源码】\n${node.value}`
}
