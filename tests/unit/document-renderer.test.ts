import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DocumentRenderer } from '../../src/features/doc-engine'

describe('DocumentRenderer', () => {
  it('从统一 Canonical IR 输出语义结构', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'screen-fixture',
      profile: 'article',
      source: '# 标题\n\n正文含 **强调** 与 [链接](https://example.com)。',
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-document-renderer="canonical"')
    expect(html).toContain('<h1 id="标题">标题</h1>')
    expect(html).toContain('<strong>强调</strong>')
    expect(html).toContain('rel="nofollow ugc noopener noreferrer"')
  })

  it('编辑预览把未知标签显示为可定位诊断卡且保留相邻正文', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'unknown-fixture',
      profile: 'editor-preview',
      source: '前文。\n\n<unknown-widget id="x" />\n\n后文。',
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-document-fallback="DOC-REGISTRY-001"')
    expect(html).toContain('前文。')
    expect(html).toContain('后文。')
    expect(html).toContain('源位置：')
    expect(html.indexOf('前文。')).toBeLessThan(html.indexOf('DOC-REGISTRY-001'))
    expect(html.indexOf('DOC-REGISTRY-001')).toBeLessThan(html.indexOf('后文。'))
  })

  it('把无 nodeId 的行内未知标签留在同一段落的原位置', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'inline-unknown',
      profile: 'editor-preview',
      source: '前 <unknown-widget id="x" /> 后',
    })
    const html = renderToStaticMarkup(element)
    const paragraph = html.slice(html.indexOf('<p '), html.indexOf('</p>') + 4)

    expect(paragraph).toContain('data-document-fallback="DOC-REGISTRY-001"')
    expect(paragraph.indexOf('前 ')).toBeLessThan(paragraph.indexOf('DOC-REGISTRY-001'))
    expect(paragraph.indexOf('DOC-REGISTRY-001')).toBeLessThan(paragraph.lastIndexOf(' 后'))
  })

  it('把引用容器内的未知块留在 blockquote 内并保持顺序', async () => {
    const source = [
      '> 前',
      '>',
      '> <unknown-widget id="x" />',
      '>',
      '> 后',
    ].join('\n')
    const element = await DocumentRenderer({
      articleSlug: 'quote-unknown',
      profile: 'editor-preview',
      source,
    })
    const html = renderToStaticMarkup(element)
    const quote = html.slice(html.indexOf('<blockquote'), html.indexOf('</blockquote>') + 13)

    expect(quote).toContain('data-document-fallback="DOC-REGISTRY-001"')
    expect(quote.indexOf('前')).toBeLessThan(quote.indexOf('DOC-REGISTRY-001'))
    expect(quote.indexOf('DOC-REGISTRY-001')).toBeLessThan(quote.lastIndexOf('后'))
  })

  it('discussion 超限内容复用读取期预检并直接安全降级', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'oversized-discussion',
      profile: 'discussion',
      source: '字'.repeat(10_001),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-document-fallback="DOC-SECURITY-004"')
    expect(html).not.toContain('字字字')
  })

  it('编辑预览用原位不可交互 fallback 替换危险链接', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'unsafe-preview',
      profile: 'editor-preview',
      source: '前文 [危险](//evil.example/path) 后文',
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-document-fallback="DOC-SECURITY-005"')
    expect(html).toContain('危险')
    expect(html).not.toContain('href="//evil.example/path"')
  })

  it('article 阻断已知本地缺图，editor-preview 在原节点降级', async () => {
    const props = {
      articleSlug: 'missing-local-image',
      source: '前文 ![缺图](./media/missing.png) 后文',
    } as const
    await expect(DocumentRenderer({ ...props, profile: 'article' })).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'DOC-ASSET-002' })],
    })

    const preview = await DocumentRenderer({ ...props, profile: 'editor-preview' })
    const html = renderToStaticMarkup(preview)
    expect(html).toContain('data-document-fallback="DOC-ASSET-002"')
    expect(html).not.toContain('<img')
  })

  it('缺 alt 只产生编辑期原位 warning，图片仍正常渲染', async () => {
    const assetManifest = [
      {
        articleSlug: 'missing-image-alt',
        outputPath: 'blog/missing-image-alt/media/photo.png',
        publicUrl: '/blog/missing-image-alt/media/photo.png',
        image: {
          width: 800,
          height: 450,
          format: 'png',
          derived: false,
        },
      },
    ] as const
    const preview = await DocumentRenderer({
      articleSlug: 'missing-image-alt',
      assetManifest,
      profile: 'editor-preview',
      source: '![](./media/photo.png)',
    })
    const html = renderToStaticMarkup(preview)

    expect(html).toContain('data-document-diagnostic="DOC-ASSET-005"')
    expect(html).toContain('<img alt=""')
    expect(html).not.toContain('data-document-fallback="DOC-ASSET-005"')

    await expect(
      DocumentRenderer({
        articleSlug: 'missing-image-alt',
        assetManifest,
        profile: 'article',
        source: '![](./media/photo.png)',
      }),
    ).resolves.toBeDefined()
  })

  it('空 alt 与缺资源并存时保留 warning 和阻断 fallback', async () => {
    const preview = await DocumentRenderer({
      articleSlug: 'missing-image-and-alt',
      profile: 'editor-preview',
      source: '![](./media/missing.png)',
    })
    const html = renderToStaticMarkup(preview)

    expect(html).toContain('data-document-diagnostic="DOC-ASSET-005"')
    expect(html).toContain('data-document-fallback="DOC-ASSET-002"')
    expect(html).not.toContain('<img')
  })

  it('discussion 读取期错误只输出安全卡，不渲染危险节点', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'unsafe-discussion',
      profile: 'discussion',
      source: '[危险链接](javascript:alert(1))',
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-document-fallback="DOC-SECURITY-004"')
    expect(html).not.toContain('href="javascript:')
  })

  it('注册组件在服务端先输出稳定替代内容，避免崩溃 renderer 参与 SSR', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'component-fixture',
      assetManifest: [{
        articleSlug: 'component-fixture',
        outputPath: 'embeds/component-fixture/q1/index.html',
      }],
      profile: 'editor-preview',
      source: '<html-embed id="q1" src="./embeds/q1/index.html" title="示例">\n替代说明。\n</html-embed>',
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('data-html-embed="waiting"')
    expect(html).toContain('替代说明。')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('DOC-RENDER-001')
  })
})
