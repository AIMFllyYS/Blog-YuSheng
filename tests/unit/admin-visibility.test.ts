import { describe, expect, it } from 'vitest'
import {
  buildAdminBooks,
  buildAdminCalendarMonths,
  buildAdminCategories,
  filterAdminRows,
  type AdminCatalog,
} from '../../src/features/admin/admin-catalog-helpers'
import { applyVisibility } from '../../src/features/admin/admin-visibility'

const catalog = {
  posts: [
    { slug: 'alpha', hidden: false },
    { slug: 'beta', hidden: true },
  ],
  briefs: [{ date: '2026-10-13', hidden: false }],
}

const fullCatalog: AdminCatalog = {
  canWrite: true,
  posts: [
    {
      slug: 'alpha',
      title: '第一篇手记',
      section: 'craft',
      sectionTitle: '器物与技艺',
      publishedAt: '2026-10-12',
      hidden: false,
    },
    {
      slug: 'beta',
      title: '第二篇封存稿',
      section: 'craft',
      sectionTitle: '器物与技艺',
      publishedAt: '2026-10-10',
      hidden: true,
    },
  ],
  briefs: [
    {
      date: '2026-10-13',
      title: '折晓早报第一期',
      hidden: false,
    },
  ],
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

describe('admin-catalog-helpers', () => {
  it('builds section and month summaries with visible and hidden counts', () => {
    const categories = buildAdminCategories(fullCatalog)
    expect(categories.sections).toHaveLength(1)
    expect(categories.sections[0]).toMatchObject({
      slug: 'craft',
      title: '器物与技艺',
      count: 2,
      visibleCount: 1,
      hiddenCount: 1,
    })
    expect(categories.months).toHaveLength(1)
    expect(categories.months[0]).toMatchObject({
      month: '2026-10',
      label: '2026年10月',
      count: 1,
      visibleCount: 1,
      hiddenCount: 0,
    })
  })

  it('groups filtered rows into 3D tome books and 3D spiral calendar months', () => {
    const allRows = filterAdminRows(fullCatalog, 'all', 'all', '')
    expect(allRows).toHaveLength(3)

    const books = buildAdminBooks(fullCatalog, allRows)
    expect(books).toHaveLength(1)
    expect(books[0]?.posts).toHaveLength(2)
    expect(books[0]?.visibleCount).toBe(1)
    expect(books[0]?.hiddenCount).toBe(1)

    const calendarMonths = buildAdminCalendarMonths(fullCatalog, allRows)
    expect(calendarMonths).toHaveLength(1)
    expect(calendarMonths[0]?.key).toBe('2026-10')
    expect(calendarMonths[0]?.weeks.length).toBeGreaterThanOrEqual(4)
  })
})

