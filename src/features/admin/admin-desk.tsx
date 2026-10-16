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
  const [focusedKey, setFocusedKey] = useState<string | undefined>()
  const searchInputRef = useRef<HTMLInputElement>(null)

  function switchView(next: DeskViewMode) {
    setView(next)
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const categories = useMemo(() => buildAdminCategories(catalog), [catalog])
  const allRows = useMemo(
    () => filterAdminRows(catalog, 'all', 'all', ''),
    [catalog],
  )
  const allHiddenRows = useMemo(
    () => allRows.filter((row) => row.hidden),
    [allRows],
  )
  const rows = useMemo(
    () => filterAdminRows(catalog, categoryId, status, query),
    [catalog, categoryId, query, status],
  )
  const books = useMemo(() => buildAdminBooks(catalog, rows), [catalog, rows])
  const calendarMonths = useMemo(
    () => buildAdminCalendarMonths(catalog, rows),
    [catalog, rows],
  )

  // 全局快捷键：按 / 聚焦搜索框，按 Esc 清空当前选择或搜索
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const inInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (event.key === '/' && !inInput) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (event.key === 'Escape') {
        if (inInput) {
          target?.blur()
          return
        }
        if (selected.size > 0) {
          setSelected(new Set())
        } else if (query) {
          setQuery('')
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [query, selected.size])

  const selectedRows = rows.filter((row) => selected.has(row.key))
  const allSelected = rows.length > 0 && selectedRows.length === rows.length

  const totalCount = catalog.posts.length + catalog.briefs.length
  const hiddenPostsCount = catalog.posts.filter((post) => post.hidden).length
  const hiddenBriefsCount = catalog.briefs.filter((brief) => brief.hidden).length
  const totalHiddenCount = hiddenPostsCount + hiddenBriefsCount
  const totalVisibleCount = totalCount - totalHiddenCount

  const focusedRow = useMemo(() => {
    if (focusedKey) {
      const found =
        rows.find((r) => r.key === focusedKey) ??
        allRows.find((r) => r.key === focusedKey)
      if (found) return found
    }
    return rows[0] ?? allRows[0]
  }, [allRows, focusedKey, rows])

  function chooseCategory(id: CategoryId) {
    setCategoryId(id)
    setSelected(new Set())
  }

  function resetFilters() {
    setCategoryId('all')
    setStatus('all')
    setQuery('')
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
  const hasActiveFilter =
    categoryId !== 'all' || status !== 'all' || query.trim().length > 0

  return (
    <div className={styles.deskWorkbench}>
      {/* ====================================================================
         左栏（固定高度，内部目录树独立滚动）：藏书司总目与检索栏
         ==================================================================== */}
      <aside aria-label="藏书司总目与检索栏" className={styles.sidebar}>
        <div className={styles.sidebarPinnedTop}>
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarBrand}>
              <span className={styles.sidebarBrandKicker}>羽升书房 · 藏书司</span>
              <h1 className={styles.title}>可见性</h1>
            </div>
            <button className={styles.logoutBtn} onClick={onLogout} type="button">
              退出
            </button>
          </div>

          {/* 四宫格核心馆藏指标 */}
          <div className={styles.sidebarStatGrid}>
            <div className={styles.statPlaque}>
              <span>在架公开</span>
              <strong>{totalVisibleCount}</strong>
            </div>
            <div
              className={`${styles.statPlaque} ${
                totalHiddenCount > 0 ? styles.statPlaqueSealed : ''
              }`}
            >
              <span>封存内库</span>
              <strong>{totalHiddenCount}</strong>
            </div>
            <div className={styles.statPlaque}>
              <span>长文典籍</span>
              <strong>{catalog.posts.length}</strong>
            </div>
            <div className={styles.statPlaque}>
              <span>折晓早报</span>
              <strong>{catalog.briefs.length}</strong>
            </div>
          </div>

          <div className={styles.writeBadge}>
            <span aria-hidden="true" className={styles.writeDot} />
            <span>
              {catalog.canWrite ? 'GitHub 仓库直写已就绪' : '只读快照检视模式'}
            </span>
          </div>

          <label className={styles.searchLabel}>
            <span className={styles.searchCaption}>
              <span>搜索卷宗</span>
              <kbd className={styles.kbdHint}>/</kbd>
            </span>
            <div className={styles.searchInputWrap}>
              <input
                className={styles.searchInput}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="标题、日期或分类"
                ref={searchInputRef}
                type="search"
                value={query}
              />
              {query ? (
                <button
                  aria-label="清空搜索"
                  className={styles.searchClearBtn}
                  onClick={() => setQuery('')}
                  type="button"
                >
                  ×
                </button>
              ) : null}
            </div>
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
        </div>

        {/* 独立滚动分类导航树 */}
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
            ? '点「隐藏」或「显示」直接写回仓库 content/visibility.json 并触发线上部署。'
            : '未检测到 GITHUB_TOKEN，当前处于只读快照模式。'}
        </p>
      </aside>

      {/* ====================================================================
         中栏（顶栏命令条固定 + 中间 3D 舞台独立滚动 + 底栏状态固定）
         ==================================================================== */}
      <section aria-label="卷藏检校工作区" className={styles.mainArea}>
        {/* 常驻固定的顶部操控与批处理总控台（上下滚动时绝不跑位） */}
        <div className={styles.commandBar}>
          <div className={styles.commandBarTop}>
            <div className={styles.commandBarTitleGroup}>
              <span className={styles.sectionLabel}>
                {isBlogDomain
                  ? '博客典籍检校架'
                  : isBriefDomain
                    ? '早报螺旋台历司'
                    : '藏书司总览沙盘'}
              </span>
              <span className={styles.sectionCount}>
                当前筛选 {rows.length} 项 · 在架{' '}
                {rows.filter((r) => !r.hidden).length} / 封存{' '}
                {rows.filter((r) => r.hidden).length}
              </span>
              {hasActiveFilter ? (
                <button
                  className={styles.resetFilterBtn}
                  onClick={resetFilters}
                  type="button"
                >
                  重置筛选
                </button>
              ) : null}
            </div>

            <div className={styles.headingControls}>
              <span
                aria-label="殿堂切换"
                className={styles.domainPills}
                role="group"
              >
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

              <span
                aria-label="视图切换"
                className={styles.viewToggle}
                role="group"
              >
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
              {selectedRows.length > 0 ? (
                <button
                  className={styles.clearSelectionBtn}
                  onClick={() => setSelected(new Set())}
                  type="button"
                >
                  清空勾选
                </button>
              ) : null}
              {pending ? (
                <span className={styles.pendingNotice} role="status">
                  正在写回 GitHub 仓库…
                </span>
              ) : null}
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
        </div>

        {/* 中间独立滚动舞台区 */}
        <div className={styles.stageScrollArea}>
          {error ? (
            <p
              className={styles.alertBox}
              role="alert"
              style={{ marginBottom: '1rem', marginTop: 0 }}
            >
              {error}
            </p>
          ) : null}

          {rows.length === 0 ? (
            <div className={styles.emptyBox}>
              <p>这个分类里没有匹配的项目。</p>
              {hasActiveFilter ? (
                <button
                  className={styles.batchBtn}
                  onClick={resetFilters}
                  style={{ marginTop: '0.75rem' }}
                  type="button"
                >
                  清除筛选条件
                </button>
              ) : null}
            </div>
          ) : view === 'ledger' ? (
            <div className={styles.ledgerSheet} data-admin-ledger>
              <ul className={styles.ledgerGridList}>
                {rows.map((row) => (
                  <li
                    className={`${styles.ledgerRow} ${
                      row.hidden ? styles.ledgerRowHidden : ''
                    } ${focusedRow?.key === row.key ? styles.ledgerRowFocused : ''}`}
                    key={row.key}
                    onClick={() => setFocusedKey(row.key)}
                  >
                    <input
                      aria-label={`选择 ${row.title}`}
                      checked={selected.has(row.key)}
                      className="size-4"
                      onChange={() => toggleSelected(row.key)}
                      onClick={(e) => e.stopPropagation()}
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
                        <span className={styles.ledgerTitle} title={row.title}>
                          {row.title}
                        </span>
                      </span>
                      <span className={styles.ledgerMeta}>{row.meta}</span>
                    </span>
                    {!row.hidden ? (
                      <Link
                        className={styles.previewLink}
                        href={row.href}
                        onClick={(e) => e.stopPropagation()}
                        prefetch={false}
                        target="_blank"
                      >
                        阅览 ↗
                      </Link>
                    ) : (
                      <span className={styles.previewLink}>已隐入内库</span>
                    )}
                    <span
                      className={styles.choiceGroup}
                      onClick={(e) => e.stopPropagation()}
                    >
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
              focusedKey={focusedRow?.key}
              onFocusRow={(row) => setFocusedKey(row.key)}
              onSetHidden={(targets, hidden) => void setHidden(targets, hidden)}
              onToggleBatchKeys={toggleVisible}
              onToggleSelect={toggleSelected}
              selected={selected}
              writeDisabled={writeDisabled}
            />
          ) : isBriefDomain ? (
            <AdminBriefCalendar
              focusedKey={focusedRow?.key}
              months={calendarMonths}
              onFocusRow={(row) => setFocusedKey(row.key)}
              onSetHidden={(targets, hidden) => void setHidden(targets, hidden)}
              onToggleBatchKeys={toggleVisible}
              onToggleSelect={toggleSelected}
              selected={selected}
              writeDisabled={writeDisabled}
            />
          ) : (
            <AdminOverviewStage
              focusedKey={focusedRow?.key}
              months={categories.months}
              onFocusRow={(row) => setFocusedKey(row.key)}
              onSelectCategory={chooseCategory}
              onSetHidden={(targets, hidden) => void setHidden(targets, hidden)}
              onToggleSelect={toggleSelected}
              rows={rows}
              sections={categories.sections}
              selected={selected}
              writeDisabled={writeDisabled}
            />
          )}
        </div>

        {/* 中栏底部固定状态底栏 */}
        <footer className={styles.stageFooterBar}>
          <span>
            快捷键：按 <kbd>/</kbd> 搜索卷宗 · 按 <kbd>Esc</kbd> 清空选择 · 点击任意书脊或日历格在右栏检视详情
          </span>
          <span>权威源：content/visibility.json</span>
        </footer>
      </section>

      {/* ====================================================================
         右栏（常驻固定，封存专匣独立滚动）：焦点卷宗检视器 + 内库封存专匣
         ==================================================================== */}
      <aside aria-label="焦点卷宗与内库封存栏" className={styles.rightRail}>
        {/* 1. 焦点卷宗检视匣 */}
        <section aria-label="焦点卷宗检视匣" className={styles.inspectorCard}>
          <div className={styles.inspectorHeader}>
            <div>
              <p className={styles.kicker}>ACTIVE DOSSIER</p>
              <h2 className={styles.inspectorHeading}>焦点卷宗检视</h2>
            </div>
            {focusedRow ? (
              <span
                className={`${styles.sealBadge} ${
                  focusedRow.hidden ? styles.sealHidden : styles.sealVisible
                }`}
              >
                {focusedRow.hidden ? '封存内库' : '在架公开'}
              </span>
            ) : null}
          </div>

          {focusedRow ? (
            <div className={styles.inspectorBody}>
              <div className={styles.inspectorVolumePreview}>
                <span
                  aria-hidden="true"
                  className={styles.inspectorSpineSwatch}
                  style={{ background: focusedRow.spineColor }}
                >
                  <span>
                    {focusedRow.kind === 'posts' ? '长文卷' : '折晓报'}
                  </span>
                </span>
                <div className={styles.inspectorInfo}>
                  <span className={styles.inspectorBadge}>
                    {focusedRow.badge}
                  </span>
                  <h3 className={styles.inspectorTitle}>{focusedRow.title}</h3>
                  <p className={styles.inspectorMeta}>{focusedRow.meta}</p>
                </div>
              </div>

              <div className={styles.inspectorActions}>
                <button
                  className={`${styles.inspectorPrimaryBtn} ${
                    focusedRow.hidden
                      ? styles.inspectorBtnUnseal
                      : styles.inspectorBtnSeal
                  }`}
                  disabled={writeDisabled}
                  onClick={() =>
                    void setHidden([focusedRow], !focusedRow.hidden)
                  }
                  type="button"
                >
                  {focusedRow.hidden
                    ? '启封恢复显示（上架）'
                    : '加盖封条隐藏（入库）'}
                </button>

                <div className={styles.inspectorSecondaryRow}>
                  <button
                    className={styles.inspectorSecBtn}
                    onClick={() => toggleSelected(focusedRow.key)}
                    type="button"
                  >
                    {selected.has(focusedRow.key) ? '取消勾选此项' : '加入批量勾选'}
                  </button>
                  {!focusedRow.hidden ? (
                    <Link
                      className={styles.inspectorSecLink}
                      href={focusedRow.href}
                      prefetch={false}
                      target="_blank"
                    >
                      新窗口阅览 ↗
                    </Link>
                  ) : (
                    <span className={styles.inspectorSecMuted}>
                      封存中不生成公开页
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.inspectorEmpty}>点击任意书卷以检视详情。</p>
          )}
        </section>

        {/* 2. 批处理待办盘（当有勾选项时浮现） */}
        {selectedRows.length > 0 ? (
          <section aria-label="批处理待办盘" className={styles.batchTrayCard}>
            <div className={styles.batchTrayHeader}>
              <strong>批处理待办（已选 {selectedRows.length} 项）</strong>
              <button
                className={styles.clearSelectionBtn}
                onClick={() => setSelected(new Set())}
                type="button"
              >
                清空
              </button>
            </div>
            <div className={styles.batchTrayBtns}>
              <button
                className={styles.batchBtn}
                disabled={writeDisabled}
                onClick={() => void setHidden(selectedRows, false)}
                type="button"
              >
                批量设为显示 ({selectedRows.length})
              </button>
              <button
                className={styles.batchBtn}
                disabled={writeDisabled}
                onClick={() => void setHidden(selectedRows, true)}
                type="button"
              >
                批量设为隐藏 ({selectedRows.length})
              </button>
            </div>
          </section>
        ) : null}

        {/* 3. 内库封存专匣（占满右栏剩余高度，内部独立滚动） */}
        <section aria-label="内库封存专匣" className={styles.vaultDrawer}>
          <div className={styles.vaultHeader}>
            <div className={styles.vaultHeaderLead}>
              <span className={styles.vaultSealStamp}>封</span>
              <div>
                <h2 className={styles.vaultTitle}>
                  内库封存专匣 ({allHiddenRows.length})
                </h2>
                <p className={styles.vaultSub}>
                  {allHiddenRows.length > 0
                    ? `共 ${allHiddenRows.length} 项处于封存状态，可随时一键启封`
                    : '内库清朗 · 所有长文与早报均公开展陈'}
                </p>
              </div>
            </div>

            {allHiddenRows.length > 0 ? (
              <button
                className={styles.vaultUnsealAllBtn}
                disabled={writeDisabled}
                onClick={() => void setHidden(allHiddenRows, false)}
                type="button"
              >
                全部启封 ({allHiddenRows.length})
              </button>
            ) : null}
          </div>

          <div className={styles.vaultScrollArea}>
            {allHiddenRows.length > 0 ? (
              <ul className={styles.vaultChips}>
                {allHiddenRows.map((item) => (
                  <li
                    className={styles.vaultChip}
                    key={item.key}
                    onClick={() => setFocusedKey(item.key)}
                  >
                    <div className={styles.vaultChipInfo}>
                      <span className={styles.vaultChipBadge}>{item.badge}</span>
                      <span className={styles.vaultChipTitle} title={item.title}>
                        {item.title}
                      </span>
                    </div>
                    <button
                      className={styles.vaultChipUnsealBtn}
                      disabled={writeDisabled}
                      onClick={(e) => {
                        e.stopPropagation()
                        void setHidden([item], false)
                      }}
                      type="button"
                    >
                      启封显示
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.vaultClearState}>
                <div className={styles.vaultClearStamp}>在架全</div>
                <p>
                  当前全站 <strong>{catalog.posts.length}</strong> 篇博客长文与{' '}
                  <strong>{catalog.briefs.length}</strong> 期折晓早报均处于公开状态。
                </p>
                <p className={styles.vaultClearSub}>
                  在中栏点击任一项目的「隐藏」按钮后，该项目将自动收入此封存专匣。
                </p>
              </div>
            )}
          </div>
        </section>
      </aside>
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
        checked={checked}
        className="size-4"
        onChange={(event) => onChange(event.target.checked)}
        ref={ref}
        type="checkbox"
      />
      选择当前 {count} 项
    </label>
  )
}
