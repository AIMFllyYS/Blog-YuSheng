import {
  mkdir,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  copyAssetManifest,
  createAssetManifest,
  MAX_STATIC_FILE_BYTES,
  verifyStaticOutput,
} from '../../src/server/content'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })),
  )
})

describe('content asset manifest', () => {
  it('collects the golden article into fixed public paths', async () => {
    const manifest = await createAssetManifest()
    const paths = manifest.map((entry) => entry.outputPath)

    expect(paths).toContain(
      'blog/p0-kitchen-sink/media/images/cover.png',
    )
    expect(paths).toContain('blog/p0-kitchen-sink/media/video/demo.mp4')
    expect(paths).toContain('blog/p0-kitchen-sink/data/function-plot.json')
    expect(paths).toContain(
      'embeds/p0-kitchen-sink/mini-card/index.html',
    )
    expect(
      manifest.find(
        (entry) =>
          entry.outputPath ===
          'embeds/p0-kitchen-sink/mini-card/index.html',
      )?.publicUrl,
    ).toBe('/embeds/p0-kitchen-sink/mini-card/')
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('copies only manifest entries to their controlled destinations', async () => {
    const manifest = await createAssetManifest()
    const outputRoot = await createTemporaryRoot('copy')
    await copyAssetManifest(manifest, outputRoot)

    await expect(
      writeFile(path.join(outputRoot, 'probe.txt'), 'probe', 'utf8'),
    ).resolves.toBeUndefined()
    const copied = path.join(
      outputRoot,
      'embeds/p0-kitchen-sink/mini-card/index.html',
    )
    await expect(verifyStaticOutput(outputRoot)).resolves.toMatchObject({
      fileCount: manifest.length + 1,
    })
    expect(await import('node:fs/promises').then((fs) => fs.stat(copied))).toMatchObject({
      size: 888,
    })
  })

  it.each([
    ['missing', './media/images/missing.png', 'ARTICLE_ASSET_NOT_FOUND'],
    ['traversal', '../outside.png', 'ARTICLE_ASSET_PATH_INVALID'],
    ['encoded', '%25252e%25252e/outside.png', 'ARTICLE_ASSET_PATH_INVALID'],
    ['drive', 'C:\\outside.png', 'ARTICLE_ASSET_PATH_INVALID'],
    ['unc', '\\\\server\\share.png', 'ARTICLE_ASSET_PATH_INVALID'],
  ])('rejects %s asset references with source diagnostics', async (_, asset, code) => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'unsafe-post',
      `<svg-embed id="unsafe" src="${asset}" title="不安全" />`,
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code,
          nodeId: 'unsafe',
          sourceRange: expect.objectContaining({
            start: expect.objectContaining({ line: 9 }),
          }),
        }),
      ],
    })
  })

  it('validates local paths written with XML single-quoted attributes', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'single-quote-post',
      "<svg-embed id='unsafe' src='../outside.svg' title='不安全' />",
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'ARTICLE_ASSET_PATH_INVALID' }),
      ],
    })
  })

  it('collects CommonMark image references through their definitions', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'reference-post',
      '![引用图片][cover]\n\n[cover]: ../outside.png',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'ARTICLE_ASSET_PATH_INVALID' }),
      ],
    })
  })

  it('uses only the first matching CommonMark definition', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'duplicate-definition',
      '![引用图片][asset]\n\n' +
        '[asset]: https://example.com/first.png\n' +
        '[ASSET]: ../outside.png',
    )

    await expect(createAssetManifest(postsRoot)).resolves.toEqual([])
  })

  it('rejects duplicate component IDs deterministically', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'duplicate-post',
      '<web-embed id="same" src="https://example.com" title="一" />\n' +
        '<web-embed id="same" src="https://example.com" title="二" />',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'ASSET_COMPONENT_ID_DUPLICATE' }),
      ],
    })
  })

  it('does not treat fenced component examples as asset declarations', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'example-post',
      '```markdown\n<svg-embed id="example" src="../missing.svg" title="示例" />\n```',
    )

    await expect(createAssetManifest(postsRoot)).resolves.toEqual([])
  })

  it('rejects files larger than the EdgeOne limit without committing them', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'large-post',
      '<video-embed id="large" src="./media/video/large.mp4" title="超大" />',
    )
    const largeFile = path.join(postsRoot, 'large-post/media/video/large.mp4')
    await mkdir(path.dirname(largeFile), { recursive: true })
    await writeFile(largeFile, '')
    await truncate(largeFile, MAX_STATIC_FILE_BYTES + 1)

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'ASSET_FILE_TOO_LARGE' })],
    })
  })

  it('rejects extension and real-content mismatches', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'fake-image',
      '![伪图片](./media/images/fake.png)',
    )
    const fake = path.join(postsRoot, 'fake-image/media/images/fake.png')
    await mkdir(path.dirname(fake), { recursive: true })
    await writeFile(fake, 'not a png', 'utf8')

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'ASSET_FILE_TYPE_INVALID' })],
    })
  })

  it('rejects a real file used by the wrong renderer category', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'wrong-category',
      '<video-embed id="wrong" src="./media/video/not-video.png" title="错误类型" />',
    )
    const image = path.join(
      postsRoot,
      'wrong-category/media/video/not-video.png',
    )
    await mkdir(path.dirname(image), { recursive: true })
    await writeFile(
      image,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'ASSET_PATH_CONTRACT_INVALID' }),
      ],
    })
  })

  it('validates draft assets but excludes them from copied output', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'valid-draft',
      '![草稿图片](./media/images/draft.png)',
      true,
    )
    const image = path.join(postsRoot, 'valid-draft/media/images/draft.png')
    await mkdir(path.dirname(image), { recursive: true })
    await writeFile(
      image,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )

    await expect(createAssetManifest(postsRoot)).resolves.toEqual([])
    await writeArticle(
      postsRoot,
      'broken-draft',
      '![缺失草稿资源](./media/images/missing.png)',
      true,
    )
    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'ARTICLE_ASSET_NOT_FOUND' })],
    })
  })

  it('rejects binary content disguised as an HTML embed script', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'binary-script',
      '<html-embed id="demo" src="./embeds/demo/index.html" title="二进制" />',
    )
    const embedRoot = path.join(postsRoot, 'binary-script/embeds/demo')
    await mkdir(embedRoot, { recursive: true })
    await writeFile(
      path.join(embedRoot, 'index.html'),
      '<!doctype html><html></html>',
      'utf8',
    )
    await writeFile(
      path.join(embedRoot, 'payload.js'),
      Buffer.from([0xff, 0x00, 0xfe, 0x01]),
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'ASSET_FILE_TYPE_INVALID' })],
    })
  })

  it('reports case-insensitive output collisions on case-sensitive filesystems', async (context) => {
    if (process.platform === 'win32') {
      process.stderr.write('Windows 文件系统无法创建大小写不同的双文件，跳过碰撞 fixture\n')
      context.skip()
      return
    }
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'case-collision',
      '![A](./media/images/A.png)\n![a](./media/images/a.png)',
    )
    const imageRoot = path.join(postsRoot, 'case-collision/media/images')
    await mkdir(imageRoot, { recursive: true })
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await writeFile(path.join(imageRoot, 'A.png'), png)
    await writeFile(path.join(imageRoot, 'a.png'), png)

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'ASSET_OUTPUT_COLLISION' })],
    })
  })

  it('verifies output file count and per-file size', async () => {
    const outputRoot = await createTemporaryRoot('limits')
    await writeFile(path.join(outputRoot, 'one.txt'), '12345', 'utf8')
    await writeFile(path.join(outputRoot, 'two.txt'), '1', 'utf8')

    await expect(
      verifyStaticOutput(outputRoot, { maxFileBytes: 4, maxFileCount: 1 }),
    ).rejects.toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'STATIC_OUTPUT_FILE_COUNT_EXCEEDED' }),
        expect.objectContaining({ code: 'STATIC_OUTPUT_FILE_TOO_LARGE' }),
      ]),
    })
  })

  it('rejects a symlink that escapes the article package when permitted', async (context) => {
    const root = await createTemporaryRoot('symlink')
    const postsRoot = path.join(root, 'posts')
    const outside = path.join(root, 'outside.png')
    await mkdir(postsRoot, { recursive: true })
    await writeFile(outside, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    await writeArticle(
      postsRoot,
      'linked-post',
      '![越界链接](./media/images/link.png)',
    )
    const link = path.join(postsRoot, 'linked-post/media/images/link.png')
    await mkdir(path.dirname(link), { recursive: true })
    try {
      await symlink(outside, link, 'file')
    } catch (error) {
      process.stderr.write(
        `当前 Windows 权限无法创建 symlink，跳过用例：${String(error)}\n`,
      )
      context.skip()
      return
    }

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'ARTICLE_ASSET_PATH_INVALID' })],
    })
  })

  it('rejects links inside an HTML embed directory when permitted', async (context) => {
    const root = await createTemporaryRoot('embed-link')
    const postsRoot = path.join(root, 'posts')
    const outside = path.join(root, 'outside.js')
    await mkdir(postsRoot, { recursive: true })
    await writeFile(outside, 'alert(1)', 'utf8')
    await writeArticle(
      postsRoot,
      'linked-embed',
      '<html-embed id="demo" src="./embeds/demo/index.html" title="链接" />',
    )
    const embedRoot = path.join(postsRoot, 'linked-embed/embeds/demo')
    await mkdir(embedRoot, { recursive: true })
    await writeFile(
      path.join(embedRoot, 'index.html'),
      '<!doctype html><html></html>',
      'utf8',
    )
    try {
      await symlink(outside, path.join(embedRoot, 'linked.js'), 'file')
    } catch (error) {
      process.stderr.write(
        `当前 Windows 权限无法创建 embed symlink，跳过用例：${String(error)}\n`,
      )
      context.skip()
      return
    }

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'ASSET_EMBED_LINK_FORBIDDEN' }),
      ],
    })
  })
})

async function createTemporaryRoot(label: string) {
  const root = path.join(process.cwd(), '.tmp', `asset-${label}-${crypto.randomUUID()}`)
  temporaryRoots.push(root)
  await mkdir(root, { recursive: true })
  return root
}

async function createPostsRoot() {
  const root = await createTemporaryRoot('posts')
  return path.join(root, 'posts')
}

async function writeArticle(
  postsRoot: string,
  slug: string,
  body: string,
  draft = false,
) {
  const articleRoot = path.join(postsRoot, slug)
  await mkdir(articleRoot, { recursive: true })
  await writeFile(
    path.join(articleRoot, 'index.md'),
    `---\nschemaVersion: 1\ntitle: 测试\ndescription: 测试资源\npublishedAt: 2026-08-16T10:00:00+08:00\ndraft: ${draft}\n---\n\n${body}\n`,
    'utf8',
  )
}
