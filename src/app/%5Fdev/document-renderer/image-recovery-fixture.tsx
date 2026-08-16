'use client'

import { useState } from 'react'

import type { InlineImageNode } from '@/features/doc-engine'
import { ResourceImage } from '@/features/doc-engine/screen/resource-image'

const SOURCE_RANGE = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 2, offset: 1 },
} as const
const RECOVERED_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="%23794018"/%3E%3C/svg%3E'

export function ImageRecoveryFixture() {
  const [src, setSrc] = useState(
    '/blog/document-renderer-fixture/media/recovery-missing.png',
  )
  const node = {
    type: 'image',
    placement: 'inline',
    nodeId: 'image-recovery-fixture',
    src,
    alt: '恢复图片',
    sourceRange: SOURCE_RANGE,
    sourceText: '![恢复图片](fixture)',
  } as const satisfies InlineImageNode
  return (
    <section aria-label="图片恢复 fixture" className="mt-8">
      <ResourceImage node={node} showDetails src={src} />
      <button
        className="ml-3 border border-[var(--line)] px-3 py-2"
        onClick={() => setSrc(RECOVERED_IMAGE)}
        type="button"
      >
        切换有效图片
      </button>
    </section>
  )
}
