import { describe, expect, it } from 'vitest'

import {
  canCreateDiscussion,
  canDeleteEntry,
  canEditEntry,
  type DiscussionUser,
} from '../../src/features/discussions'

const member: DiscussionUser = {
  id: 'dev-member',
  displayName: '普通成员',
  isAuthor: false,
}
const author: DiscussionUser = {
  id: 'dev-author',
  displayName: '羽升',
  isAuthor: true,
}
const own = { authorId: 'dev-member' }
const others = { authorId: 'someone-else' }

describe('discussion permissions', () => {
  it('blocks anonymous writes', () => {
    expect(canCreateDiscussion(null)).toBe(false)
    expect(canEditEntry(null, own)).toBe(false)
    expect(canDeleteEntry(null, own)).toBe(false)
  })

  it('lets members edit and delete only their own entries', () => {
    expect(canCreateDiscussion(member)).toBe(true)
    expect(canEditEntry(member, own)).toBe(true)
    expect(canEditEntry(member, others)).toBe(false)
    expect(canDeleteEntry(member, own)).toBe(true)
    expect(canDeleteEntry(member, others)).toBe(false)
  })

  it('lets the author delete any entry but not edit others', () => {
    expect(canEditEntry(author, others)).toBe(false)
    expect(canDeleteEntry(author, others)).toBe(true)
    expect(canEditEntry(author, { authorId: 'dev-author' })).toBe(true)
  })
})
