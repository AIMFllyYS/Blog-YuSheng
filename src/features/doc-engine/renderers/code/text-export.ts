import type { CodeNode } from '../../core'
import { renderCodeMarkdown } from './markdown-export'

export function renderCodeText(node: CodeNode): string {
  return renderCodeMarkdown(node)
}
