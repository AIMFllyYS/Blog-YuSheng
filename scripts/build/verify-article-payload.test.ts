import { gzipSync } from 'node:zlib'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'

const PAGE_GZIP_BUDGET = 300 * 1024
const HTML_GZIP_BUDGET = 400 * 1024

test('largest article RSC/HTML stay within the client-projection budget', async () => {
  const blogRoot = path.join(process.cwd(), 'out', 'blog')
  const slugs = (await readdir(blogRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  expect(slugs.length).toBeGreaterThan(0)

  let largestPage = { slug: '', bytes: 0, gzip: 0 }
  for (const slug of slugs) {
    const pageFile =
      (await findPageFile(path.join(blogRoot, slug))) ??
      path.join(blogRoot, slug, 'index.txt')
    const htmlFile = path.join(blogRoot, slug, 'index.html')
    try {
      await stat(pageFile)
      await stat(htmlFile)
    } catch {
      continue
    }
    const page = await readFile(pageFile)
    const html = await readFile(htmlFile)
    const pageText = page.toString('utf8')
    const pageGzip = gzipSync(page).byteLength
    const htmlGzip = gzipSync(html).byteLength

    expect(
      pageText,
      `${slug} RSC must not embed originalSource as a serialized field`,
    ).not.toContain('"originalSource":')
    expect(
      pageText,
      `${slug} RSC must not embed per-node sourceText as a serialized field`,
    ).not.toContain('"sourceText":')
    expect(pageGzip, `${slug} PAGE gzip ${pageGzip}`).toBeLessThanOrEqual(
      PAGE_GZIP_BUDGET,
    )
    expect(htmlGzip, `${slug} HTML gzip ${htmlGzip}`).toBeLessThanOrEqual(
      HTML_GZIP_BUDGET,
    )

    if (page.byteLength > largestPage.bytes) {
      largestPage = { slug, bytes: page.byteLength, gzip: pageGzip }
    }
  }

  expect(largestPage.slug).toBe('developer-vocabulary-handbook')
  expect(largestPage.gzip).toBeLessThanOrEqual(PAGE_GZIP_BUDGET)
})

async function findPageFile(articleDir: string): Promise<string | undefined> {
  const stack = [articleDir]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      if (entry.name === '__PAGE__.txt') return full
    }
  }
  return undefined
}
