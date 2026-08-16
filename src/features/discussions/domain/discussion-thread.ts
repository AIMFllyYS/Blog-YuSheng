import type { TextAnchor } from '../../annotations/anchors'

export type CommentThread = {
  readonly id: string
  readonly articleSlug: string
  readonly kind: 'comment'
  readonly anchor: null
  readonly createdAt: string
  readonly updatedAt: string
}

export type AnnotationThread = {
  readonly id: string
  readonly articleSlug: string
  readonly kind: 'annotation'
  readonly anchor: TextAnchor
  readonly anchorState: 'attached' | 'reattached' | 'orphaned'
  readonly createdAt: string
  readonly updatedAt: string
}

export type DiscussionThread = CommentThread | AnnotationThread

export function isAnnotationThread(
  thread: DiscussionThread,
): thread is AnnotationThread {
  return thread.kind === 'annotation'
}

export function isCommentThread(thread: DiscussionThread): thread is CommentThread {
  return thread.kind === 'comment'
}

export function assertThreadKindAnchor(thread: DiscussionThread): void {
  if (thread.kind === 'comment' && thread.anchor !== null) {
    throw new Error('comment 线程不能携带锚点')
  }
  if (thread.kind === 'annotation' && thread.anchor === null) {
    throw new Error('annotation 线程必须携带 TextAnchor')
  }
}
