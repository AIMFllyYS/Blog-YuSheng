import { describe, expect, it } from 'vitest'
import { visibleSlots } from '../../src/features/navigation/rope-slots'

function ids(
  profile: 'hub' | 'article',
  compact = false,
): readonly string[] {
  return visibleSlots(profile, compact).map((slot) => slot.id)
}

describe('rope slots', () => {
  it('hangs three plates on the hub desktop rope', () => {
    expect(ids('hub')).toEqual([
      'brand',
      'blog',
      'notes',
      'works',
      'theme',
      'audio',
      'settings',
    ])
  })

  it('hides plates on the compact hub rope', () => {
    expect(ids('hub', true)).toEqual([
      'brand',
      'theme',
      'audio',
      'settings',
    ])
  })

  it('keeps 羽升 and 博客 on the article rope and hides notes/works', () => {
    expect(ids('article')).toEqual([
      'brand',
      'blog',
      'export',
      'share',
      'github',
      'theme',
      'audio',
      'settings',
    ])
    expect(ids('article')).not.toContain('notes')
    expect(ids('article')).not.toContain('works')
  })
})
