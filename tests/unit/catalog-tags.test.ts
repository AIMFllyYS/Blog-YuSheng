import { describe, expect, it } from 'vitest'
import {
  BOOKMARK_TAG_LIMIT,
  bookmarkTagOverflow,
  uniqueTags,
} from '../../src/features/blog-index/catalog-helpers'

describe('uniqueTags', () => {
  it('returns an empty list when tags are missing or empty', () => {
    expect(uniqueTags(undefined)).toEqual([])
    expect(uniqueTags([])).toEqual([])
  })

  it('keeps first-seen order and drops duplicates', () => {
    expect(uniqueTags(['UI', 'Prompt', 'UI', 'Agent'])).toEqual([
      'UI',
      'Prompt',
      'Agent',
    ])
  })
})

describe('bookmarkTagOverflow', () => {
  it('shows every tag when the list fits the bookmark', () => {
    expect(bookmarkTagOverflow(['UI', 'UX'])).toEqual({
      extra: 0,
      visible: ['UI', 'UX'],
    })
  })

  it(`keeps ${BOOKMARK_TAG_LIMIT} chips and counts the rest`, () => {
    expect(
      bookmarkTagOverflow(['日常', '生活', '医学', 'AI', '社团', '家庭']),
    ).toEqual({
      extra: 2,
      visible: ['日常', '生活', '医学', 'AI'],
    })
  })
})
