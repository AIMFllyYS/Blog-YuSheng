import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { matter } from 'vfile-matter'
import { z } from 'zod'

describe('P0 toolchain', () => {
  it('parses Chinese GFM content and validates frontmatter metadata', async () => {
    const file = await unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ['yaml'])
      .use(remarkGfm)
      .use(() => (_tree, currentFile) => {
        matter(currentFile)
      })
      .use(remarkRehype)
      .use(rehypeStringify)
      .process('---\ntitle: 中文验收\n---\n\n# 羽升\n\n- [x] 测试栈可用')

    const metadata = z
      .object({ title: z.string().min(1) })
      .parse(file.data.matter)

    expect(String(file)).toContain('<h1>羽升</h1>')
    expect(String(file)).toContain('type="checkbox"')
    expect(metadata.title).toBe('中文验收')
  })
})
