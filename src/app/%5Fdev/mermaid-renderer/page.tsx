import { notFound } from 'next/navigation'

import { DocumentRenderer } from '../../../features/doc-engine'
import { MermaidRevokeHarness } from './revoke-harness'

const OVERSIZED = 'A'.repeat(5_001)
const SOURCE = [
  '# Mermaid renderer fixture',
  '',
  '下面的图表故意放在首屏之外，用于验证视口内懒加载。',
  '',
  '```mermaid',
  'flowchart LR',
  '  A[中文输入] --> B{安全排版}',
  '  B -->|通过| C[Blob 图片]',
  '```',
  '',
  '合法图表后仍可阅读。',
  '',
  '```mermaid',
  'notADiagram ???',
  '```',
  '',
  '非法语法后仍可阅读。',
  '',
  '```mermaid',
  'flowchart TD',
  '  A --> B',
  '  click A href "https://evil.example"',
  '```',
  '',
  '```mermaid\n' + OVERSIZED + '\n```',
  '',
  '恶意与超限节点后仍可阅读。',
].join('\n')

export default function MermaidRendererDevPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <h1 className="mb-8 text-2xl">Mermaid 渲染器验收页</h1>
      <div aria-hidden="true" className="h-[140vh]" data-mermaid-spacer />
      <div data-mermaid-document-fixture>
        <DocumentRenderer
          articleSlug="mermaid-renderer-fixture"
          frontmatter={{ title: 'Mermaid renderer fixture' }}
          profile="editor-preview"
          source={SOURCE}
        />
      </div>
      <MermaidRevokeHarness />
    </main>
  )
}
