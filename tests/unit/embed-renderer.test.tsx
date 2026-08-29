import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  DocumentRenderer,
  HTML_EMBED_SCHEMA,
  WEB_EMBED_SCHEMA,
} from '../../src/features/doc-engine'

describe('HTML and web embed renderers', () => {
  it('keeps the local iframe out of SSR while preserving its safe fallback', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'embed-fixture',
      assetManifest: [
        {
          articleSlug: 'embed-fixture',
          nodeId: 'local',
          nodeName: 'html-embed',
          outputPath: 'embeds/embed-fixture/local/index.html',
          publicUrl: '/embeds/embed-fixture/local/index.html',
        },
      ],
      profile: 'editor-preview',
      source:
        '<html-embed id="local" src="./embeds/local/index.html" title="本地卡片">\n安全替代内容。\n</html-embed>',
    })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('data-html-embed="waiting"')
    expect(html).toContain('沙箱运行')
    expect(html).toContain('安全替代内容。')
    expect(html).toContain('data-embed-open')
    expect(html).toContain('href="/embeds/embed-fixture/local/index.html"')
    expect(html).toContain('target="_blank"')
    expect(html).not.toContain('<iframe')
  })

  it('renders an unlisted web URL as a titled domain preview with a safe link', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'embed-fixture',
      profile: 'article',
      source:
        '<web-embed id="remote" src="https://example.com/embed" title="外部示例">\n作者提供的降级说明。\n</web-embed>',
    })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('data-web-embed="fallback"')
    expect(html).toContain('外部示例')
    expect(html).toContain('example.com')
    expect(html).toContain('作者提供的降级说明。')
    expect(html).toContain('href="https://example.com/embed"')
    expect(html).toContain('data-embed-open')
    expect(html).toContain('target="_blank"')
    expect(html).not.toContain('<iframe')
  })

  it('renders a safe same-site web URL as a preview without an iframe or srcdoc', async () => {
    const element = await DocumentRenderer({
      articleSlug: 'embed-fixture',
      profile: 'article',
      source:
        '<web-embed id="same-site" src="/blog/other/" title="站内文章">\n站内内容请直接打开。\n</web-embed>',
    })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('data-web-embed="fallback"')
    expect(html).toContain('站内文章')
    expect(html).toContain('本站')
    expect(html).toContain('href="/blog/other/"')
    expect(html).toContain('data-embed-open')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('srcdoc')
  })

  it('enforces bounded schemas and keeps Markdown/TXT projections explicit', () => {
    expect(
      HTML_EMBED_SCHEMA.safeParse({
        id: 'demo',
        src: './embeds/other/index.html',
        title: '错配',
      }).success,
    ).toBe(false)
    expect(
      WEB_EMBED_SCHEMA.safeParse({
        id: 'demo',
        src: 'https://example.com',
        title: '网页',
        height: 2_001,
      }).success,
    ).toBe(false)
    const htmlDefinition = BUILTIN_RENDERER_REGISTRY.get('html-embed')
    const webDefinition = BUILTIN_RENDERER_REGISTRY.get('web-embed')
    expect(htmlDefinition?.security).toMatchObject({
      trustLevel: 'sandboxed',
      allowsScript: true,
      allowsExternalResource: false,
    })
    expect(webDefinition?.security).toMatchObject({
      trustLevel: 'sandboxed',
      allowsExternalResource: true,
    })
  })
})
