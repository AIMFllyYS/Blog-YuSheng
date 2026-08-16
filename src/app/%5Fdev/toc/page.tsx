import { notFound } from 'next/navigation'
import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
} from '@/features/doc-engine/core'
import { DocumentRenderer } from '@/features/doc-engine/screen/document-renderer'
import { extractOutline } from '@/features/doc-engine/toc'
import { ReaderLayout } from '@/features/reader-layout'

const nestedHeadings = Array.from(
  { length: 14 },
  (_, index) => `### 子节 ${index + 1}\n\n这是用于验证目录滚动跟随的第 ${index + 1} 个子节。${'正文'.repeat(index + 6)}`,
).join('\n\n')

const laterSections = Array.from(
  { length: 9 },
  (_, index) => `## 后续章节 ${index + 1}\n\n${'较长的目录跟随测试正文。'.repeat(index + 20)}`,
).join('\n\n')

const source = `# 目录交互验收

## 可折叠章节

这一节包含很多子标题，用于验证折叠状态与手动滚动暂停。

\`\`\`mermaid
mindmap
  root((目录))
    骨架
\`\`\`

${nestedHeadings}

${laterSections}
`

const frontmatter = {
  schemaVersion: 1,
  title: '目录交互验收',
  description: '目录双模式浏览器专用验收页。',
  publishedAt: '2026-08-16',
}

export default async function TocDevelopmentPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const compiled = await compileArticleDocumentWithDiagnostics({
    articleSlug: 'toc-browser-fixture',
    frontmatter,
    source,
  })
  assertDocumentBuildCanContinue(compiled.diagnostics)
  if (!compiled.document) throw new Error('目录浏览器 fixture 编译失败。')
  const extracted = extractOutline(compiled.document)
  const firstSection = extracted.primarySections[0]
  const outline = firstSection
    ? Object.freeze({
        ...extracted,
        primarySections: Object.freeze([
          Object.freeze({
            ...firstSection,
            embeds: Object.freeze({
              ...firstSection.embeds,
              customTag: true,
              image: true,
            }),
          }),
          ...extracted.primarySections.slice(1),
        ]),
      })
    : extracted

  return (
    <ReaderLayout
      article={
        <DocumentRenderer
          articleSlug="toc-browser-fixture"
          frontmatter={frontmatter}
          profile="article"
          source={source}
        />
      }
      articleSlug="toc-browser-fixture"
      description={frontmatter.description}
      outline={outline}
      publishedAt={frontmatter.publishedAt}
      title={frontmatter.title}
    />
  )
}
