'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { applyVisibility, type VisibilityKind } from '@/features/admin/admin-visibility'

type AdminPost = {
  slug: string
  title: string
  publishedAt: string
  section?: string
  sectionTitle?: string
  hidden: boolean
}

type AdminBrief = {
  date: string
  title: string
  hidden: boolean
}

type AdminSection = {
  slug: string
  title: string
  order: number
}

export type AdminCatalog = {
  canWrite: boolean
  posts: AdminPost[]
  briefs: AdminBrief[]
  sections?: AdminSection[]
}

type Category = {
  id: 'all' | 'posts' | 'briefs' | `post:${string}` | `brief:${string}`
  label: string
}

type StatusFilter = 'all' | 'visible' | 'hidden'

type Row = {
  key: string
  kind: VisibilityKind
  id: string
  title: string
  meta: string
  hidden: boolean
}

export function AdminDesk({
  catalog,
  error,
  pending,
  onApply,
  onLogout,
}: {
  catalog: AdminCatalog
  error: string | undefined
  pending: boolean
  onApply: (next: { posts: string[]; briefs: string[] }) => Promise<void>
  onLogout: () => void
}) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<Category['id']>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const categories = useMemo(() => buildCategories(catalog), [catalog])
  const rows = useMemo(
    () => filterRows(catalog, categoryId, status, query),
    [catalog, categoryId, query, status],
  )
  const selectedRows = rows.filter((row) => selected.has(row.key))
  const allSelected = rows.length > 0 && selectedRows.length === rows.length

  function chooseCategory(id: Category['id']) {
    setCategoryId(id)
    setSelected(new Set())
  }

  function toggleSelected(key: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleVisible(keys: readonly string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      for (const key of keys) {
        if (checked) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  async function setHidden(targets: readonly Row[], hidden: boolean) {
    if (targets.length === 0) return
    await onApply(
      applyVisibility(
        catalog,
        targets.map((row) => ({ kind: row.kind, id: row.id, hidden })),
      ),
    )
    setSelected(new Set())
  }

  return (
    <div className="flex min-h-screen flex-col text-[var(--ink)] md:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-6 md:sticky md:top-0 md:h-screen md:w-72 md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">羽升</p>
            <h1 className="text-2xl">可见性</h1>
          </div>
          <button className="text-sm text-[var(--ink-muted)] underline-offset-4 hover:underline" onClick={onLogout} type="button">
            退出
          </button>
        </div>
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--ink-muted)]">搜索</span>
          <input
            className="border border-[var(--line)] bg-[var(--scroll-paper)] px-3 py-2"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="标题、日期或分类"
            type="search"
            value={query}
          />
        </label>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <StatusButton current={status} onSelect={setStatus} value="all">全部</StatusButton>
          <StatusButton current={status} onSelect={setStatus} value="visible">显示中</StatusButton>
          <StatusButton current={status} onSelect={setStatus} value="hidden">已隐藏</StatusButton>
        </div>
        <nav aria-label="分类" className="grid gap-5">
          <CategoryGroup label="总览">
            <CategoryButton active={categoryId === 'all'} count={catalog.posts.length + catalog.briefs.length} onSelect={chooseCategory} category={{ id: 'all', label: '全部' }} />
          </CategoryGroup>
          <CategoryGroup label="博客">
            <CategoryButton active={categoryId === 'posts'} count={catalog.posts.length} onSelect={chooseCategory} category={{ id: 'posts', label: '全部博客' }} />
            {categories.sections.map((section) => (
              <CategoryButton
                active={categoryId === `post:${section.slug}`}
                category={{ id: `post:${section.slug}`, label: section.title }}
                count={section.count}
                key={section.slug}
                onSelect={chooseCategory}
              />
            ))}
          </CategoryGroup>
          <CategoryGroup label="早报">
            <CategoryButton active={categoryId === 'briefs'} count={catalog.briefs.length} onSelect={chooseCategory} category={{ id: 'briefs', label: '全部早报' }} />
            {categories.months.map((month) => (
              <CategoryButton
                active={categoryId === `brief:${month.month}`}
                category={{ id: `brief:${month.month}`, label: month.label }}
                count={month.count}
                key={month.month}
                onSelect={chooseCategory}
              />
            ))}
          </CategoryGroup>
        </nav>
        <p className="text-sm text-[var(--ink-muted)]">
          {catalog.canWrite
            ? '点「隐藏」会写入 content/visibility.json。推送后，下一次构建不再导出这些页面。'
            : '线上这次部署只能查看。要改公开结果，请在本地保存后再推送。'}
        </p>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-6 md:px-8">
        {error ? (
          <p className="mb-4 border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SelectAll
            checked={allSelected}
            count={rows.length}
            indeterminate={!allSelected && selectedRows.length > 0}
            onChange={(checked) => toggleVisible(rows.map((row) => row.key), checked)}
          />
          <span className="text-sm text-[var(--ink-muted)]">已选 {selectedRows.length}</span>
          <button className="border border-[var(--line)] px-3 py-1.5 text-sm disabled:opacity-50" disabled={pending || selectedRows.length === 0} onClick={() => void setHidden(selectedRows, false)} type="button">
            显示所选
          </button>
          <button className="border border-[var(--line)] px-3 py-1.5 text-sm disabled:opacity-50" disabled={pending || selectedRows.length === 0} onClick={() => void setHidden(selectedRows, true)} type="button">
            隐藏所选
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">这个分类里没有匹配的项目。</p>
        ) : (
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {rows.map((row) => (
              <li className="flex items-center gap-4 py-3" key={row.key}>
                <input
                  aria-label={`选择 ${row.title}`}
                  checked={selected.has(row.key)}
                  className="size-4"
                  onChange={() => toggleSelected(row.key)}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{row.title}</span>
                  <span className="block truncate text-sm text-[var(--ink-muted)]">{row.meta}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <ChoiceButton disabled={pending} onClick={() => void setHidden([row], false)} pressed={!row.hidden}>
                    显示
                  </ChoiceButton>
                  <ChoiceButton disabled={pending} onClick={() => void setHidden([row], true)} pressed={row.hidden}>
                    隐藏
                  </ChoiceButton>
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function StatusButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: StatusFilter
  value: StatusFilter
  onSelect: (value: StatusFilter) => void
  children: string
}) {
  const active = current === value
  return (
    <button
      aria-pressed={active}
      className={active ? 'border border-[var(--ink)] bg-[var(--ink)] px-2 py-1.5 text-[var(--bg)]' : 'border border-[var(--line)] px-2 py-1.5'}
      onClick={() => onSelect(value)}
      type="button"
    >
      {children}
    </button>
  )
}

function CategoryGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-[var(--ink-muted)]">{label}</p>
      <div className="grid gap-1">{children}</div>
    </div>
  )
}

function CategoryButton({
  category,
  count,
  active,
  onSelect,
}: {
  category: Category
  count: number
  active: boolean
  onSelect: (id: Category['id']) => void
}) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={active ? 'flex items-center justify-between gap-3 bg-[var(--ink)] px-3 py-2 text-left text-[var(--bg)]' : 'flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--scroll-paper)]'}
      onClick={() => onSelect(category.id)}
      type="button"
    >
      <span className="truncate">{category.label}</span>
      <span className="text-sm tabular-nums">{count}</span>
    </button>
  )
}

function ChoiceButton({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      aria-pressed={pressed}
      className={pressed ? 'min-w-14 border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-sm text-[var(--bg)]' : 'min-w-14 border border-[var(--line)] px-3 py-1.5 text-sm'}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function SelectAll({
  checked,
  indeterminate,
  count,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  count: number
  onChange: (checked: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        ref={ref}
        checked={checked}
        className="size-4"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      选择当前 {count} 项
    </label>
  )
}

function buildCategories(catalog: AdminCatalog) {
  const counts = new Map<string, number>()
  for (const post of catalog.posts) {
    const slug = post.section || ''
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  const known = new Set((catalog.sections ?? []).map((section) => section.slug))
  const sections = [...(catalog.sections ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((section) => ({ ...section, count: counts.get(section.slug) ?? 0 }))
  for (const post of catalog.posts) {
    const slug = post.section || ''
    if (known.has(slug)) continue
    known.add(slug)
    sections.push({ slug, title: post.sectionTitle || '未分类', order: 999, count: counts.get(slug) ?? 0 })
  }
  const monthCounts = new Map<string, number>()
  for (const brief of catalog.briefs) {
    const month = brief.date.slice(0, 7)
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
  }
  const months = [...monthCounts.entries()]
    .sort(([left], [right]) => (left < right ? 1 : -1))
    .map(([month, count]) => ({
      month,
      count,
      label: `${month.slice(0, 4)}年${Number(month.slice(5, 7))}月`,
    }))
  return { sections, months }
}

function filterRows(catalog: AdminCatalog, categoryId: Category['id'], status: StatusFilter, query: string) {
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  const posts = catalog.posts
    .filter((post) => matchesCategory(categoryId, 'posts', post.section))
    .map((post) => ({
      key: `posts:${post.slug}`,
      kind: 'posts' as const,
      id: post.slug,
      title: post.title,
      meta: `${post.sectionTitle || '未分类'} · ${post.slug}`,
      hidden: post.hidden,
    }))
  const briefs = catalog.briefs
    .filter((brief) => matchesCategory(categoryId, 'briefs', brief.date.slice(0, 7)))
    .map((brief) => ({
      key: `briefs:${brief.date}`,
      kind: 'briefs' as const,
      id: brief.date,
      title: brief.title,
      meta: brief.date,
      hidden: brief.hidden,
    }))
  return [...posts, ...briefs].filter((row) => {
    if (status === 'visible' && row.hidden) return false
    if (status === 'hidden' && !row.hidden) return false
    if (!needle) return true
    return `${row.title} ${row.meta}`.toLocaleLowerCase('zh-CN').includes(needle)
  })
}

function matchesCategory(categoryId: Category['id'], kind: VisibilityKind, group: string | undefined) {
  if (categoryId === 'all') return true
  if (categoryId === kind) return true
  if (categoryId === `${kind === 'posts' ? 'post' : 'brief'}:${group ?? ''}`) return true
  return false
}
