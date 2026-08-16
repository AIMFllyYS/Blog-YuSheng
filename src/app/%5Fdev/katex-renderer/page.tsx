import { notFound } from 'next/navigation'

import { DocumentRenderer } from '../../../features/doc-engine'

const SOURCE = [
  '# KaTeX renderer fixture',
  '',
  '公式前。行内公式 $E = mc^2$ 后仍在同一段。',
  '',
  '$$',
  '\\int_{0}^{1} x^2\\,dx = \\frac{1}{3}',
  '$$',
  '',
  '非法公式前。$\\frac{$ 非法公式后仍可阅读。',
  '',
  '宏策略前。$\\def\\loop{\\loop}\\loop$ 宏策略后仍可阅读。',
].join('\n')

export default function KatexRendererDevPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <h1 className="mb-8 text-2xl">KaTeX 渲染器验收页</h1>
      <DocumentRenderer
        articleSlug="katex-renderer-fixture"
        frontmatter={{ title: 'KaTeX renderer fixture' }}
        profile="editor-preview"
        source={SOURCE}
      />
    </main>
  )
}
