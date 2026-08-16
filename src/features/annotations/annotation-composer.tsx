'use client'

import { useEffect, useRef, type FormEvent } from 'react'

import type { DiscussionUser } from '@/features/discussions/domain/auth-port'
import { canCreateDiscussion } from '@/features/discussions/domain/discussion-permissions'
import { truncateQuote, type AnnotateSelectionDetail } from '@/features/annotations/selection'

import styles from './annotation-panel.module.css'

export function AnnotationComposer({
  error,
  onPublish,
  pending,
  user,
  writesOpen,
}: {
  readonly error: string | undefined
  readonly onPublish: (source: string) => Promise<void>
  readonly pending: AnnotateSelectionDetail | undefined
  readonly user: DiscussionUser | null
  readonly writesOpen: boolean
}) {
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const canWrite = writesOpen && canCreateDiscussion(user)
  const lockedCopy = writesOpen
    ? '登录后才能写下注释'
    : '注释功能将随登录开放'

  useEffect(() => {
    if (!pending || !canWrite) return
    const focus = () => composerRef.current?.focus()
    focus()
    const timer = window.setTimeout(focus, 450)
    return () => window.clearTimeout(timer)
  }, [canWrite, pending])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canWrite) return
    const source = composerRef.current?.value ?? ''
    void onPublish(source).then(() => {
      if (composerRef.current) composerRef.current.value = ''
    })
  }

  return (
    <form className={styles.compose} data-annotation-compose onSubmit={submit}>
      {pending ? (
        <div className={styles.quoteChip} data-quote-chip>
          <b>{pending.headingPath.join(' › ')}</b>
          <span>{truncateQuote(pending.exact)}</span>
        </div>
      ) : null}
      <textarea
        aria-disabled={!canWrite}
        className={styles.editor}
        data-annotation-composer
        disabled={!canWrite}
        placeholder="在正文中划词后点「注释」，选区会带到这里。"
        ref={composerRef}
        rows={3}
      />
      <div className={styles.composeFoot}>
        <p className={styles.hint}>
          {canWrite ? '注释锚定在选区上，不写回正本' : lockedCopy}
        </p>
        <button className={styles.publish} disabled={!canWrite} type="submit">
          发布
        </button>
      </div>
      {error ? <p className={styles.error} data-annotation-error>{error}</p> : null}
    </form>
  )
}
