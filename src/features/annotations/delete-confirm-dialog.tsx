'use client'

import { useEffect, useRef } from 'react'

import styles from './annotation-panel.module.css'

export function DeleteConfirmDialog({
  blastRadius,
  onCancel,
  onConfirm,
  open,
}: {
  readonly blastRadius: string
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly open: boolean
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, open])

  if (!open) return null
  return (
    <div className={styles.overlay} data-annotation-confirm>
      <div
        aria-labelledby="annotation-delete-title"
        aria-modal="true"
        className={styles.modal}
        role="dialog"
      >
        <h3 id="annotation-delete-title">确认删除</h3>
        <p>{blastRadius}</p>
        <div className={styles.modalActions}>
          <button onClick={onCancel} type="button">
            取消
          </button>
          <button
            className={styles.modalDanger}
            onClick={onConfirm}
            ref={confirmRef}
            type="button"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
