import { describe, expect, it } from 'vitest'
import {
  ROPE_SLOTS,
  WORKS_EXTERNAL_HREF,
  visibleSlots,
} from '../../src/features/navigation/rope-slots'

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
      'daily',
      'works',
      'theme',
      'audio',
      'settings',
    ])
  })

  it('points 日报 at /daily/ and hangs 作品集 as an external plate', () => {
    const daily = ROPE_SLOTS.find((slot) => slot.id === 'daily')
    const works = ROPE_SLOTS.find((slot) => slot.id === 'works')
    expect(daily).toMatchObject({ href: '/daily/', label: '日报' })
    expect(daily?.external).toBeUndefined()
    expect(works).toMatchObject({ href: WORKS_EXTERNAL_HREF, external: true })
  })

  it('hides plates on the compact hub rope', () => {
    expect(ids('hub', true)).toEqual([
      'brand',
      'theme',
      'audio',
      'settings',
    ])
  })

  it('keeps 羽升 and 博客 on the article rope and hides daily/works', () => {
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
    expect(ids('article')).not.toContain('daily')
    expect(ids('article')).not.toContain('works')
  })
})
