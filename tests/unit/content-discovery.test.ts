import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ContentBuildError,
  createBlogStaticParams,
  createPostMetadata,
  discoverPostSlugs,
  listPublishedPosts,
  readPost,
  validateArticleAssetPath,
} from '../../src/server/content'
import { IMPORTED_SLUGS } from '../imported-slugs'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })),
  )
})

describe('build-time content repository', () => {
  it('discovers and reads the official article package', async () => {
    const slugs = await discoverPostSlugs()
    const post = await readPost('p0-kitchen-sink')

    expect(slugs).toContain('p0-kitchen-sink')
    expect(post.frontmatter.title).toBe('P0 中文综合验收文章')
    expect(post.body).toContain('<web-embed')
    expect(post.packageRoot).toMatch(/content[\\/]posts[\\/]p0-kitchen-sink$/)
  })

  it('discovers every imported official post as published', async () => {
    const [slugs, published] = await Promise.all([
      discoverPostSlugs(),
      listPublishedPosts(),
    ])
    const publishedSlugs = new Set(published.map((post) => post.slug))
    for (const slug of IMPORTED_SLUGS) {
      expect(slugs).toContain(slug)
      expect(publishedSlugs.has(slug)).toBe(true)
      const post = await readPost(slug)
      expect(post.frontmatter.draft).not.toBe(true)
      expect(post.frontmatter.section).toBeDefined()
    }
  })

  it('sorts published posts and excludes valid drafts from params', async () => {
    const root = await createPostsRoot()
    await writeSections(root, 'ai-thinking')
    await writePost(
      root,
      'older-post',
      validSource('旧文章', '2026-01-01T00:00:00+08:00', false, 'ai-thinking'),
    )
    await writePost(
      root,
      'newer-post',
      validSource('新文章', '2026-02-01T00:00:00+08:00', false, 'ai-thinking'),
    )
    await writePost(
      root,
      'hidden-draft',
      validSource('草稿', '2026-03-01T00:00:00+08:00', true),
    )

    expect(await discoverPostSlugs(root)).toEqual([
      'hidden-draft',
      'newer-post',
      'older-post',
    ])
    expect((await listPublishedPosts(root)).map((post) => post.slug)).toEqual([
      'newer-post',
      'older-post',
    ])
    expect(await createBlogStaticParams(root)).toEqual([
      { slug: 'newer-post' },
      { slug: 'older-post' },
    ])
  })

  it('sorts mixed timezone offsets by their actual instant', async () => {
    const root = await createPostsRoot()
    await writeSections(root, 'ai-thinking')
    await writePost(
      root,
      'local-new-year',
      validSource(
        '本地跨年',
        '2026-01-01T00:30:00+08:00',
        false,
        'ai-thinking',
      ),
    )
    await writePost(
      root,
      'utc-later',
      validSource('实际更新', '2025-12-31T23:00:00Z', false, 'ai-thinking'),
    )

    expect((await listPublishedPosts(root)).map((post) => post.slug)).toEqual([
      'utc-later',
      'local-new-year',
    ])
  })

  it('still validates malformed drafts before filtering them', async () => {
    const root = await createPostsRoot()
    await writePost(
      root,
      'broken-draft',
      `---\nschemaVersion: 1\ndescription: 不能跳过校验\npublishedAt: 2026-03-01T00:00:00+08:00\ndraft: true\n---\n`,
    )

    await expect(listPublishedPosts(root)).rejects.toMatchObject({
      name: 'ContentBuildError',
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'FRONTMATTER_REQUIRED_FIELD_MISSING' }),
      ]),
    })
  })

  it('rejects posts whose section is not registered in sections.yml', async () => {
    const root = await createPostsRoot()
    await writeSections(root, 'ai-thinking')
    await writePost(
      root,
      'lost-post',
      validSource('迷路文章', '2026-01-01T00:00:00+08:00', false, 'nowhere'),
    )
    await writePost(
      root,
      'known-post',
      validSource('在册文章', '2026-02-01T00:00:00+08:00', false, 'ai-thinking'),
    )

    await expect(listPublishedPosts(root)).rejects.toMatchObject({
      name: 'ContentBuildError',
      diagnostics: [
        expect.objectContaining({
          code: 'FRONTMATTER_SECTION_UNKNOWN',
          articleSlug: 'lost-post',
        }),
      ],
    })
  })

  it('allows the sole published acceptance article to remain sectionless', async () => {
    const root = await createPostsRoot()
    await writeSections(root, 'ai-thinking')
    await writePost(
      root,
      'known-post',
      validSource('在册文章', '2026-01-01T00:00:00+08:00', false, 'ai-thinking'),
    )
    await writePost(
      root,
      'p0-kitchen-sink',
      validSource('散页文章', '2026-02-01T00:00:00+08:00'),
    )

    const posts = await listPublishedPosts(root)
    expect(posts.map((post) => post.slug)).toEqual([
      'p0-kitchen-sink',
      'known-post',
    ])
    expect(posts[1]?.frontmatter.section).toBe('ai-thinking')
  })

  it('rejects other published sectionless posts with a deterministic code', async () => {
    const root = await createPostsRoot()
    await writeSections(root, 'ai-thinking')
    await writePost(
      root,
      'loose-post',
      validSource('散页文章', '2026-02-01T00:00:00+08:00'),
    )

    await expect(listPublishedPosts(root)).rejects.toMatchObject({
      name: 'ContentBuildError',
      diagnostics: [
        expect.objectContaining({
          code: 'PUBLISHED_POST_SECTION_REQUIRED',
          articleSlug: 'loose-post',
          field: 'section',
        }),
      ],
    })
  })

  it('rejects traversal with a deterministic source location', async () => {
    const source = '![越界](../../outside.png)'
    const relativePath = '../../outside.png'
    const result = await validateArticleAssetPath({
      articleRoot: path.join(process.cwd(), 'content/posts/p0-kitchen-sink'),
      articleSlug: 'p0-kitchen-sink',
      relativePath,
      source,
      sourceOffset: source.indexOf(relativePath),
    })

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: 'ARTICLE_ASSET_PATH_INVALID',
          articleSlug: 'p0-kitchen-sink',
          sourceRange: {
            start: { line: 1, column: 7, offset: 6 },
            end: { line: 1, column: 24, offset: 23 },
          },
        }),
      ],
    })
  })

  it('resolves real package assets and rejects encoded traversal', async () => {
    const articleRoot = path.join(
      process.cwd(),
      'content/posts/p0-kitchen-sink',
    )
    const safe = await validateArticleAssetPath({
      articleRoot,
      articleSlug: 'p0-kitchen-sink',
      relativePath: 'media/images/cover.png',
      source: 'media/images/cover.png',
      sourceOffset: 0,
    })
    const encoded = await validateArticleAssetPath({
      articleRoot,
      articleSlug: 'p0-kitchen-sink',
      relativePath: '%25252e%25252e/outside.png',
      source: '%25252e%25252e/outside.png',
      sourceOffset: 0,
    })

    expect(safe).toMatchObject({
      ok: true,
      relativePath: 'media/images/cover.png',
    })
    expect(encoded).toMatchObject({
      ok: false,
      diagnostics: [
        expect.objectContaining({ code: 'ARTICLE_ASSET_PATH_INVALID' }),
      ],
    })
  })

  it('reports a stable diagnostic when index.md cannot be read', async () => {
    const root = await createPostsRoot()
    await mkdir(path.join(root, 'empty-package'))

    await expect(readPost('empty-package', root)).rejects.toEqual(
      expect.objectContaining<Partial<ContentBuildError>>({
        name: 'ContentBuildError',
        diagnostics: [
          expect.objectContaining({ code: 'ARTICLE_INDEX_READ_FAILED' }),
        ],
      }),
    )
  })

  it('rejects an unsafe slug before resolving a filesystem path', async () => {
    await expect(readPost('../p0-kitchen-sink')).rejects.toMatchObject({
      name: 'ContentBuildError',
      diagnostics: [expect.objectContaining({ code: 'ARTICLE_SLUG_INVALID' })],
    })
  })

  it('creates a same-site cover URL only with a configured HTTPS origin', async () => {
    const metadata = await createPostMetadata(
      'p0-kitchen-sink',
      'https://blog.example.com',
    )
    expect(metadata.openGraph?.images).toEqual([
      'https://blog.example.com/blog/p0-kitchen-sink/media/images/cover.png',
    ])
    for (const unsafeOrigin of [
      'http://localhost:9981',
      'https://localhost',
      'https://preview.localhost',
      'https://localhost.',
      'https://preview.localhost.',
      'https://127.9.8.7',
      'https://[::1]',
      'https://[::ffff:127.0.0.1]',
      'https://user:secret@example.com',
      'https://example.com/?preview=1',
      'https://example.com/#preview',
    ]) {
      await expect(
        createPostMetadata('p0-kitchen-sink', unsafeOrigin),
      ).rejects.toThrow('SITE_ORIGIN 必须是公开且仅含 origin 的 HTTPS URL')
    }
  })
})

async function createPostsRoot() {
  const root = path.join(
    process.cwd(),
    '.tmp',
    `content-discovery-${crypto.randomUUID()}`,
  )
  temporaryRoots.push(root)
  const postsRoot = path.join(root, 'posts')
  await mkdir(postsRoot, { recursive: true })
  return postsRoot
}

async function writePost(root: string, slug: string, source: string) {
  const packageRoot = path.join(root, slug)
  await mkdir(packageRoot, { recursive: true })
  await writeFile(path.join(packageRoot, 'index.md'), source, 'utf8')
}

async function writeSections(root: string, ...slugs: string[]) {
  const items = slugs
    .map((slug) => `  - slug: ${slug}\n    title: ${slug}\n    order: 10`)
    .join('\n')
  await writeFile(
    path.join(path.dirname(root), 'sections.yml'),
    `sections:\n${items}\n`,
    'utf8',
  )
}

function validSource(
  title: string,
  publishedAt: string,
  draft = false,
  section?: string,
) {
  const sectionLine = section ? `section: ${section}\n` : ''
  return `---\nschemaVersion: 1\ntitle: ${title}\ndescription: 测试文章\npublishedAt: ${publishedAt}\n${sectionLine}draft: ${draft}\n---\n\n正文\n`
}
