import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('route loading uses the book boot, not a gray spinner', () => {
  it('does not keep an animate-spin fallback in the root loading file', () => {
    const source = readFileSync('src/app/loading.tsx', 'utf8')
    expect(source).not.toContain('animate-spin')
    expect(source).toContain('BookBootScreen')
  })

  it('mounts the ceremonial veil once on the blog layout', () => {
    const layout = readFileSync('src/app/blog/layout.tsx', 'utf8')
    const listPage = readFileSync('src/app/blog/page.tsx', 'utf8')
    const article = readFileSync(
      'src/features/blog-article/blog-article-placeholder.tsx',
      'utf8',
    )
    expect(layout).toContain('ReaderBootVeil')
    expect(listPage).not.toContain('ReaderBootVeil')
    expect(article).not.toContain('ReaderBootVeil')
  })
})
