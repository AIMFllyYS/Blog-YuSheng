'use client'

import { useEffect, useState } from 'react'

import { useFallingToast } from '@/components/ui/falling-toast'
import { createTextAnchor } from '@/features/annotations/anchors'
import {
  ANNOTATE_SELECTION_EVENT,
  isAnnotateSelectionDetail,
  type AnnotateSelectionDetail,
} from '@/features/annotations/selection'
import { useDiscussionRuntime } from '@/features/discussions/runtime'

import {
  FOCUS_ANNOTATION_EVENT,
  isFocusAnnotationDetail,
} from './annotation-events'
import { AnnotationComposer } from './annotation-composer'
import { AnnotationList } from './annotation-list'
import { flashElement, scrollThreadIntoView } from './highlights/apply-annotation-marks'
import styles from './annotation-panel.module.css'

export function AnnotationPanel() {
  const { articleSlug, repo, selectionIndex, user, refresh, writesOpen } =
    useDiscussionRuntime()
  const { notify } = useFallingToast()
  const [pending, setPending] = useState<AnnotateSelectionDetail>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const onAnnotate = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isAnnotateSelectionDetail(event.detail)) {
        return
      }
      setPending(event.detail)
      setError(undefined)
    }
    window.addEventListener(ANNOTATE_SELECTION_EVENT, onAnnotate)
    return () => window.removeEventListener(ANNOTATE_SELECTION_EVENT, onAnnotate)
  }, [])

  useEffect(() => {
    const onFocus = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isFocusAnnotationDetail(event.detail)) {
        return
      }
      const locusId = event.detail
      window.setTimeout(() => {
        const card = scrollThreadIntoView(locusId)
        if (card) flashElement(card)
      }, 420)
    }
    window.addEventListener(FOCUS_ANNOTATION_EVENT, onFocus)
    return () => window.removeEventListener(FOCUS_ANNOTATION_EVENT, onFocus)
  }, [])

  const publish = async (source: string) => {
    setError(undefined)
    if (!pending) {
      setError('请先在正文中划词并点「注释」。')
      return
    }
    const trimmed = source.trim()
    if (!trimmed) {
      setError('请写下注释内容。')
      return
    }
    const created = createTextAnchor({
      articleSlug,
      index: selectionIndex,
      blockId: pending.mapping.blockId,
      startOffset: pending.mapping.startOffset,
      endOffset: pending.mapping.endOffset,
    })
    if ('diagnostics' in created) {
      setError(created.diagnostics[0]?.message ?? '无法为选区创建锚点。')
      return
    }
    const result = await repo.createAnnotationThread({
      articleSlug,
      anchor: created.anchor,
      source: trimmed,
      user,
    })
    if (!result.ok) {
      setError(result.message)
      return
    }
    setPending(undefined)
    notify('注释写下')
    await refresh()
  }

  return (
    <div className={styles.panel} data-annotation-panel>
      <AnnotationComposer
        error={error}
        onPublish={publish}
        pending={pending}
        user={user}
        writesOpen={writesOpen}
      />
      <AnnotationList onWriteError={setError} />
    </div>
  )
}
