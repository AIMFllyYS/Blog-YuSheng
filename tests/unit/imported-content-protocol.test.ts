import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { readPost } from '../../src/server/content'
import { IMPORTED_SOURCE_EXPECTATIONS } from '../imported-source-expectations'

const RAW_ARTICLE_HTML = /<(div|script|iframe)\b/i

describe('imported article protocol', () => {
  it('ports the HTML visual handbook through html-embed, not raw page HTML', async () => {
    const post = await readPost('from-ten-to-hundred-ai-video')
    expect(post.body).not.toMatch(RAW_ARTICLE_HTML)
    expect(post.body).toMatch(/```mermaid/)
    const embedIds = [
      'six-dimensions',
      'path-0-1-10-100',
      'crew-model',
      'cinematic-diagrams',
      'pipeline-inject',
    ]
    for (const id of embedIds) {
      expect(post.body).toContain(
        `<html-embed id="${id}" src="./embeds/${id}/index.html"`,
      )
      expect(
        existsSync(
          path.join(
            process.cwd(),
            'content/posts/from-ten-to-hundred-ai-video/embeds',
            id,
            'index.html',
          ),
        ),
      ).toBe(true)
    }
  })

  it('keeps transcript source wording and strips only protocol noise', async () => {
    const post = await readPost('july-28-ai-frontier-review')
    expect(post.body).not.toMatch(/说话人\s*\d/)
    expect(post.body).not.toMatch(RAW_ARTICLE_HTML)
    expect(post.body).toContain('```mermaid')
    expect(post.body).toContain('Hello这是第一天的正式复盘')
    expect(post.frontmatter.section).toBe('yu-reviews')
    expect(post.frontmatter.title).toBe('26-7-28 复盘 · AI方向如是状态')
    expect(post.frontmatter.draft).not.toBe(true)
  })

  it('keeps a stable source anchor and metadata contract for all 29 imports', async () => {
    for (const expected of IMPORTED_SOURCE_EXPECTATIONS) {
      const post = await readPost(expected.slug)
      expect(post.frontmatter.title, expected.slug).toBe(expected.title)
      expect(post.frontmatter.section, expected.slug).toBe(expected.section)
      expect(post.frontmatter.publishedAt, expected.slug).toBe(
        expected.publishedAt,
      )
      expect(post.body, `${expected.slug} (${expected.sourceFile})`).not.toMatch(
        /以上内容由AI生成，仅供参考|说话人\s*\d+\s+\d{1,2}:\d{2}/,
      )
      for (const anchor of expected.bodyAnchors) {
        expect(post.body, `${expected.slug} source anchor: ${anchor}`).toContain(
          anchor,
        )
      }
    }
  })
})
