import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileArticleDocument } from '../../src/features/doc-engine'
import { assembleExport } from '../../src/features/export-service'
import {
  createAssetManifest,
  readPost,
  transformContentImages,
} from '../../src/server/content'

const FIXTURE = path.join(
  process.cwd(),
  'tests/unit/__fixtures__/p0-kitchen-sink.export.txt',
)

describe('TXT export projection', () => {
  it('projects the kitchen-sink article to the locked TXT table', async () => {
    const post = await readPost('p0-kitchen-sink')
    const manifest = await transformContentImages(
      await createAssetManifest(),
      path.join(process.cwd(), '.tmp', 'export-image-cache'),
    )
    const document = await compileArticleDocument({
      articleSlug: post.slug,
      assetManifest: manifest,
      frontmatter: post.frontmatter,
      source: post.source,
    })
    const originalSource = document.originalSource

    const result = assembleExport({
      assetManifest: manifest,
      document,
      format: 'text',
      scope: 'body-only',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const text = new TextDecoder('utf-8').decode(result.artifact.bytes)
    expect(result.artifact.filename).toBe('p0-kitchen-sink.txt')
    expect(result.artifact.mimeType).toBe('text/plain;charset=utf-8')
    expect(text.replace(/\r\n/g, '\n')).toBe(
      readFileSync(FIXTURE, 'utf8').replace(/\r\n/g, '\n'),
    )
    expect(text.startsWith('\uFEFF')).toBe(false)
    expect(text.endsWith('\n')).toBe(true)
    expect(text).toContain('# P0 中文综合验收文章')
    expect(text).toContain('## Markdown 与 GFM')
    expect(text).toContain('站内链接（/blog/）')
    expect(text).toContain('- [x] 任务列表')
    expect(text).toContain('- [ ] 待办项目')
    expect(text).toContain('支持 删除线 与 粗体、斜体')
    expect(text).toContain('能力\t状态\t说明')
    expect(text).toContain('> 内容协议必须可读、可 diff，也必须能稳定降级。')
    expect(text).toContain('```ts\nexport function greet(name: string) {')
    expect(text).toContain('$E = mc^2$')
    expect(text).toContain('$$\n\\int_{0}^{1} x^2\\,dx = \\frac{1}{3}\n$$')
    expect(text).toContain('```mermaid\nflowchart LR')
    expect(text).toContain(
      '[图片：蓝紫渐变的 P0 验收封面]（./media/images/cover.png）',
    )
    expect(text).toContain('[视频：一秒钟验收视频]（./media/video/demo.mp4）')
    expect(text).toContain('[音频：一秒钟验收音频]（./media/audio/demo.mp3）')
    expect(text).toContain('[交互图形：function-plot]')
    expect(text).toContain('[SVG：安全 SVG 示例]（./media/svg/safe-diagram.svg）')
    expect(text).toContain(
      '[HTML：文章包内 HTML 小页]（./embeds/mini-card/index.html）',
    )
    expect(text).toContain(
      '[网页：未进入白名单的网页]（https://unlisted.invalid/embed）',
    )
    expect(text).toContain('正式文章的唯一权威源是什么？')
    expect(text).toContain('a. content/posts/<slug>/index.md')
    expect(text).toContain('文章 URL 中的公开标识称为 ____（输入 slug 或中文名称）。')
    expect(text).not.toContain('【图片】')
    expect(text).not.toContain('【Mermaid 图表源码】')
    expect(text).not.toContain('答案：a')
    expect(text).not.toContain('可接受答案：')
    expect(document.originalSource).toBe(originalSource)
    expect(document.originalSource).toBe(post.source)
  })
})
