import type { CodeNode } from '../../core'

export function renderCodeText(node: CodeNode): string {
  return node.value
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')
}
