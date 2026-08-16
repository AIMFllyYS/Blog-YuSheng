import type { MermaidNode } from '../../core'

export function renderMermaidMarkdown(node: MermaidNode): string {
  const fence = '`'.repeat(Math.max(3, longestBacktickRun(node.value) + 1))
  return `${fence}mermaid\n${node.value}\n${fence}`
}

function longestBacktickRun(value: string): number {
  let longest = 0
  for (const match of value.matchAll(/`+/gu)) {
    longest = Math.max(longest, match[0].length)
  }
  return longest
}
