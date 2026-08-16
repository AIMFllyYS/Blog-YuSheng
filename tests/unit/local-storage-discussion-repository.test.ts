import { describe, expect, it } from 'vitest'

import type { TextAnchor } from '../../src/features/annotations/anchors'
import { createFakeAuthPort } from '../../src/features/discussions'
import {
  createLocalStorageDiscussionRepository,
  localDraftsKey,
  parseLocalDraftsPayload,
  type DraftStorage,
} from '../../src/features/discussions/repository/local-storage-discussion-repository'

const slug = 'p0-kitchen-sink'

const anchor: TextAnchor = {
  protocolVersion: 1,
  articleSlug: slug,
  documentFingerprint: '22f4fb117829eed5b793eb88c91cf444274c92c99226e5d13452b69ee68cbaaa',
  startBlockId: 'block-paragraph-b9a4cffa8f0fcabe',
  startOffset: 4,
  endBlockId: 'block-paragraph-b9a4cffa8f0fcabe',
  endOffset: 16,
  exact: '只包含合法内容的黄金文章',
  prefix: '这是一篇',
  suffix: '。它同时验证中文、English、inline code、站内链',
  headingPath: ['p0-中文综合验收文章'],
}

const validThread = {
  id: 'anno-keep',
  articleSlug: slug,
  kind: 'annotation' as const,
  anchorState: 'attached' as const,
  createdAt: '2026-08-17T00:00:00.000Z',
  updatedAt: '2026-08-17T00:00:00.000Z',
  anchor,
}

const validEntry = {
  id: 'entry-keep',
  threadId: 'anno-keep',
  parentId: null,
  source: '留下来的草稿。',
  sourceFormat: 'blog-markdown-v1' as const,
  authorId: 'dev-member',
  authorDisplayNameSnapshot: '普通成员',
  createdAt: '2026-08-17T00:00:00.000Z',
  updatedAt: '2026-08-17T00:00:00.000Z',
}

function createMemoryDraftStorage(initial?: Record<string, string>): {
  readonly store: Map<string, string>
  readonly storage: DraftStorage
  fillQuota: () => void
} {
  const store = new Map<string, string>(Object.entries(initial ?? {}))
  let quota = false
  return {
    store,
    fillQuota: () => {
      quota = true
    },
    storage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        if (quota) {
          const error = new Error('quota')
          error.name = 'QuotaExceededError'
          throw error
        }
        store.set(key, value)
      },
    },
  }
}

describe('local storage discussion repository', () => {
  it('round-trips an annotation through versioned storage', async () => {
    const { storage } = createMemoryDraftStorage()
    const member = createFakeAuthPort('member').getCurrentUser()
    const first = createLocalStorageDiscussionRepository({
      articleSlug: slug,
      storage,
      getWritesOpen: () => true,
    })
    const created = await first.createAnnotationThread({
      articleSlug: slug,
      anchor,
      source: '这段要改成更准确的说法。',
      user: member,
    })
    expect(created.ok).toBe(true)
    expect(storage.getItem(localDraftsKey(slug))).toContain('这段要改成更准确的说法。')

    const second = createLocalStorageDiscussionRepository({
      articleSlug: slug,
      storage,
      getWritesOpen: () => true,
    })
    const listed = await second.listAnnotationThreads(slug)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.entries[0]?.source).toBe('这段要改成更准确的说法。')
  })

  it('drops corrupt JSON, unknown versions, and malformed threads', () => {
    expect(parseLocalDraftsPayload('{not-json')).toBeUndefined()
    expect(
      parseLocalDraftsPayload(
        JSON.stringify({
          version: 2,
          threads: [validThread],
          entries: [validEntry],
        }),
      ),
    ).toBeUndefined()

    const parsed = parseLocalDraftsPayload(
      JSON.stringify({
        version: 1,
        threads: [
          validThread,
          { id: 'bad', kind: 'annotation', anchor: null },
          {
            id: 'comment-with-anchor',
            articleSlug: slug,
            kind: 'comment',
            anchor,
            createdAt: '2026-08-17T00:00:00.000Z',
            updatedAt: '2026-08-17T00:00:00.000Z',
          },
        ],
        entries: [
          validEntry,
          { id: 'orphan', threadId: 'missing', source: '丢' },
        ],
      }),
    )
    expect(parsed).toBeDefined()
    if (!parsed) return
    expect(parsed.threads ?? []).toHaveLength(1)
    expect(parsed.threads?.[0]?.id).toBe('anno-keep')
    expect(parsed.entries ?? []).toHaveLength(1)
    expect(parsed.entries?.[0]?.id).toBe('entry-keep')
  })

  it('uses seed only when the slug key is missing', async () => {
    const empty = createMemoryDraftStorage()
    const seeded = createLocalStorageDiscussionRepository({
      articleSlug: slug,
      storage: empty.storage,
      getWritesOpen: () => true,
      seed: { threads: [validThread], entries: [validEntry] },
    })
    expect(await seeded.listAnnotationThreads(slug)).toHaveLength(1)

    const storedEmpty = createMemoryDraftStorage({
      [localDraftsKey(slug)]: JSON.stringify({
        version: 1,
        threads: [],
        entries: [],
      }),
    })
    const notSeeded = createLocalStorageDiscussionRepository({
      articleSlug: slug,
      storage: storedEmpty.storage,
      getWritesOpen: () => true,
      seed: { threads: [validThread], entries: [validEntry] },
    })
    expect(await notSeeded.listAnnotationThreads(slug)).toHaveLength(0)

    const corrupt = createMemoryDraftStorage({
      [localDraftsKey(slug)]: '{broken',
    })
    const dropped = createLocalStorageDiscussionRepository({
      articleSlug: slug,
      storage: corrupt.storage,
      getWritesOpen: () => true,
      seed: { threads: [validThread], entries: [validEntry] },
    })
    expect(await dropped.listAnnotationThreads(slug)).toHaveLength(0)
  })

  it('reports STORAGE_QUOTA when persist fills the store', async () => {
    const { storage, fillQuota } = createMemoryDraftStorage()
    const member = createFakeAuthPort('member').getCurrentUser()
    const repo = createLocalStorageDiscussionRepository({
      articleSlug: slug,
      storage,
      getWritesOpen: () => true,
    })
    fillQuota()
    const created = await repo.createAnnotationThread({
      articleSlug: slug,
      anchor,
      source: '写不下了。',
      user: member,
    })
    expect(created).toMatchObject({
      ok: false,
      code: 'STORAGE_QUOTA',
    })
  })
})
