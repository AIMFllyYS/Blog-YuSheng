import { DEV_AUTHOR_USER_ID } from '../../discussions/domain/auth-port'
import type { DiscussionEntry } from '../../discussions/domain/discussion-entry'
import type { AnnotationThreadView } from '../../discussions/repository'
import { DISCUSSION_LIMITS } from '../../doc-engine/security/render-limits'
import { sanitizeDiscussionRead } from '../../doc-engine/security/sanitize-discussion'
import {
  REVIEW_APPENDIX_SCHEMA_VERSION,
  freezeReviewAppendix,
  type ReviewAppendixModel,
  type ReviewEntryModel,
  type ReviewLocator,
  type ReviewThreadModel,
} from './review-appendix'

export type PrepareReviewAppendixInput = {
  readonly articleSlug: string
  readonly documentFingerprint: string
  readonly snapshotAt: string
  readonly threads: readonly AnnotationThreadView[]
}

export type PrepareReviewAppendixResult =
  | { readonly ok: true; readonly model: ReviewAppendixModel }
  | {
      readonly ok: false
      readonly reason: 'export-limit-exceeded' | 'discussion-unsafe'
      readonly message: string
    }

export async function prepareReviewAppendix(
  input: PrepareReviewAppendixInput,
): Promise<PrepareReviewAppendixResult> {
  const included: AnnotationThreadView[] = []
  let entryCount = 0
  let sourceBytes = 0

  for (const view of input.threads) {
    if (view.thread.articleSlug !== input.articleSlug) continue
    if (view.thread.createdAt > input.snapshotAt) continue
    const entries = view.entries.filter((entry) => entry.createdAt <= input.snapshotAt)
    if (entries.length === 0) continue
    included.push({ thread: view.thread, entries })
    entryCount += entries.length
    for (const entry of entries) {
      sourceBytes += utf8ByteLength(entry.source)
    }
  }

  if (
    entryCount > DISCUSSION_LIMITS.maxExportEntries ||
    sourceBytes > DISCUSSION_LIMITS.maxExportSourceBytes
  ) {
    return {
      ok: false,
      reason: 'export-limit-exceeded',
      message: '注释超过单次导出上限，请改选纯正文或分卷后再试',
    }
  }

  const threads: ReviewThreadModel[] = []
  for (const view of included) {
    const rendered: ReviewEntryModel[] = []
    for (const { entry, depth } of orderEntries(view.entries)) {
      const read = await sanitizeDiscussionRead({
        entryId: entry.id,
        source: entry.source,
      })
      if (!read.safe) {
        return {
          ok: false,
          reason: 'discussion-unsafe',
          message: '有注释未通过安全校验，请改选纯正文后重试',
        }
      }
      rendered.push({
        id: entry.id,
        parentId: entry.parentId,
        depth,
        authorDisplayName: entry.authorDisplayNameSnapshot,
        authorBadge: entry.authorId === DEV_AUTHOR_USER_ID ? '作者' : '访客',
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        source: read.rawSource,
      })
    }
    threads.push({
      id: view.thread.id,
      anchorState: view.thread.anchorState,
      headingPath: view.thread.anchor.headingPath,
      locator: toLocator(view),
      entries: rendered,
    })
  }

  return {
    ok: true,
    model: freezeReviewAppendix({
      schemaVersion: REVIEW_APPENDIX_SCHEMA_VERSION,
      articleSlug: input.articleSlug,
      documentFingerprint: input.documentFingerprint,
      snapshotAt: input.snapshotAt,
      threads,
    }),
  }
}

function toLocator(view: AnnotationThreadView): ReviewLocator {
  const { thread } = view
  const { anchor } = thread
  return {
    kind: 'annotation',
    threadId: thread.id,
    anchorState: thread.anchorState,
    protocolVersion: 1,
    articleSlug: anchor.articleSlug,
    documentFingerprint: anchor.documentFingerprint,
    startBlockId: anchor.startBlockId,
    startOffset: anchor.startOffset,
    endBlockId: anchor.endBlockId,
    endOffset: anchor.endOffset,
    exact: anchor.exact,
    prefix: anchor.prefix,
    suffix: anchor.suffix,
    headingPath: [...anchor.headingPath],
  }
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function orderEntries(
  entries: readonly DiscussionEntry[],
): readonly { readonly entry: DiscussionEntry; readonly depth: number }[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const children = new Map<string | null, DiscussionEntry[]>()
  for (const entry of entries) {
    const parentId = entry.parentId && byId.has(entry.parentId) ? entry.parentId : null
    const list = children.get(parentId) ?? []
    list.push(entry)
    children.set(parentId, list)
  }
  for (const list of children.values()) {
    list.sort((left, right) => {
      const time = left.createdAt.localeCompare(right.createdAt)
      return time !== 0 ? time : left.id.localeCompare(right.id)
    })
  }
  const ordered: { entry: DiscussionEntry; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const entry of children.get(parentId) ?? []) {
      ordered.push({ entry, depth })
      walk(entry.id, depth + 1)
    }
  }
  walk(null, 1)
  return ordered
}
