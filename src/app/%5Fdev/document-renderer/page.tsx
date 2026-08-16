import { notFound } from 'next/navigation'

import { DocumentRenderer } from '@/features/doc-engine'

import { ImageRecoveryFixture } from './image-recovery-fixture'

const UNKNOWN_RENDERER_SOURCE = `# DocumentRenderer 验收页

未知标签前的内容仍然可见。

<unknown-widget id="missing" />

未知标签后的内容仍然可见。

资源失效 fixture：![丢失图片](./media/missing.png)

<html-embed id="screen-fallback" src="./embeds/example/index.html" title="示例组件">
组件的 Markdown 替代内容。
</html-embed>

崩溃节点前的内容。

<html-embed id="fixture-crash-node" src="./embeds/crash/index.html" title="崩溃组件">
组件的文字替代内容。
</html-embed>

崩溃节点后的内容仍然正常显示。

<web-embed id="blocked-web" src="https://example.com/embed" title="未获准网页">
未获准网页的安全替代内容。
</web-embed>
`

const FIXTURE_MANIFEST = [
  {
    articleSlug: 'document-renderer-fixture',
    outputPath: 'embeds/document-renderer-fixture/example/index.html',
  },
  {
    articleSlug: 'document-renderer-fixture',
    outputPath: 'embeds/document-renderer-fixture/crash/index.html',
  },
  {
    articleSlug: 'document-renderer-fixture',
    outputPath: 'blog/document-renderer-fixture/media/missing.png',
    publicUrl: '/blog/document-renderer-fixture/media/missing.png',
    image: {
      width: 640,
      height: 360,
      format: 'png',
      derived: false,
    },
  },
] as const

export default function DocumentRendererFixturePage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-16 text-[var(--ink)] md:px-10">
      <div className="mx-auto max-w-3xl">
        <DocumentRenderer
          articleSlug="document-renderer-fixture"
          assetManifest={FIXTURE_MANIFEST}
          className="space-y-5"
          developmentCrashComponentIds={['fixture-crash-node', 'blocked-web']}
          profile="editor-preview"
          source={UNKNOWN_RENDERER_SOURCE}
        />
        <ImageRecoveryFixture />
      </div>
    </main>
  )
}
