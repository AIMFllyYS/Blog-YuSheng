export const DISCUSSION_SOURCE_FORMAT = 'blog-markdown-v1' as const

export type DiscussionEntry = {
  readonly id: string
  readonly threadId: string
  readonly parentId: string | null
  readonly source: string
  readonly sourceFormat: typeof DISCUSSION_SOURCE_FORMAT
  readonly authorId: string
  readonly authorDisplayNameSnapshot: string
  readonly createdAt: string
  readonly updatedAt: string
}
