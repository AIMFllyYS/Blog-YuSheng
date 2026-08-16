import type { CodeNode } from '../../core'

export function renderCodeMarkdown(node: CodeNode): string {
  const language = safeInfoString(node.language)
  const marker = language.includes('`') ? '~' : '`'
  const fence = marker.repeat(
    Math.max(3, longestMarkerRun(node.value, marker) + 1),
  )
  return `${fence}${language}\n${node.value}\n${fence}`
}

function longestMarkerRun(value: string, marker: '`' | '~'): number {
  let longest = 0
  const pattern = marker === '`' ? /`+/gu : /~+/gu
  for (const match of value.matchAll(pattern)) {
    longest = Math.max(longest, match[0].length)
  }
  return longest
}

function safeInfoString(value?: string): string {
  const normalized = value?.trim() ?? ''
  return /[\r\n]/u.test(normalized) ? '' : normalized
}
