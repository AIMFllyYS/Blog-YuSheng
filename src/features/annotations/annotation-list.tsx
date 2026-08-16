'use client'

import { useState } from 'react'

import { DEV_AUTHOR_USER_ID } from '@/features/discussions/domain/auth-port'
import {
  canCreateDiscussion,
  canDeleteEntry,
  canEditEntry,
} from '@/features/discussions/domain/discussion-permissions'
import type { DiscussionEntry } from '@/features/discussions/domain/discussion-entry'
import type { AnnotationThreadView } from '@/features/discussions/repository/discussion-repository'
import { DISCUSSION_LIMITS } from '@/features/doc-engine/security/render-limits'
import { useDiscussionRuntime } from '@/features/discussions/runtime'

import { locusIdOf } from './highlights/group-annotation-loci'
import { flashElement, scrollMarkIntoCenter } from './highlights/apply-annotation-marks'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { DiscussionEntryBody } from './discussion-entry-body'
import { formatDiscussionTime } from './format-discussion-time'
import styles from './annotation-panel.module.css'

function childrenOf(
  entries: readonly DiscussionEntry[],
  parentId: string | null,
): DiscussionEntry[] {
  return entries.filter((entry) => entry.parentId === parentId)
}

function stateLabel(state: AnnotationThreadView['thread']['anchorState']): string {
  if (state === 'orphaned') return '失锚'
  if (state === 'reattached') return '已重连'
  return '已锚定'
}

export function AnnotationList({
  onWriteError,
}: {
  readonly onWriteError: (message: string) => void
}) {
  const { repo, threads, user, refresh, writesOpen } = useDiscussionRuntime()
  const [pendingDelete, setPendingDelete] = useState<DiscussionEntry>()

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const result = await repo.deleteEntry({ entryId: pendingDelete.id, user })
    setPendingDelete(undefined)
    if (!result.ok) {
      onWriteError(result.message)
      return
    }
    await refresh()
  }

  return (
    <>
      {threads.map((view) => (
        <AnnotationThreadCard
          key={view.thread.id}
          onDelete={setPendingDelete}
          onWriteError={onWriteError}
          view={view}
        />
      ))}
      <DeleteConfirmDialog
        blastRadius={
          pendingDelete?.parentId === null
            ? '将删除这条注释及其全部回复，此操作不可恢复。'
            : '将删除这条回复及其下级回复，此操作不可恢复。'
        }
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => void confirmDelete()}
        open={pendingDelete !== undefined}
      />
    </>
  )
}

function AnnotationThreadCard({
  onDelete,
  onWriteError,
  view,
}: {
  readonly onDelete: (entry: DiscussionEntry) => void
  readonly onWriteError: (message: string) => void
  readonly view: AnnotationThreadView
}) {
  const locusId = locusIdOf(view.thread)
  const orphaned = view.thread.anchorState === 'orphaned'
  const root = view.entries.find((entry) => entry.parentId === null)
  if (!root) return null

  const jump = () => {
    if (orphaned) return
    const mark = scrollMarkIntoCenter(locusId)
    if (mark) flashElement(mark)
  }

  return (
    <article
      className={styles.thread}
      data-anchor-state={view.thread.anchorState}
      data-anno={locusId}
      data-annotation-thread={view.thread.id}
    >
      <button
        className={styles.anchorQuote}
        data-jump={orphaned ? undefined : locusId}
        disabled={orphaned}
        onClick={jump}
        type="button"
      >
        <span className={styles.path}>
          {orphaned ? '原文位置已变化' : view.thread.anchor.headingPath.join(' › ')}
        </span>
        {view.thread.anchor.exact}
      </button>
      <AnnotationEntry
        depth={1}
        entries={view.entries}
        entry={root}
        onDelete={onDelete}
        onWriteError={onWriteError}
        showState={stateLabel(view.thread.anchorState)}
        stateKind={view.thread.anchorState}
        threadId={view.thread.id}
      />
    </article>
  )
}

function AnnotationEntry({
  depth,
  entries,
  entry,
  onDelete,
  onWriteError,
  showState,
  stateKind,
  threadId,
}: {
  readonly depth: number
  readonly entries: readonly DiscussionEntry[]
  readonly entry: DiscussionEntry
  readonly onDelete: (entry: DiscussionEntry) => void
  readonly onWriteError: (message: string) => void
  readonly showState?: string
  readonly stateKind?: AnnotationThreadView['thread']['anchorState']
  readonly threadId: string
}) {
  const { repo, user, refresh, writesOpen } = useDiscussionRuntime()
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(entry.source)
  const children = childrenOf(entries, entry.id)
  const isAuthorBadge = entry.authorId === DEV_AUTHOR_USER_ID
  const canReply =
    writesOpen &&
    canCreateDiscussion(user) &&
    depth < DISCUSSION_LIMITS.maxReplyDepth
  const canEdit = writesOpen && canEditEntry(user, entry)
  const canDelete = writesOpen && canDeleteEntry(user, entry)
  const pastMax = depth >= DISCUSSION_LIMITS.maxReplyDepth && children.length > 0

  const saveEdit = async () => {
    const result = await repo.editEntry({ entryId: entry.id, source: draft, user })
    if (!result.ok) {
      onWriteError(result.message)
      return
    }
    setEditing(false)
    await refresh()
  }

  const publishReply = async (source: string) => {
    const result = await repo.reply({
      threadId,
      parentId: entry.id,
      source,
      user,
    })
    if (!result.ok) {
      onWriteError(result.message)
      return
    }
    setReplying(false)
    await refresh()
  }

  return (
    <div data-annotation-entry={entry.id}>
      <div className={styles.entryTop}>
        <span className={styles.who}>{entry.authorDisplayNameSnapshot}</span>
        <span
          className={`${styles.badge} ${isAuthorBadge ? styles.badgeAuthor : styles.badgeGuest}`}
        >
          {isAuthorBadge ? '作者' : '访客'}
        </span>
        <span>{formatDiscussionTime(entry.createdAt)}</span>
        {entry.updatedAt !== entry.createdAt ? <span>已编辑</span> : null}
        {showState ? (
          <span
            className={`${styles.state} ${
              stateKind === 'orphaned'
                ? styles.stateOrphaned
                : stateKind === 'reattached'
                  ? styles.stateReattached
                  : ''
            }`}
          >
            {showState}
          </span>
        ) : null}
      </div>
      {editing ? (
        <div className={styles.inlineEditor}>
          <textarea
            className={styles.editor}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            value={draft}
          />
          <div className={styles.acts}>
            <button onClick={() => void saveEdit()} type="button">
              保存
            </button>
            <button onClick={() => setEditing(false)} type="button">
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.entryBody}>
          <DiscussionEntryBody entryId={entry.id} source={entry.source} />
        </div>
      )}
      <div className={styles.acts}>
        {canReply ? (
          <button onClick={() => setReplying((current) => !current)} type="button">
            回复
          </button>
        ) : null}
        {canEdit ? (
          <button
            onClick={() => {
              setDraft(entry.source)
              setEditing(true)
            }}
            type="button"
          >
            编辑
          </button>
        ) : null}
        {canDelete ? (
          <button onClick={() => onDelete(entry)} type="button">
            删除
          </button>
        ) : null}
      </div>
      {replying ? (
        <InlineReplyComposer
          onCancel={() => setReplying(false)}
          onPublish={publishReply}
        />
      ) : null}
      {children.length > 0 && !pastMax ? (
        <div className={styles.replies}>
          {children.map((child) => (
            <div className={styles.thread} key={child.id}>
              <AnnotationEntry
                depth={depth + 1}
                entries={entries}
                entry={child}
                onDelete={onDelete}
                onWriteError={onWriteError}
                threadId={threadId}
              />
            </div>
          ))}
        </div>
      ) : null}
      {pastMax ? (
        expanded ? (
          <div className={styles.replies}>
            {children.map((child) => (
              <div className={styles.thread} key={child.id}>
                <AnnotationEntry
                  depth={depth + 1}
                  entries={entries}
                  entry={child}
                  onDelete={onDelete}
                  onWriteError={onWriteError}
                  threadId={threadId}
                />
              </div>
            ))}
          </div>
        ) : (
          <button className={styles.moreReplies} onClick={() => setExpanded(true)} type="button">
            查看更多回复
          </button>
        )
      ) : null}
    </div>
  )
}

function InlineReplyComposer({
  onCancel,
  onPublish,
}: {
  readonly onCancel: () => void
  readonly onPublish: (source: string) => Promise<void>
}) {
  const [source, setSource] = useState('')
  return (
    <div className={styles.inlineEditor}>
      <textarea
        className={styles.editor}
        onChange={(event) => setSource(event.target.value)}
        placeholder="写下回复"
        rows={2}
        value={source}
      />
      <div className={styles.acts}>
        <button onClick={() => void onPublish(source)} type="button">
          发布
        </button>
        <button onClick={onCancel} type="button">
          取消
        </button>
      </div>
    </div>
  )
}
