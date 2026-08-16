import type { TextAnchor } from '../../annotations/anchors'
import { DISCUSSION_SOURCE_FORMAT, type DiscussionEntry } from '../domain/discussion-entry'
import { DISCUSSION_WRITES_OPEN } from '../domain/discussion-write-gate'
import {
  assertThreadKindAnchor,
  type AnnotationThread,
  type CommentThread,
  type DiscussionThread,
} from '../domain/discussion-thread'
import type {
  DiscussionMutationResult,
  DiscussionRepository,
} from './discussion-repository'
import {
  createMemoryDiscussionRepository,
  type MemoryDiscussionSeed,
} from './memory-discussion-repository'

export const LOCAL_DRAFTS_KEY_PREFIX = 'blog-yusheng:local-drafts:v1:'
export const LOCAL_DRAFTS_STORAGE_VERSION = 1

export type DraftStorage = {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

export function localDraftsKey(articleSlug: string): string {
  return `${LOCAL_DRAFTS_KEY_PREFIX}${articleSlug}`
}

export function createBrowserDraftStorage(): DraftStorage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const { localStorage } = window
    localStorage.getItem(LOCAL_DRAFTS_KEY_PREFIX)
    return {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => {
        localStorage.setItem(key, value)
      },
    }
  } catch {
    return undefined
  }
}

export function parseLocalDraftsPayload(raw: string): MemoryDiscussionSeed | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
  if (!isRecord(parsed) || parsed.version !== LOCAL_DRAFTS_STORAGE_VERSION) {
    return undefined
  }
  const threadItems = Array.isArray(parsed.threads) ? parsed.threads : []
  const entryItems = Array.isArray(parsed.entries) ? parsed.entries : []
  const threads: DiscussionThread[] = []
  for (const item of threadItems) {
    const thread = parseThread(item)
    if (thread) threads.push(thread)
  }
  const threadIds = new Set(threads.map((thread) => thread.id))
  const entries: DiscussionEntry[] = []
  for (const item of entryItems) {
    const entry = parseEntry(item)
    if (entry && threadIds.has(entry.threadId)) entries.push(entry)
  }
  return { threads, entries }
}

export function createLocalStorageDiscussionRepository(options: {
  readonly articleSlug: string
  readonly getWritesOpen?: () => boolean
  readonly seed?: MemoryDiscussionSeed
  readonly storage?: DraftStorage
  readonly now?: () => string
  readonly id?: () => string
}): DiscussionRepository {
  const storage = options.storage ?? createBrowserDraftStorage()
  const stored = storage ? readStoredSeed(storage, options.articleSlug) : undefined
  const inner = createMemoryDiscussionRepository({
    seed: stored ?? options.seed,
    writesOpen: options.getWritesOpen ?? (() => DISCUSSION_WRITES_OPEN),
    now: options.now,
    id: options.id,
  })

  const persist = async (): Promise<DiscussionMutationResult<never> | undefined> => {
    if (!storage) return undefined
    const annotations = await inner.listAnnotationThreads(options.articleSlug)
    const comments = await inner.listCommentThreads(options.articleSlug)
    const payload = {
      version: LOCAL_DRAFTS_STORAGE_VERSION,
      threads: [
        ...annotations.map((view) => view.thread),
        ...comments.map((view) => view.thread),
      ],
      entries: [
        ...annotations.flatMap((view) => view.entries),
        ...comments.flatMap((view) => view.entries),
      ],
    }
    try {
      storage.setItem(localDraftsKey(options.articleSlug), JSON.stringify(payload))
      return undefined
    } catch (error) {
      if (isQuotaError(error)) {
        return {
          ok: false,
          code: 'STORAGE_QUOTA',
          message: '本机草稿空间已满，请先导出或删除一些注释。',
        }
      }
      return undefined
    }
  }

  const afterMutation = async <T>(
    result: DiscussionMutationResult<T>,
  ): Promise<DiscussionMutationResult<T>> => {
    if (!result.ok) return result
    const persistError = await persist()
    if (persistError) return persistError
    return result
  }

  return {
    listAnnotationThreads: (articleSlug) => inner.listAnnotationThreads(articleSlug),
    listCommentThreads: (articleSlug) => inner.listCommentThreads(articleSlug),
    createAnnotationThread: async (input) =>
      afterMutation(await inner.createAnnotationThread(input)),
    createCommentThread: async (input) =>
      afterMutation(await inner.createCommentThread(input)),
    reply: async (input) => afterMutation(await inner.reply(input)),
    editEntry: async (input) => afterMutation(await inner.editEntry(input)),
    deleteEntry: async (input) => afterMutation(await inner.deleteEntry(input)),
    replaceThread: (thread) => {
      inner.replaceThread(thread)
      void persist()
    },
  }
}

function readStoredSeed(
  storage: DraftStorage,
  articleSlug: string,
): MemoryDiscussionSeed | undefined {
  let raw: string | null
  try {
    raw = storage.getItem(localDraftsKey(articleSlug))
  } catch {
    return { threads: [], entries: [] }
  }
  if (raw === null) return undefined
  return parseLocalDraftsPayload(raw) ?? { threads: [], entries: [] }
}

function parseThread(value: unknown): DiscussionThread | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.id !== 'string' || value.id.length === 0) return undefined
  if (typeof value.articleSlug !== 'string' || value.articleSlug.length === 0) {
    return undefined
  }
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') {
    return undefined
  }
  if (value.kind === 'comment') {
    if (value.anchor !== null && value.anchor !== undefined) return undefined
    const thread: CommentThread = {
      id: value.id,
      articleSlug: value.articleSlug,
      kind: 'comment',
      anchor: null,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    }
    try {
      assertThreadKindAnchor(thread)
    } catch {
      return undefined
    }
    return thread
  }
  if (value.kind !== 'annotation') return undefined
  const anchor = parseAnchor(value.anchor)
  if (!anchor) return undefined
  if (
    value.anchorState !== 'attached' &&
    value.anchorState !== 'reattached' &&
    value.anchorState !== 'orphaned'
  ) {
    return undefined
  }
  const thread: AnnotationThread = {
    id: value.id,
    articleSlug: value.articleSlug,
    kind: 'annotation',
    anchor,
    anchorState: value.anchorState,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
  try {
    assertThreadKindAnchor(thread)
  } catch {
    return undefined
  }
  return thread
}

function parseAnchor(value: unknown): TextAnchor | undefined {
  if (!isRecord(value)) return undefined
  if (value.protocolVersion !== 1) return undefined
  if (typeof value.articleSlug !== 'string') return undefined
  if (typeof value.documentFingerprint !== 'string') return undefined
  if (typeof value.startBlockId !== 'string') return undefined
  if (typeof value.endBlockId !== 'string') return undefined
  if (typeof value.startOffset !== 'number' || typeof value.endOffset !== 'number') {
    return undefined
  }
  if (!Number.isInteger(value.startOffset) || !Number.isInteger(value.endOffset)) {
    return undefined
  }
  if (typeof value.exact !== 'string') return undefined
  if (typeof value.prefix !== 'string') return undefined
  if (typeof value.suffix !== 'string') return undefined
  if (!Array.isArray(value.headingPath)) return undefined
  if (!value.headingPath.every((item) => typeof item === 'string')) return undefined
  return {
    protocolVersion: 1,
    articleSlug: value.articleSlug,
    documentFingerprint: value.documentFingerprint,
    startBlockId: value.startBlockId,
    startOffset: value.startOffset,
    endBlockId: value.endBlockId,
    endOffset: value.endOffset,
    exact: value.exact,
    prefix: value.prefix,
    suffix: value.suffix,
    headingPath: value.headingPath,
  }
}

function parseEntry(value: unknown): DiscussionEntry | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.id !== 'string' || value.id.length === 0) return undefined
  if (typeof value.threadId !== 'string' || value.threadId.length === 0) {
    return undefined
  }
  if (value.parentId !== null && typeof value.parentId !== 'string') return undefined
  if (typeof value.source !== 'string') return undefined
  if (value.sourceFormat !== DISCUSSION_SOURCE_FORMAT) return undefined
  if (typeof value.authorId !== 'string') return undefined
  if (typeof value.authorDisplayNameSnapshot !== 'string') return undefined
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') {
    return undefined
  }
  return {
    id: value.id,
    threadId: value.threadId,
    parentId: value.parentId,
    source: value.source,
    sourceFormat: DISCUSSION_SOURCE_FORMAT,
    authorId: value.authorId,
    authorDisplayNameSnapshot: value.authorDisplayNameSnapshot,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if (!('name' in error)) return false
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )
}
