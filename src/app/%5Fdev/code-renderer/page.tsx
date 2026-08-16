import { notFound } from 'next/navigation'

import { DocumentRenderer } from '../../../features/doc-engine'

const CODE_FIXTURE = [
  '// 中文注释：复制内容必须逐字一致',
  'export function greet(name: string) {',
  "  const message = `你好，${name}`",
  '',
  '  return message + " / " + "这是一条用于验证横向滚动而不会撑破正文栏的超长代码行。".repeat(6)',
  '}',
].join('\n')

export default function CodeRendererDevPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const source = `# Code renderer fixture\n\n行内代码：\`const answer = 42\`。\n\n\`\`\`ts\n${CODE_FIXTURE}\n\`\`\``
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <h1 className="mb-8 text-2xl">代码渲染器验收页</h1>
      <DocumentRenderer
        articleSlug="code-renderer-fixture"
        frontmatter={{ title: 'Code renderer fixture' }}
        profile="article"
        source={source}
      />
    </main>
  )
}
