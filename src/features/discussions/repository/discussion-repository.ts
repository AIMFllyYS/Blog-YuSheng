import type { TextAnchor } from '../../annotations/anchors'
import type { DiscussionUser } from '../domain/auth-port'
import type { DiscussionEntry } from '../domain/discussion-entry'
import type { AnnotationThread, CommentThread, DiscussionThread } from '../domain/discussion-thread'

export type DiscussionErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'WRITES_CLOSED'
  | 'INVALID_THREAD'
  | 'INVALID_PARENT'
  | 'MAX_DEPTH'
  | 'INVALID_SOURCE'
  | 'NOT_FOUND'
  | 'STORAGE_QUOTA'

export type DiscussionMutationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: DiscussionErrorCode; readonly message: string }

export type AnnotationThreadView = {
  readonly thread: AnnotationThread
  readonly entries: readonly DiscussionEntry[]
}

export type CommentThreadView = {
  readonly thread: CommentThread
  readonly entries: readonly DiscussionEntry[]
}

export type CreateAnnotationInput = {
  readonly articleSlug: string
  readonly anchor: TextAnchor
  readonly source: string
  readonly user: DiscussionUser | null
}

export type CreateCommentInput = {
  readonly articleSlug: string
  readonly source: string
  readonly user: DiscussionUser | null
}

export type ReplyInput = {
  readonly threadId: string
  readonly parentId: string
  readonly source: string
  readonly user: DiscussionUser | null
}

export type EditEntryInput = {
  readonly entryId: string
  readonly source: string
  readonly user: DiscussionUser | null
}

export type DeleteEntryInput = {
  readonly entryId: string
  readonly user: DiscussionUser | null
}

export type DiscussionRepository = {
  readonly listAnnotationThreads: (
    articleSlug: string,
  ) => Promise<readonly AnnotationThreadView[]>
  readonly listCommentThreads: (
    articleSlug: string,
  ) => Promise<readonly CommentThreadView[]>
  readonly createAnnotationThread: (
    input: CreateAnnotationInput,
  ) => Promise<DiscussionMutationResult<AnnotationThreadView>>
  readonly createCommentThread: (
    input: CreateCommentInput,
  ) => Promise<DiscussionMutationResult<CommentThreadView>>
  readonly reply: (
    input: ReplyInput,
  ) => Promise<DiscussionMutationResult<DiscussionEntry>>
  readonly editEntry: (
    input: EditEntryInput,
  ) => Promise<DiscussionMutationResult<DiscussionEntry>>
  readonly deleteEntry: (
    input: DeleteEntryInput,
  ) => Promise<DiscussionMutationResult<{ readonly deletedIds: readonly string[] }>>
  readonly replaceThread: (thread: DiscussionThread) => void
}
