import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'

test('renders article formulas to static HTML without shipping the KaTeX runtime', async () => {
  const articleHtmlPath = path.join(
    process.cwd(),
    'out',
    'blog',
    'p0-kitchen-sink',
    'index.html',
  )
  const articleHtml = await readFile(articleHtmlPath, 'utf8')
  expect(articleHtml).toContain('data-katex-renderer="server"')
  expect(articleHtml).toContain('class="katex"')
  expect(articleHtml).toContain('<math')
  expect(articleHtml).toContain('/vendor/katex/katex.min.css')
  expect(articleHtml.match(/<h1\b/g)).toHaveLength(1)
  const blogIndexHtml = await readFile(
    path.join(process.cwd(), 'out', 'blog', 'index.html'),
    'utf8',
  )
  expect(blogIndexHtml).not.toContain('/vendor/katex/katex.min.css')
  const referencedScripts = Array.from(
    articleHtml.matchAll(/(?:src|href)="([^"?]+\.js)(?:\?[^" ]*)?"/g),
    (match) => match[1]!,
  )
  expect(referencedScripts.length).toBeGreaterThan(0)
  for (const publicPath of referencedScripts) {
    const source = await readFile(
      path.join(process.cwd(), 'out', publicPath.replace(/^\//, '')),
      'utf8',
    )
    expect(source).not.toContain('KaTeX parse error')
    expect(source).not.toContain('renderToString')
    expect(source).not.toContain('defineFunction')
    expect(source).not.toContain('公式正在安全排版')
  }
})
