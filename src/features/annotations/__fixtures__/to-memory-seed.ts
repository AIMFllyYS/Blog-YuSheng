import { DISCUSSION_SOURCE_FORMAT } from '../../discussions/domain/discussion-entry'
import type { MemoryDiscussionSeed } from '../../discussions/repository'

type KitchenSinkAnnotationFixture = {
  readonly threads: readonly {
    readonly id: string
    readonly articleSlug: string
    readonly kind: string
    readonly anchorState: string
    readonly createdAt: string
    readonly updatedAt: string
    readonly anchor: {
      readonly protocolVersion: number
      readonly articleSlug: string
      readonly documentFingerprint: string
      readonly startBlockId: string
      readonly startOffset: number
      readonly endBlockId: string
      readonly endOffset: number
      readonly exact: string
      readonly prefix: string
      readonly suffix: string
      readonly headingPath: readonly string[]
    }
  }[]
  readonly entries: readonly {
    readonly id: string
    readonly threadId: string
    readonly parentId: string | null
    readonly source: string
    readonly sourceFormat: string
    readonly authorId: string
    readonly authorDisplayNameSnapshot: string
    readonly createdAt: string
    readonly updatedAt: string
  }[]
}

function asAnchorState(
  value: string,
): 'attached' | 'reattached' | 'orphaned' {
  if (value === 'reattached' || value === 'orphaned' || value === 'attached') {
    return value
  }
  throw new Error(`未知锚点状态：${value}`)
}

export function toMemoryDiscussionSeed(
  fixture: KitchenSinkAnnotationFixture,
): MemoryDiscussionSeed {
  return {
    threads: fixture.threads.map((thread) => ({
      id: thread.id,
      articleSlug: thread.articleSlug,
      kind: 'annotation' as const,
      anchorState: asAnchorState(thread.anchorState),
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      anchor: {
        protocolVersion: 1 as const,
        articleSlug: thread.anchor.articleSlug,
        documentFingerprint: thread.anchor.documentFingerprint,
        startBlockId: thread.anchor.startBlockId,
        startOffset: thread.anchor.startOffset,
        endBlockId: thread.anchor.endBlockId,
        endOffset: thread.anchor.endOffset,
        exact: thread.anchor.exact,
        prefix: thread.anchor.prefix,
        suffix: thread.anchor.suffix,
        headingPath: thread.anchor.headingPath,
      },
    })),
    entries: fixture.entries.map((entry) => ({
      id: entry.id,
      threadId: entry.threadId,
      parentId: entry.parentId,
      source: entry.source,
      sourceFormat: DISCUSSION_SOURCE_FORMAT,
      authorId: entry.authorId,
      authorDisplayNameSnapshot: entry.authorDisplayNameSnapshot,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  }
}
