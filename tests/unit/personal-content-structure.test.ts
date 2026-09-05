import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDocument, type MarkdownNode } from '../../src/features/doc-engine/core/parse-document'

const scope = [
  'agent-principles-and-trends', 'ai-coding-core-practice', 'ai-coding-engineering-mindset',
  'ai-deep-learning-plan', 'career-planning-course-report', 'education-in-the-ai-era',
  'from-ten-to-hundred-ai-video', 'from-using-ai-to-understanding-ai', 'hui-lao-zhi-zhi-practice',
  'july-28-ai-frontier-review', 'med-student-coding-and-health', 'october-busy-and-growth',
  'on-love-a-first-pass', 'open-models-and-watermarks', 'personal-finance-and-ai-dev',
  'september-ninth-new-self', 'when-energy-runs-low', 'when-we-talk-about-ai-coding',
]

function descendants(node: MarkdownNode): MarkdownNode[] {
  return [node, ...(node.children ?? []).flatMap(descendants)]
}

describe('article-native reading structure', () => {
  it.each(scope)('%s has real navigation and semantic lists outside iframe additions', async (slug) => {
    const source = await readFile(path.join(process.cwd(), 'content/posts', slug, 'index.md'), 'utf8')
    expect(source).not.toMatch(/^section: (yu-essays|yu-studies)$/m)
    const nodes = descendants(parseDocument(source))
    expect(nodes.filter((node) => node.type === 'heading' && typeof node.depth === 'number' && node.depth >= 2).length).toBeGreaterThan(0)
    expect(nodes.filter((node) => node.type === 'list').length).toBeGreaterThan(0)
    if (slug === 'october-busy-and-growth') {
      const list = nodes.find((node) => node.type === 'list' && node.ordered)
      expect(list?.children).toHaveLength(9)
    }
    if (slug === 'september-ninth-new-self') {
      const list = nodes.find((node) => node.type === 'list' && node.ordered)
      expect(list?.children).toHaveLength(5)
    }
    if (slug === 'career-planning-course-report') {
      expect(nodes.some((node) => node.type === 'blockquote')).toBe(true)
    }
    if (slug === 'ai-coding-core-practice') {
      expect(nodes.some((node) => node.type === 'code' && String(node.value).includes('# 角色设定'))).toBe(true)
    }
  })
})
