import { describe, expect, it } from 'vitest'
import { applyVisibility } from '../../src/features/admin/admin-visibility'

const catalog = {
  posts: [
    { slug: 'alpha', hidden: false },
    { slug: 'beta', hidden: true },
  ],
  briefs: [{ date: '2026-10-13', hidden: false }],
}

describe('applyVisibility', () => {
  it('hides and shows the selected posts without dropping the other hidden ids', () => {
    expect(
      applyVisibility(catalog, [
        { kind: 'posts', id: 'alpha', hidden: true },
        { kind: 'briefs', id: '2026-10-13', hidden: true },
      ]),
    ).toEqual({
      posts: ['alpha', 'beta'],
      briefs: ['2026-10-13'],
    })

    expect(
      applyVisibility(catalog, [{ kind: 'posts', id: 'beta', hidden: false }]),
    ).toEqual({ posts: [], briefs: [] })
  })

  it('ignores an id that is not in the catalog', () => {
    expect(
      applyVisibility(catalog, [{ kind: 'posts', id: 'missing', hidden: true }]),
    ).toEqual({ posts: ['beta'], briefs: [] })
  })
})
