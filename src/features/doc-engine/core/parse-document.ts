import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

export type MarkdownPosition = {
  start: { line: number; column: number; offset?: number }
  end: { line: number; column: number; offset?: number }
}

export type MarkdownNode = {
  type: string
  position?: MarkdownPosition
  children?: MarkdownNode[]
  value?: unknown
  depth?: unknown
  url?: unknown
  title?: unknown
  alt?: unknown
  lang?: unknown
  meta?: unknown
  ordered?: unknown
  start?: unknown
  checked?: unknown
  align?: unknown
  identifier?: unknown
  referenceType?: unknown
  sourceOffsetMap?: readonly number[]
}

export function parseDocument(source: string): MarkdownNode {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm)
    .use(remarkMath)
    .parse(source) as MarkdownNode
}
