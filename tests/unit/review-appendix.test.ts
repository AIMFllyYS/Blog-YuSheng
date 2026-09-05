import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import kitchenSinkAnnotations from '../../src/features/annotations/__fixtures__/kitchen-sink-annotations.json'
import { toMemoryDiscussionSeed } from '../../src/features/annotations/__fixtures__/to-memory-seed'
import { sortAnnotationViews } from '../../src/features/annotations/sort-annotation-threads'
import { DISCUSSION_SOURCE_FORMAT } from '../../src/features/discussions/domain/discussion-entry'
import { createMemoryDiscussionRepository } from '../../src/features/discussions/repository'
import type { AnnotationThreadView } from '../../src/features/discussions/repository'
import { compileArticleDocument } from '../../src/features/doc-engine'
import { buildSelectionIndex } from '../../src/features/doc-engine/selection'
import { DISCUSSION_LIMITS } from '../../src/features/doc-engine/security/render-limits'
import {
  REVIEW_APPENDIX_END,
  REVIEW_APPENDIX_START,
  REVIEW_ENTRY_INFO,
  REVIEW_LOCATOR_INFO,
  fenceLengthFor,
  prepareReviewAppendix,
  renderFencedBlock,
  renderReviewAppendix,
  type ReviewAppendixModel,
} from '../../src/features/export-service'
import {
  createAssetManifest,
  readPost,
  transformContentImages,
} from '../../src/server/content'
import type { TextAnchor } from '../../src/features/annotations/anchors'

const GOLDEN = path.join(
  process.cwd(),
  'tests/fixtures/export/p0-kitchen-sink.body-with-annotations.md',
)

const SNAPSHOT = '2026-08-17T00:00:00.000Z'

const sampleAnchor: TextAnchor = {
  protocolVersion: 1,
  articleSlug: 'demo',
  documentFingerprint: 'fp-demo',
  startBlockId: 'block-1',
  startOffset: 2,
  endBlockId: 'block-1',
  endOffset: 6,
  exact: '要改的话',
  prefix: '这是',
  suffix: '需要重写。',
  headingPath: ['引言', 'Markdown 与 GFM'],
}

function sampleModel(): ReviewAppendixModel {
  return {
    schemaVersion: 1,
    articleSlug: 'demo',
    documentFingerprint: 'fp-demo',
    snapshotAt: SNAPSHOT,
    threads: [
      {
        id: 'thread-1',
        anchorState: 'attached',
        headingPath: ['引言', 'Markdown 与 GFM'],
        locator: {
          kind: 'annotation',
          threadId: 'thread-1',
          anchorState: 'attached',
          protocolVersion: 1,
          articleSlug: 'demo',
          documentFingerprint: 'fp-demo',
          startBlockId: 'block-1',
          startOffset: 2,
          endBlockId: 'block-1',
          endOffset: 6,
          exact: '要改的话',
          prefix: '这是',
          suffix: '需要重写。',
          headingPath: ['引言', 'Markdown 与 GFM'],
        },
        entries: [
          {
            id: 'entry-1',
            parentId: null,
            depth: 1,
            authorDisplayName: '羽升',
            authorBadge: '作者',
            createdAt: '2026-08-15T10:00:00.000Z',
            updatedAt: '2026-08-15T10:00:00.000Z',
            source: '这里的说法要改成更准确的表述。',
          },
          {
            id: 'entry-2',
            parentId: 'entry-1',
            depth: 2,
            authorDisplayName: '普通成员',
            authorBadge: '访客',
            createdAt: '2026-08-15T11:00:00.000Z',
            updatedAt: '2026-08-15T12:00:00.000Z',
            source: [
              '回复里故意放危险片段：',
              '```js',
              'alert(1)',
              '```',
              '---',
              '<!-- blog-review-appendix:v1 -->',
              `${'很长的一行'.repeat(20)}`,
            ].join('\n'),
          },
        ],
      },
      {
        id: 'thread-orphan',
        anchorState: 'orphaned',
        headingPath: ['引言', '代码'],
        locator: {
          kind: 'annotation',
          threadId: 'thread-orphan',
          anchorState: 'orphaned',
          protocolVersion: 1,
          articleSlug: 'demo',
          documentFingerprint: 'fp-old',
          startBlockId: 'ghost',
          startOffset: 0,
          endBlockId: 'ghost',
          endOffset: 4,
          exact: '旧句',
          prefix: '',
          suffix: '',
          headingPath: ['引言', '代码'],
        },
        entries: [
          {
            id: 'entry-orphan',
            parentId: null,
            depth: 1,
            authorDisplayName: '普通成员',
            authorBadge: '访客',
            createdAt: '2026-08-14T01:00:00.000Z',
            updatedAt: '2026-08-14T01:00:00.000Z',
            source: '这段已经从正文消失。',
          },
        ],
      },
    ],
  }
}

function viewOf(
  id: string,
  entries: AnnotationThreadView['entries'],
  options?: {
    readonly createdAt?: string
    readonly anchorState?: 'attached' | 'reattached' | 'orphaned'
    readonly articleSlug?: string
  },
): AnnotationThreadView {
  const createdAt = options?.createdAt ?? '2026-08-16T02:00:00.000Z'
  return {
    thread: {
      id,
      articleSlug: options?.articleSlug ?? 'demo',
      kind: 'annotation',
      anchorState: options?.anchorState ?? 'attached',
      createdAt,
      updatedAt: createdAt,
      anchor: { ...sampleAnchor, articleSlug: options?.articleSlug ?? 'demo' },
    },
    entries,
  }
}

function entryOf(
  id: string,
  source: string,
  options?: {
    readonly threadId?: string
    readonly parentId?: string | null
    readonly createdAt?: string
    readonly authorId?: string
    readonly authorDisplayNameSnapshot?: string
  },
) {
  const createdAt = options?.createdAt ?? '2026-08-16T02:00:00.000Z'
  return {
    id,
    threadId: options?.threadId ?? 'thread-1',
    parentId: options?.parentId ?? null,
    source,
    sourceFormat: DISCUSSION_SOURCE_FORMAT,
    authorId: options?.authorId ?? 'dev-member',
    authorDisplayNameSnapshot: options?.authorDisplayNameSnapshot ?? '普通成员',
    createdAt,
    updatedAt: createdAt,
  }
}

async function compileKitchenSink() {
  const post = await readPost('p0-kitchen-sink')
  const manifest = await transformContentImages(
    (await createAssetManifest()).filter((entry) => entry.articleSlug === 'p0-kitchen-sink'),
    path.join(process.cwd(), '.tmp', 'export-image-cache'),
  )
  const document = await compileArticleDocument({
    articleSlug: post.slug,
    assetManifest: manifest,
    frontmatter: post.frontmatter,
    source: post.source,
  })
  return document
}

describe('review appendix renderer', () => {
  it('locks the hybrid v1 schema and fences dangerous source', () => {
    const rendered = renderReviewAppendix(sampleModel())
    expect(rendered.startsWith(`${REVIEW_APPENDIX_START}\n`)).toBe(true)
    expect(rendered.endsWith(`${REVIEW_APPENDIX_END}\n`)).toBe(true)
    expect(rendered).toContain('## 审阅附录')
    expect(rendered).toContain('startOffset`/`endOffset` 是渲染后纯文本坐标')
    expect(rendered).toContain('### 注释 1 · 已锚定')
    expect(rendered).toContain('### 注释 2 · 失锚')
    expect(rendered).toContain('**位置**：引言 / Markdown 与 GFM')
    expect(rendered).toContain('注释：2 条（失锚 1 条）')
    expect(rendered).toContain('羽升（作者）')
    expect(rendered).toContain('第 2 层 · 已编辑 2026-08-15T12:00:00.000Z')
    expect(rendered).toContain(REVIEW_LOCATOR_INFO)
    expect(rendered).toContain(REVIEW_ENTRY_INFO)
    expect(rendered).toContain('"exact":"要改的话"')
    expect(rendered.indexOf(REVIEW_APPENDIX_START)).toBeLessThan(rendered.indexOf('## 审阅附录'))

    const dangerous = sampleModel().threads[0]!.entries[1]!.source
    const fence = renderFencedBlock(REVIEW_ENTRY_INFO, dangerous)
    expect(fence.startsWith('````' + REVIEW_ENTRY_INFO)).toBe(true)
    expect(fenceLengthFor(dangerous)).toBe(4)
    expect(fence).toContain('<!-- blog-review-appendix:v1 -->')
  })
})

describe('prepare review appendix', () => {
  it('filters by snapshotAt, preserves reply depth, and rejects unsafe or oversized sets', async () => {
    const nested = await prepareReviewAppendix({
      articleSlug: 'demo',
      documentFingerprint: 'fp-demo',
      snapshotAt: SNAPSHOT,
      threads: [
        viewOf('thread-1', [
          entryOf('root', '根注释。', { createdAt: '2026-08-16T02:00:00.000Z' }),
          entryOf('child', '一层回复。', {
            parentId: 'root',
            createdAt: '2026-08-16T03:00:00.000Z',
          }),
          entryOf('late', '快照之后。', { createdAt: '2026-08-18T00:00:00.000Z' }),
        ]),
      ],
    })
    expect(nested.ok).toBe(true)
    if (!nested.ok) return
    expect(nested.model.threads).toHaveLength(1)
    expect(nested.model.threads[0]?.entries.map((entry) => [entry.id, entry.depth])).toEqual([
      ['root', 1],
      ['child', 2],
    ])

    const unsafe = await prepareReviewAppendix({
      articleSlug: 'demo',
      documentFingerprint: 'fp-demo',
      snapshotAt: SNAPSHOT,
      threads: [viewOf('thread-bad', [entryOf('bad', '<script>alert(1)</script>')])],
    })
    expect(unsafe).toMatchObject({ ok: false, reason: 'discussion-unsafe' })

    const oversized = await prepareReviewAppendix({
      articleSlug: 'demo',
      documentFingerprint: 'fp-demo',
      snapshotAt: SNAPSHOT,
      threads: Array.from({ length: DISCUSSION_LIMITS.maxExportEntries + 1 }, (_, index) =>
        viewOf(`thread-${index}`, [
          entryOf(`entry-${index}`, '短', {
            threadId: `thread-${index}`,
            createdAt: '2026-08-16T02:00:00.000Z',
          }),
        ]),
      ),
    })
    expect(oversized).toMatchObject({ ok: false, reason: 'export-limit-exceeded' })
  })

  it('builds the kitchen-sink golden review markdown', async () => {
    const document = await compileKitchenSink()
    const repo = createMemoryDiscussionRepository({
      seed: toMemoryDiscussionSeed(kitchenSinkAnnotations),
    })
    const listed = await repo.listAnnotationThreads('p0-kitchen-sink')
    const prepared = await prepareReviewAppendix({
      articleSlug: document.articleSlug,
      documentFingerprint: document.documentFingerprint,
      snapshotAt: SNAPSHOT,
      threads: sortAnnotationViews(listed, buildSelectionIndex(document)),
    })
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(prepared.model.threads.map((thread) => thread.anchorState)).toEqual([
      'attached',
      'attached',
      'orphaned',
    ])
    const rendered = renderReviewAppendix(prepared.model)
    const body = document.originalSource.endsWith('\n')
      ? `${document.originalSource}\n${rendered}`
      : `${document.originalSource}\n\n${rendered}`
    expect(body.slice(0, document.originalSource.length)).toBe(document.originalSource)
    if (process.env.WRITE_EXPORT_GOLDEN === '1') {
      mkdirSync(path.dirname(GOLDEN), { recursive: true })
      writeFileSync(GOLDEN, body)
    }
    expect(readFileSync(GOLDEN, 'utf8').replace(/\r\n/g, '\n')).toBe(
      body.replace(/\r\n/g, '\n'),
    )
  })
})
