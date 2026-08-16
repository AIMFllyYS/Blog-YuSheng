import type { DiscussionUser } from './auth-port'
import type { DiscussionEntry } from './discussion-entry'

export function canCreateDiscussion(user: DiscussionUser | null): boolean {
  return user !== null
}

export function canEditEntry(
  user: DiscussionUser | null,
  entry: Pick<DiscussionEntry, 'authorId'>,
): boolean {
  return user !== null && user.id === entry.authorId
}

export function canDeleteEntry(
  user: DiscussionUser | null,
  entry: Pick<DiscussionEntry, 'authorId'>,
): boolean {
  if (user === null) return false
  return user.id === entry.authorId || user.isAuthor
}
