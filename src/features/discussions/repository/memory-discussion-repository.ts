import { DISCUSSION_LIMITS } from '../../doc-engine/security/render-limits'
import { validateDiscussionWrite } from '../../doc-engine/security/sanitize-discussion'

import {
  canCreateDiscussion,
  canDeleteEntry,
  canEditEntry,
} from '../domain/discussion-permissions'
import { DISCUSSION_SOURCE_FORMAT, type DiscussionEntry } from '../domain/discussion-entry'
import { DISCUSSION_WRITES_OPEN } from '../domain/discussion-write-gate'
import {
  assertThreadKindAnchor,
  type AnnotationThread,
  type CommentThread,
  type DiscussionThread,
} from '../domain/discussion-thread'
import type {
  AnnotationThreadView,
  CommentThreadView,
  CreateAnnotationInput,
  CreateCommentInput,
  DeleteEntryInput,
  DiscussionErrorCode,
  DiscussionMutationResult,
  DiscussionRepository,
  EditEntryInput,
  ReplyInput,
} from './discussion-repository'

export type MemoryDiscussionSeed = {
  readonly threads?: readonly DiscussionThread[]
  readonly entries?: readonly DiscussionEntry[]
}

export function createMemoryDiscussionRepository(options?: {
  readonly writesOpen?: boolean | (() => boolean)
  readonly seed?: MemoryDiscussionSeed
  readonly now?: () => string
  readonly id?: () => string
}): DiscussionRepository {
  const isWritesOpen = () => {
    if (typeof options?.writesOpen === 'function') return options.writesOpen()
    return options?.writesOpen ?? DISCUSSION_WRITES_OPEN
  }
  const now = options?.now ?? (() => new Date().toISOString())
  const nextId = options?.id ?? (() => crypto.randomUUID())
  const threads = new Map<string, DiscussionThread>()
  const entries = new Map<string, DiscussionEntry>()

  for (const thread of options?.seed?.threads ?? []) {
    assertThreadKindAnchor(thread)
    threads.set(thread.id, thread)
  }
  for (const entry of options?.seed?.entries ?? []) {
    entries.set(entry.id, entry)
  }

  const fail = <T>(
    code: DiscussionErrorCode,
    message: string,
  ): DiscussionMutationResult<T> => ({ ok: false, code, message })

  const gateWrite = (
    user: CreateAnnotationInput['user'],
  ): DiscussionMutationResult<never> | undefined => {
    if (!isWritesOpen()) {
      return fail('WRITES_CLOSED', '注释功能将随登录开放')
    }
    if (!canCreateDiscussion(user)) {
      return fail('UNAUTHENTICATED', '未登录不能写入讨论。')
    }
    return undefined
  }

  const entriesOf = (threadId: string): DiscussionEntry[] =>
    [...entries.values()]
      .filter((entry) => entry.threadId === threadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

  const depthOf = (entryId: string): number => {
    let depth = 1
    let current = entries.get(entryId)
    const seen = new Set<string>()
    while (current?.parentId) {
      if (seen.has(current.id)) return Number.POSITIVE_INFINITY
      seen.add(current.id)
      depth += 1
      current = entries.get(current.parentId)
    }
    return depth
  }

  const subtreeIds = (rootId: string): string[] => {
    const ids = [rootId]
    const queue = [rootId]
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const child of entries.values()) {
        if (child.parentId === current) {
          ids.push(child.id)
          queue.push(child.id)
        }
      }
    }
    return ids
  }

  const acceptSource = async (entryId: string, source: string) => {
    const result = await validateDiscussionWrite({ entryId, source })
    if (!result.accepted) {
      return fail<never>(
        'INVALID_SOURCE',
        result.diagnostics[0]?.message ?? '讨论源码未通过安全校验。',
      )
    }
    return { ok: true as const, value: result.rawSource }
  }

  return {
    async listAnnotationThreads(articleSlug) {
      return [...threads.values()]
        .filter((thread): thread is AnnotationThread => (
          thread.kind === 'annotation' && thread.articleSlug === articleSlug
        ))
        .map((thread) => ({ thread, entries: entriesOf(thread.id) }))
    },

    async listCommentThreads(articleSlug) {
      return [...threads.values()]
        .filter((thread): thread is CommentThread => (
          thread.kind === 'comment' && thread.articleSlug === articleSlug
        ))
        .map((thread) => ({ thread, entries: entriesOf(thread.id) }))
    },

    async createAnnotationThread(input: CreateAnnotationInput) {
      const blocked = gateWrite(input.user)
      if (blocked) return blocked
      if (input.anchor.articleSlug !== input.articleSlug) {
        return fail('INVALID_THREAD', '锚点文章与线程文章不一致。')
      }
      const source = await acceptSource(nextId(), input.source)
      if (!source.ok) return source
      const createdAt = now()
      const thread: AnnotationThread = {
        id: nextId(),
        articleSlug: input.articleSlug,
        kind: 'annotation',
        anchor: input.anchor,
        anchorState: 'attached',
        createdAt,
        updatedAt: createdAt,
      }
      const root: DiscussionEntry = {
        id: nextId(),
        threadId: thread.id,
        parentId: null,
        source: source.value,
        sourceFormat: DISCUSSION_SOURCE_FORMAT,
        authorId: input.user!.id,
        authorDisplayNameSnapshot: input.user!.displayName,
        createdAt,
        updatedAt: createdAt,
      }
      threads.set(thread.id, thread)
      entries.set(root.id, root)
      return { ok: true, value: { thread, entries: [root] } }
    },

    async createCommentThread(input: CreateCommentInput) {
      const blocked = gateWrite(input.user)
      if (blocked) return blocked
      const source = await acceptSource(nextId(), input.source)
      if (!source.ok) return source
      const createdAt = now()
      const thread: CommentThread = {
        id: nextId(),
        articleSlug: input.articleSlug,
        kind: 'comment',
        anchor: null,
        createdAt,
        updatedAt: createdAt,
      }
      const root: DiscussionEntry = {
        id: nextId(),
        threadId: thread.id,
        parentId: null,
        source: source.value,
        sourceFormat: DISCUSSION_SOURCE_FORMAT,
        authorId: input.user!.id,
        authorDisplayNameSnapshot: input.user!.displayName,
        createdAt,
        updatedAt: createdAt,
      }
      threads.set(thread.id, thread)
      entries.set(root.id, root)
      return { ok: true, value: { thread, entries: [root] } }
    },

    async reply(input: ReplyInput) {
      const blocked = gateWrite(input.user)
      if (blocked) return blocked
      const parent = entries.get(input.parentId)
      const thread = threads.get(input.threadId)
      if (!parent || !thread || parent.threadId !== input.threadId) {
        return fail('INVALID_PARENT', '回复必须挂在同一线程的已有条目上。')
      }
      if (depthOf(parent.id) >= DISCUSSION_LIMITS.maxReplyDepth) {
        return fail('MAX_DEPTH', `回复嵌套不能超过 ${DISCUSSION_LIMITS.maxReplyDepth} 层。`)
      }
      const source = await acceptSource(nextId(), input.source)
      if (!source.ok) return source
      const createdAt = now()
      const entry: DiscussionEntry = {
        id: nextId(),
        threadId: thread.id,
        parentId: parent.id,
        source: source.value,
        sourceFormat: DISCUSSION_SOURCE_FORMAT,
        authorId: input.user!.id,
        authorDisplayNameSnapshot: input.user!.displayName,
        createdAt,
        updatedAt: createdAt,
      }
      entries.set(entry.id, entry)
      threads.set(thread.id, { ...thread, updatedAt: createdAt })
      return { ok: true, value: entry }
    },

    async editEntry(input: EditEntryInput) {
      if (!isWritesOpen()) return fail('WRITES_CLOSED', '注释功能将随登录开放')
      const entry = entries.get(input.entryId)
      if (!entry) return fail('NOT_FOUND', '讨论条目不存在。')
      if (!canEditEntry(input.user, entry)) {
        return fail('FORBIDDEN', '只能编辑自己的讨论。')
      }
      const source = await acceptSource(entry.id, input.source)
      if (!source.ok) return source
      const updated: DiscussionEntry = {
        ...entry,
        source: source.value,
        updatedAt: now(),
      }
      entries.set(updated.id, updated)
      const thread = threads.get(entry.threadId)
      if (thread) threads.set(thread.id, { ...thread, updatedAt: updated.updatedAt })
      return { ok: true, value: updated }
    },

    async deleteEntry(input: DeleteEntryInput) {
      if (!isWritesOpen()) return fail('WRITES_CLOSED', '注释功能将随登录开放')
      const entry = entries.get(input.entryId)
      if (!entry) return fail('NOT_FOUND', '讨论条目不存在。')
      if (!canDeleteEntry(input.user, entry)) {
        return fail('FORBIDDEN', '没有删除该讨论的权限。')
      }
      const deletedIds = subtreeIds(entry.id)
      for (const id of deletedIds) entries.delete(id)
      if (entry.parentId === null) threads.delete(entry.threadId)
      else {
        const thread = threads.get(entry.threadId)
        if (thread) threads.set(thread.id, { ...thread, updatedAt: now() })
      }
      return { ok: true, value: { deletedIds } }
    },

    replaceThread(thread) {
      assertThreadKindAnchor(thread)
      threads.set(thread.id, thread)
    },
  }
}
