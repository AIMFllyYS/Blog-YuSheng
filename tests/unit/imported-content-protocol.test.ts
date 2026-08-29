import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { readPost } from '../../src/server/content'

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

  it('polishes a transcript post and keeps a protocol visual', async () => {
    const post = await readPost('july-28-ai-frontier-review')
    expect(post.body).not.toMatch(/说话人\s*\d/)
    expect(post.body).not.toMatch(RAW_ARTICLE_HTML)
    expect(post.body).toContain('```mermaid')
    expect(post.frontmatter.section).toBe('yu-reviews')
    expect(post.frontmatter.draft).not.toBe(true)
  })
})
