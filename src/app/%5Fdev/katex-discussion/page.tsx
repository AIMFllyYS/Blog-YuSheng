import { notFound } from 'next/navigation'

import { DiscussionDocumentRenderer } from '../../../features/doc-engine/screen/discussion-document-renderer'

const SOURCE = [
  '讨论中的公式 $a^2 + b^2 = c^2$ 仅在面板路径加载。',
  '',
  '$$',
  '\\int_0^1 x^2\\,dx',
  '$$',
  '',
  '$$',
  '\\frac{',
  '$$',
].join('\n')

export default function KatexDiscussionDevPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <h1 className="mb-8 text-2xl">KaTeX 讨论档位验收页</h1>
      <DiscussionDocumentRenderer
        articleSlug="katex-discussion-fixture"
        source={SOURCE}
      />
    </main>
  )
}
