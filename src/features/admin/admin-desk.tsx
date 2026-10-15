'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AdminBriefCalendar } from '@/features/admin/admin-brief-calendar'
import {
  BRIEF_SPINE_COLOR,
  buildAdminBooks,
  buildAdminCalendarMonths,
  buildAdminCategories,
  filterAdminRows,
  type AdminCatalog,
  type AdminRow,
  type Category,
  type CategoryId,
  type DeskViewMode,
  type StatusFilter,
} from '@/features/admin/admin-catalog-helpers'
import { AdminOverviewStage } from '@/features/admin/admin-overview-stage'
import { AdminTomeShelf } from '@/features/admin/admin-tome-shelf'
import styles from '@/features/admin/admin.module.css'
import { applyVisibility } from '@/features/admin/admin-visibility'

export type { AdminCatalog } from '@/features/admin/admin-catalog-helpers'

const VIEW_STORAGE_KEY = 'blog-yusheng:admin-desk-view:v1'

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
  const [categoryId, setCategoryId] = useState<CategoryId>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [view, setView] = useState<DeskViewMode>(() => {
    if (typeof window === 'undefined') return 'stage'
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === 'ledger' || stored === 'stage') return stored
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'ledger'
      : 'stage'
  })
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())

  function switchView(next: DeskViewMode) {
    setView(next)
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const categories = useMemo(() => buildAdminCategories(catalog), [catalog])
  const rows = useMemo(
    () => filterAdminRows(catalog, categoryId, status, query),
    [catalog, categoryId, query, status],
  )
  const books = useMemo(() => buildAdminBooks(catalog, rows), [catalog, rows])
  const calendarMonths = useMemo(
    () => buildAdminCalendarMonths(catalog, rows),
    [catalog, rows],
  )

  const selectedRows = rows.filter((row) => selected.has(row.key))
  const allSelected = rows.length > 0 && selectedRows.length === rows.length

  const totalCount = catalog.posts.length + catalog.briefs.length
  const hiddenPostsCount = catalog.posts.filter((post) => post.hidden).length
  const hiddenBriefsCount = catalog.briefs.filter((brief) => brief.hidden).length
  const totalHiddenCount = hiddenPostsCount + hiddenBriefsCount
  const totalVisibleCount = totalCount - totalHiddenCount

  function chooseCategory(id: CategoryId) {
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

  async function setHidden(targets: readonly AdminRow[], hidden: boolean) {
    if (targets.length === 0 || !catalog.canWrite) return
    await onApply(
      applyVisibility(
        catalog,
        targets.map((row) => ({ kind: row.kind, id: row.id, hidden })),
      ),
    )
    setSelected(new Set())
  }

  const writeDisabled = pending || !catalog.canWrite
  const isBlogDomain = categoryId === 'posts' || categoryId.startsWith('post:')
  const isBriefDomain = categoryId === 'briefs' || categoryId.startsWith('brief:')

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>羽升书房 · 藏书司内阁</p>
          <h1 className={styles.title}>可见性</h1>
        </div>
        <div className={styles.headerAside}>
          <p className={styles.intro}>
            统管「博客 3D 典籍书架」与「小日报 3D 报亭台历」的公开陈列。点按「隐藏」即加盖朱砂封条退入内库；点按「显示」即启封复位上架，自动同步至仓库{' '}
            <code>content/visibility.json</code>。
          </p>
          <div className={styles.headerStats}>
            <span className={styles.statPlaque}>
              在架公开 <strong>{totalVisibleCount}</strong>
            </span>
            <span
              className={`${styles.statPlaque} ${
                totalHiddenCount > 0 ? styles.statPlaqueSealed : ''
              }`}
            >
              封存内库 <strong>{totalHiddenCount}</strong>
            </span>
            <span className={styles.statPlaque}>
              长文 <strong>{catalog.posts.length}</strong> 卷
            </span>
            <span className={styles.statPlaque}>
              早报 <strong>{catalog.briefs.length}</strong> 期
            </span>
            <span className={styles.writeBadge}>
              <span aria-hidden="true" className={styles.writeDot} />
              {catalog.canWrite ? 'GitHub 仓库直写已就绪' : '只读快照模式'}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.sectionHeading}>
        <span className={styles.sectionLabel}>
          {isBlogDomain
            ? '博客典籍检校架'
            : isBriefDomain
              ? '早报螺旋台历司'
              : '藏书司总览沙盘'}
        </span>
        <span className={styles.sectionCount}>
          当前筛选 {rows.length} 项 · 在架 {rows.filter((r) => !r.hidden).length} / 封存{' '}
          {rows.filter((r) => r.hidden).length}
        </span>

        {/* 板块快速跃迁签 + 视图切换 */}
        <div className={styles.headingControls}>
          <span aria-label="殿堂切换" className={styles.domainPills} role="group">
            <button
              aria-pressed={!isBlogDomain && !isBriefDomain}
              className={styles.domainPill}
              onClick={() => chooseCategory('all')}
              type="button"
            >
              总览沙盘
            </button>
            <button
              aria-pressed={isBlogDomain}
              className={styles.domainPill}
              onClick={() => chooseCategory('posts')}
              type="button"
            >
              3D 博客典籍
            </button>
            <button
              aria-pressed={isBriefDomain}
              className={styles.domainPill}
              onClick={() => chooseCategory('briefs')}
              type="button"
            >
              3D 早报台历
            </button>
          </span>

          <span aria-label="视图切换" className={styles.viewToggle} role="group">
            <button
              aria-pressed={view === 'stage'}
              className={styles.viewButton}
              onClick={() => switchView('stage')}
              type="button"
            >
              立体案台
            </button>
            <button
              aria-pressed={view === 'ledger'}
              className={styles.viewButton}
              onClick={() => switchView('ledger')}
              type="button"
            >
              名册清单
            </button>
          </span>
        </div>
      </div>

      <div className={styles.deskGrid}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarBrand}>
              <span className={styles.sidebarBrandKicker}>羽升</span>
              <span className={styles.sidebarBrandTitle}>检索卷宗</span>
            </div>
            <button className={styles.logoutBtn} onClick={onLogout} type="button">
              退出
            </button>
          </div>

          <label className={styles.searchLabel}>
            <span className={styles.searchCaption}>搜索</span>
            <input
              className={styles.searchInput}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="标题、日期或分类"
              type="search"
              value={query}
            />
          </label>

          <div className={styles.statusSegment}>
            <StatusButton current={status} onSelect={setStatus} value="all">
              全部
            </StatusButton>
            <StatusButton current={status} onSelect={setStatus} value="visible">
              显示中
            </StatusButton>
            <StatusButton current={status} onSelect={setStatus} value="hidden">
              已隐藏
            </StatusButton>
          </div>

          <nav aria-label="分类" className={styles.categoryNav}>
            <CategoryGroup label="总览">
              <CategoryButton
                active={categoryId === 'all'}
                category={{ id: 'all', label: '全部' }}
                count={totalCount}
                hiddenCount={totalHiddenCount}
                onSelect={chooseCategory}
              />
            </CategoryGroup>

            <CategoryGroup label="博客">
              <CategoryButton
                active={categoryId === 'posts'}
                category={{ id: 'posts', label: '全部博客' }}
                count={catalog.posts.length}
                hiddenCount={hiddenPostsCount}
                onSelect={chooseCategory}
              />
              {categories.sections.map((section) => (
                <CategoryButton
                  active={categoryId === `post:${section.slug}`}
                  category={{ id: `post:${section.slug}`, label: section.title }}
                  color={section.color}
                  count={section.count}
                  hiddenCount={section.hiddenCount}
                  key={section.slug}
                  onSelect={chooseCategory}
                />
              ))}
            </CategoryGroup>

            <CategoryGroup label="早报">
              <CategoryButton
                active={categoryId === 'briefs'}
                category={{ id: 'briefs', label: '全部早报' }}
                color={BRIEF_SPINE_COLOR}
                count={catalog.briefs.length}
                hiddenCount={hiddenBriefsCount}
                onSelect={chooseCategory}
              />
              {categories.months.map((month) => (
                <CategoryButton
                  active={categoryId === `brief:${month.month}`}
                  category={{ id: `brief:${month.month}`, label: month.label }}
                  count={month.count}
                  hiddenCount={month.hiddenCount}
                  key={month.month}
                  onSelect={chooseCategory}
                />
              ))}
            </CategoryGroup>
          </nav>

          <p className={styles.sidebarNote}>
            {catalog.canWrite
              ? '点「隐藏」或「显示」会直接更新 content/visibility.json。线上提交后将自动触发构建并更新公开页面。'
              : '当前未配置 GITHUB_TOKEN，仅处于只读检视状态。配置环境变量后即可在线直接保存。'}
          </p>
        </aside>

        <section aria-label="卷藏检校工作区" className={styles.mainArea}>
          {error ? (
            <p
              className={styles.alertBox}
              role="alert"
              style={{ marginBottom: '1.2rem', marginTop: 0 }}
            >
              {error}
            </p>
          ) : null}

          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <SelectAll
                checked={allSelected}
                count={rows.length}
                indeterminate={!allSelected && selectedRows.length > 0}
                onChange={(checked) =>
                  toggleVisible(
                    rows.map((row) => row.key),
                    checked,
                  )
                }
              />
              <span className={styles.selectedCounter}>
                已选 {selectedRows.length}
              </span>
            </div>

            <div className={styles.toolbarRight}>
              <button
                className={styles.batchBtn}
                disabled={writeDisabled || selectedRows.length === 0}
                onClick={() => void setHidden(selectedRows, false)}
                type="button"
              >
                显示所选
              </button>
              <button
                className={styles.batchBtn}
                disabled={writeDisabled || selectedRows.length === 0}
                onClick={() => void setHidden(selectedRows, true)}
                type="button"
              >
                隐藏所选
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className={styles.emptyBox}>
              <p>这个分类里没有匹配的项目。</p>
            </div>
          ) : view === 'ledger' ? (
            <div className={styles.ledgerSheet} data-admin-ledger>
              <ul className={styles.ledgerList}>
                {rows.map((row) => (
                  <li
                    className={`${styles.ledgerRow} ${
                      row.hidden ? styles.ledgerRowHidden : ''
                    }`}
                    key={row.key}
                  >
                    <input
                      aria-label={`选择 ${row.title}`}
                      checked={selected.has(row.key)}
                      className="size-4"
                      onChange={() => toggleSelected(row.key)}
                      type="checkbox"
                    />
                    <span
                      aria-hidden="true"
                      className={styles.ledgerSpineBar}
                      style={{ background: row.spineColor }}
                    />
                    <span className={styles.ledgerMain}>
                      <span className={styles.ledgerTitleRow}>
                        <span
                          className={`${styles.sealBadge} ${
                            row.hidden ? styles.sealHidden : styles.sealVisible
                          }`}
                        >
                          {row.hidden ? '封存' : '在架'}
                        </span>
                        <span className={styles.ledgerTitle}>{row.title}</span>
                      </span>
                      <span className={styles.ledgerMeta}>{row.meta}</span>
                    </span>
                    {!row.hidden ? (
                      <Link
                        className={styles.previewLink}
                        href={row.href}
                        prefetch={false}
                        target="_blank"
                      >
                        阅览 ↗
                      </Link>
                    ) : (
                      <span className={styles.previewLink}>已隐入内库</span>
                    )}
                    <span className={styles.choiceGroup}>
                      <button
                        aria-pressed={!row.hidden}
                        className={`${styles.choiceBtn} ${
                          !row.hidden ? styles.choiceBtnActiveVisible : ''
                        }`}
                        disabled={writeDisabled}
                        onClick={() => void setHidden([row], false)}
                        type="button"
                      >
                        显示
                      </button>
                      <button
                        aria-pressed={row.hidden}
                        className={`${styles.choiceBtn} ${
                          row.hidden ? styles.choiceBtnActiveHidden : ''
                        }`}
                        disabled={writeDisabled}
                        onClick={() => void setHidden([row], true)}
                        type="button"
                      >
                        隐藏
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : isBlogDomain ? (
            <AdminTomeShelf
              books={books}
              onSetHidden={(targets, hidden) => void setHidden(targets, hidden)}
              onToggleSelect={toggleSelected}
              selected={selected}
              writeDisabled={writeDisabled}
            />
          ) : isBriefDomain ? (
            <AdminBriefCalendar
              months={calendarMonths}
              onSetHidden={(targets, hidden) => void setHidden(targets, hidden)}
              onToggleSelect={toggleSelected}
              selected={selected}
              writeDisabled={writeDisabled}
            />
          ) : (
            <AdminOverviewStage
              months={categories.months}
              onSelectCategory={chooseCategory}
              onSetHidden={(targets, hidden) => void setHidden(targets, hidden)}
              onToggleSelect={toggleSelected}
              rows={rows}
              sections={categories.sections}
              selected={selected}
              writeDisabled={writeDisabled}
            />
          )}
        </section>
      </div>
    </>
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
      className={`${styles.statusBtn} ${active ? styles.statusBtnActive : ''}`}
      onClick={() => onSelect(value)}
      type="button"
    >
      {children}
    </button>
  )
}

function CategoryGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <p className={styles.categoryGroupLabel}>{label}</p>
      <div className={styles.categoryList}>{children}</div>
    </div>
  )
}

function CategoryButton({
  category,
  count,
  hiddenCount = 0,
  color,
  active,
  onSelect,
}: {
  category: Category
  count: number
  hiddenCount?: number
  color?: string
  active: boolean
  onSelect: (id: CategoryId) => void
}) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={`${styles.categoryBtn} ${
        active ? styles.categoryBtnActive : ''
      }`}
      onClick={() => onSelect(category.id)}
      type="button"
    >
      <span className={styles.categoryBtnLead}>
        {color ? (
          <span
            aria-hidden="true"
            className={styles.categorySwatch}
            style={{ background: color }}
          />
        ) : null}
        <span className="truncate">{category.label}</span>
      </span>
      <span className={styles.categoryBtnMeta}>
        {hiddenCount > 0 ? (
          <span
            className={styles.categoryHiddenPill}
            title={`已隐藏 ${hiddenCount} 项`}
          >
            隐{hiddenCount}
          </span>
        ) : null}
        <span>{count}</span>
      </span>
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
    <label className={styles.selectAllLabel}>
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
