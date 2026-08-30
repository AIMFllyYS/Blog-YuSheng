import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('route loading uses the book boot, not a gray spinner', () => {
  it('does not keep an animate-spin fallback in the root loading file', () => {
    const source = readFileSync('src/app/loading.tsx', 'utf8')
    expect(source).not.toContain('animate-spin')
    expect(source).toContain('RouteLoading')
  })

  it('article route loading also uses RouteLoading', () => {
    const source = readFileSync('src/app/blog/[slug]/loading.tsx', 'utf8')
    expect(source).not.toContain('animate-spin')
    expect(source).toContain('RouteLoading')
  })

  it('route loading persists the book veil until Next.js replaces it', () => {
    const route = readFileSync('src/features/boot/route-loading.tsx', 'utf8')
    const veil = readFileSync('src/features/boot/boot-veil.tsx', 'utf8')
    expect(route).toContain('persist')
    expect(route).toContain('BootVeil')
    expect(veil).toContain('if (persist)')
  })

  it('does not remount a second veil inside blog pages', () => {
    const layout = readFileSync('src/app/blog/layout.tsx', 'utf8')
    const listPage = readFileSync('src/app/blog/page.tsx', 'utf8')
    const article = readFileSync(
      'src/features/blog-article/blog-article-placeholder.tsx',
      'utf8',
    )
    expect(layout).toContain('BlogFirstPaintBoot')
    expect(listPage).not.toContain('BootVeil')
    expect(listPage).not.toContain('ReaderBootVeil')
    expect(article).not.toContain('BootVeil')
    expect(article).not.toContain('ReaderBootVeil')
    expect(article).not.toContain('source={post.source}')
    expect(article).toContain('document={compiled.document}')
  })
})
