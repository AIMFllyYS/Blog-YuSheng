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
    expect(paths).toContain('blog/p0-kitchen-sink/data/choice-question.json')
    expect(paths).toContain(
      'blog/p0-kitchen-sink/data/choice-question-multiple.json',
    )
    expect(paths).toContain('blog/p0-kitchen-sink/data/fill-blank-question.json')
    expect(
      manifest.find(
        (entry) =>
          entry.outputPath ===
          'blog/p0-kitchen-sink/data/choice-question.json',
      )?.data,
    ).toMatchObject({ prompt: '正式文章的唯一权威源是什么？' })
    expect(
      manifest.find(
        (entry) =>
          entry.outputPath ===
          'blog/p0-kitchen-sink/media/svg/safe-diagram.svg',
      )?.transform,
    ).toBe('sanitize-svg')
    expect(paths).toContain(
      'embeds/p0-kitchen-sink/mini-card/index.html',
    )
    expect(
      manifest.find(
        (entry) =>
          entry.outputPath ===
          'embeds/p0-kitchen-sink/mini-card/index.html',
      )?.publicUrl,
    ).toBe('/embeds/p0-kitchen-sink/mini-card/index.html')
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('rejects canvas JSON that does not match its statically registered schema', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'bad-canvas-data',
      '<canvas-render id="bad" renderer="function-plot" data-src="./data/plot.json" />',
    )
    const dataRoot = path.join(postsRoot, 'bad-canvas-data/data')
    await mkdir(dataRoot, { recursive: true })
    await writeFile(
      path.join(dataRoot, 'plot.json'),
      JSON.stringify({ expression: 'alert(1)', domain: [0, 1], range: [0, 1], samples: 20 }),
      'utf8',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'ASSET_DATA_SCHEMA_INVALID' }),
      ],
    })
  })

  it.each([
    {
      slug: 'bad-choice-data',
      tag: '<choice-question id="bad" data-src="./data/question.json" />',
      data: {
        prompt: '缺少解析',
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        answer: 'a',
      },
    },
    {
      slug: 'bad-fill-data',
      tag: '<fill-blank-question id="bad" data-src="./data/question.json" />',
      data: { prompt: '缺少答案', explanation: '不完整' },
    },
    {
      slug: 'blank-normalized-fill-data',
      tag: '<fill-blank-question id="bad" data-src="./data/question.json" />',
      data: {
        prompt: '空答案',
        answers: ['   '],
        trimWhitespace: true,
        caseSensitive: true,
        explanation: '规范化后为空。',
      },
    },
    {
      slug: 'duplicate-normalized-fill-data',
      tag: '<fill-blank-question id="bad" data-src="./data/question.json" />',
      data: {
        prompt: '重复答案',
        answers: ['YES', ' yes '],
        trimWhitespace: true,
        caseSensitive: false,
        explanation: '规范化后重复。',
      },
    },
  ])('rejects build-time quiz schema failures for $slug', async (fixture) => {
    const postsRoot = await createPostsRoot()
    await writeArticle(postsRoot, fixture.slug, fixture.tag)
    const dataRoot = path.join(postsRoot, fixture.slug, 'data')
    await mkdir(dataRoot, { recursive: true })
    await writeFile(
      path.join(dataRoot, 'question.json'),
      JSON.stringify(fixture.data),
      'utf8',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ASSET_DATA_SCHEMA_INVALID',
          nodeId: 'bad',
          sourceRange: expect.any(Object),
        }),
      ],
    })
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
    const copiedSvg = path.join(
      outputRoot,
      'blog/p0-kitchen-sink/media/svg/safe-diagram.svg',
    )
    await expect(verifyStaticOutput(outputRoot)).resolves.toMatchObject({
      fileCount: manifest.length + 1,
    })
    const sourceEmbed = path.join(
      process.cwd(),
      'content/posts/p0-kitchen-sink/embeds/mini-card/index.html',
    )
    const [copiedStat, sourceStat] = await Promise.all([
      import('node:fs/promises').then((fs) => fs.stat(copied)),
      import('node:fs/promises').then((fs) => fs.stat(sourceEmbed)),
    ])
    expect(copiedStat.size).toBe(sourceStat.size)
    const sanitizedSvg = await import('node:fs/promises').then((fs) =>
      fs.readFile(copiedSvg, 'utf8'),
    )
    expect(sanitizedSvg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(sanitizedSvg).not.toMatch(/<script|foreignObject|\son[a-z]+=/i)
  })

  it('blocks unsafe SVG before it can enter the asset manifest', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'unsafe-svg',
      '<svg-embed id="unsafe" src="./media/svg/unsafe.svg" title="不安全" />',
    )
    const svgRoot = path.join(postsRoot, 'unsafe-svg/media/svg')
    await mkdir(svgRoot, { recursive: true })
    await writeFile(
      path.join(svgRoot, 'unsafe.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)" /></svg>',
      'utf8',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ASSET_SVG_UNSAFE',
          nodeId: 'unsafe',
          sourceRange: expect.objectContaining({
            start: expect.objectContaining({ line: 9, column: 29 }),
          }),
        }),
      ],
    })
  })

  it('propagates compiler diagnostics and never collects a schema-invalid component', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'missing-svg-src',
      '<svg-embed id="missing" title="缺少资源" />',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'DOC-REGISTRY-002',
          message: expect.not.stringContaining('undefined'),
        }),
      ],
    })
  })

  it('points Markdown image path diagnostics at the URL token', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'image-range',
      '![越界图](../outside.png)',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ARTICLE_ASSET_PATH_INVALID',
          sourceRange: expect.objectContaining({
            start: expect.objectContaining({ line: 9, column: 8 }),
          }),
        }),
      ],
    })
  })

  it('points referenced-image diagnostics at the effective definition URL', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'image-definition-range',
      '![引用][asset]\n\n[asset]: ../outside.png',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ARTICLE_ASSET_PATH_INVALID',
          sourceRange: expect.objectContaining({
            start: expect.objectContaining({ line: 11, column: 10 }),
          }),
        }),
      ],
    })
  })

  it('maps component asset ranges through a Markdown container prefix', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'nested-svg-range',
      '> <svg-embed id="nested" src="../outside.svg" title="嵌套" />',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ARTICLE_ASSET_PATH_INVALID',
          sourceRange: expect.objectContaining({
            start: expect.objectContaining({ line: 9, column: 31 }),
          }),
        }),
      ],
    })
  })

  it.each([
    {
      label: 'direct entity',
      body: '![x](../foo&amp;bar.png)',
      line: 9,
      column: 6,
      raw: '../foo&amp;bar.png',
    },
    {
      label: 'definition entity',
      body: '![x][a]\n\n[a]: ../foo&amp;bar.png',
      line: 11,
      column: 6,
      raw: '../foo&amp;bar.png',
    },
    {
      label: 'direct escape',
      body: '![x](../foo\\(bar\\).png)',
      line: 9,
      column: 6,
      raw: '../foo\\(bar\\).png',
    },
    {
      label: 'definition escape',
      body: '![x][a]\n\n[a]: ../foo\\(bar\\).png',
      line: 11,
      column: 6,
      raw: '../foo\\(bar\\).png',
    },
  ])('keeps the raw Markdown URL range for $label', async (fixture) => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      `raw-range-${fixture.label.replace(' ', '-')}`,
      fixture.body,
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ARTICLE_ASSET_PATH_INVALID',
          sourceRange: {
            start: expect.objectContaining({
              line: fixture.line,
              column: fixture.column,
            }),
            end: expect.objectContaining({
              line: fixture.line,
              column: fixture.column + fixture.raw.length,
            }),
          },
        }),
      ],
    })
  })

  it.each([
    ['nested link', '![a [x](y)](../outside.png)'],
    ['nested image', '![a ![x](y)](../outside.png)'],
    ['code span opening bracket', '![a `[`](../outside.png)'],
    ['code span closing bracket', '![a `]`](../outside.png)'],
    [
      'inline html attribute bracket',
      '![a <span data-x="[">x</span>](../outside.png)',
    ],
    ['autolink-like bracket', '![a <x[y]>](../outside.png)'],
    ['literal less-than with angled destination', '![a < foo](<../outside.png>)'],
    [
      'literal less-than with greater-than in title',
      '![a < foo](../outside.png "x > y")',
    ],
    [
      'literal tag-like text with unmatched double quote',
      '![a <foo "](../outside.png "x > y")',
    ],
    [
      'literal tag-like text with unmatched single quote',
      `![a <foo '](../outside.png "x > y")`,
    ],
    [
      'unquoted HTML attribute containing an image marker',
      '![a <span data-x=](>x</span>](../outside.png)',
    ],
    [
      'URI autolink containing an image marker',
      '![a <http://x/](foo)>](../outside.png)',
    ],
    [
      'declaration containing an image marker',
      '![a <!FOO ]( [>](../outside.png)',
    ],
    [
      'invalid tag-like angle content containing a bracket',
      '![a <foo [>x]](../outside.png)',
    ],
    [
      'invalid short comment opener containing a bracket',
      '![a <!--> [-->x]](../outside.png)',
    ],
    [
      'invalid dash comment opener containing a bracket',
      '![a <!---> [-->x]](../outside.png)',
    ],
    [
      'accepted comment with internal double dash and bracket',
      '![a <!-- foo -- [ -->x](../outside.png)',
    ],
    [
      'accepted comment with trailing dash content and bracket',
      '![a <!-- foo [ - -->x](../outside.png)',
    ],
  ])('uses the outer image destination for %s alt content', async (label, body) => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      `outer-image-${label.toLowerCase().replace(/ /g, '-')}`,
      body,
    )
    const rawUrl = '../outside.png'
    const column = body.indexOf(rawUrl) + 1

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ARTICLE_ASSET_PATH_INVALID',
          sourceRange: {
            start: expect.objectContaining({ line: 9, column }),
            end: expect.objectContaining({
              line: 9,
              column: column + rawUrl.length,
            }),
          },
        }),
      ],
    })
  })

  it('uses Canonical IR assets when quoted greater-than and multiline attributes are present', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'quoted-svg',
      [
        '<svg-embed',
        '  title="A > B"',
        '  src="./media/svg/safe.svg"',
        '  id="diagram"',
        '/>',
        '',
        '![同一安全资源](./media/svg/safe.svg)',
      ].join('\n'),
    )
    const svgRoot = path.join(postsRoot, 'quoted-svg/media/svg')
    await mkdir(svgRoot, { recursive: true })
    await writeFile(
      path.join(svgRoot, 'safe.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"><title>A &gt; B</title><path d="M0 0h10" /></svg>',
      'utf8',
    )

    const manifest = await createAssetManifest(postsRoot)
    expect(manifest).toHaveLength(1)
    expect(manifest[0]).toMatchObject({
      nodeId: 'diagram',
      nodeName: 'svg-embed',
      transform: 'sanitize-svg',
    })
  })

  it('cannot publish an unsafe SVG through a second Markdown image reference', async () => {
    const postsRoot = await createPostsRoot()
    await writeArticle(
      postsRoot,
      'dual-svg',
      [
        '<svg-embed id="diagram" title="A > B" src="./media/svg/unsafe.svg" />',
        '',
        '![also](./media/svg/unsafe.svg)',
      ].join('\n'),
    )
    const svgRoot = path.join(postsRoot, 'dual-svg/media/svg')
    await mkdir(svgRoot, { recursive: true })
    await writeFile(
      path.join(svgRoot, 'unsafe.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      'utf8',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: 'ASSET_SVG_UNSAFE',
          nodeId: 'diagram',
        }),
      ],
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
      '<web-embed id="same" src="https://example.com" title="一">\n替代一。\n</web-embed>\n\n' +
        '<web-embed id="same" src="https://example.com" title="二">\n替代二。\n</web-embed>',
    )

    await expect(createAssetManifest(postsRoot)).rejects.toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'ASSET_COMPONENT_ID_DUPLICATE' }),
      ]),
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
      '<html-embed id="demo" src="./embeds/demo/index.html" title="二进制">\n安全替代。\n</html-embed>',
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
      '<html-embed id="demo" src="./embeds/demo/index.html" title="链接">\n无法加载时显示静态说明。\n</html-embed>',
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
